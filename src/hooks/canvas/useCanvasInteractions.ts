
import { useRef, useCallback, useEffect } from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useToolStore } from '../../stores/toolStore';
import { WhiteboardObject } from '../../types/whiteboard';
import { useCanvasCoordinates } from './useCanvasCoordinates';
import { useObjectDetection } from './useObjectDetection';
import { useEraserLogic } from './useEraserLogic';
import { SimplePathBuilder, getSmoothingConfig } from '../../utils/path/simpleSmoothing';

/**
 * Custom hook for handling canvas mouse and touch interactions
 * Manages drawing state and coordinates tool-specific behaviors
 */
export const useCanvasInteractions = () => {
  const whiteboardStore = useWhiteboardStore();
  const toolStore = useToolStore();
  const { getCanvasCoordinates } = useCanvasCoordinates();
  const { findObjectAt } = useObjectDetection();
  const { handleEraserStart, handleEraserMove, handleEraserEnd } = useEraserLogic();
  
  const isDrawingRef = useRef(false);
  const isDraggingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const pathStartRef = useRef<{ x: number; y: number } | null>(null);
  const redrawCanvasRef = useRef<(() => void) | null>(null);
  
  // Simple path builder for smooth drawing
  const pathBuilderRef = useRef<SimplePathBuilder | null>(null);
  
  // Store the current drawing preview for rendering
  const currentDrawingPreviewRef = useRef<{
    path: string;
    startX: number;
    startY: number;
    strokeColor: string;
    strokeWidth: number;
    opacity: number;
    brushType?: string;
  } | null>(null);

  // Store shape preview for rendering
  const currentShapePreviewRef = useRef<{
    type: string;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    strokeColor: string;
    fillColor: string;
    strokeWidth: number;
    opacity: number;
  } | null>(null);

  /**
   * Sets the redraw canvas function (called by Canvas component)
   */
  const setRedrawCanvas = useCallback((redrawFn: () => void) => {
    redrawCanvasRef.current = redrawFn;
  }, []);

  /**
   * Generates SVG path data for complex shapes
   */
  const generateShapePath = useCallback((shapeType: string, width: number, height: number): string => {
    const centerX = width / 2;
    const centerY = height / 2;
    
    switch (shapeType) {
      case 'triangle':
        return `M ${centerX} 0 L ${width} ${height} L 0 ${height} Z`;
      
      case 'diamond':
        return `M ${centerX} 0 L ${width} ${centerY} L ${centerX} ${height} L 0 ${centerY} Z`;
      
      case 'pentagon':
        const pentagonPoints = [];
        for (let i = 0; i < 5; i++) {
          const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
          // Use separate width and height scaling instead of circular radius
          const x = centerX + (width / 2) * Math.cos(angle);
          const y = centerY + (height / 2) * Math.sin(angle);
          pentagonPoints.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`);
        }
        return pentagonPoints.join(' ') + ' Z';
      
      case 'hexagon':
        const hexagonPoints = [];
        for (let i = 0; i < 6; i++) {
          const angle = (i * 2 * Math.PI) / 6;
          // Use separate width and height scaling instead of circular radius
          const x = centerX + (width / 2) * Math.cos(angle);
          const y = centerY + (height / 2) * Math.sin(angle);
          hexagonPoints.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`);
        }
        return hexagonPoints.join(' ') + ' Z';
      
      case 'star':
        const starPoints = [];
        const outerRadiusX = width / 2;
        const outerRadiusY = height / 2;
        const innerRadiusX = outerRadiusX * 0.4;
        const innerRadiusY = outerRadiusY * 0.4;
        
        for (let i = 0; i < 10; i++) {
          const angle = (i * Math.PI) / 5 - Math.PI / 2;
          // Use separate X and Y scaling for non-circular stars
          const radiusX = i % 2 === 0 ? outerRadiusX : innerRadiusX;
          const radiusY = i % 2 === 0 ? outerRadiusY : innerRadiusY;
          const x = centerX + radiusX * Math.cos(angle);
          const y = centerY + radiusY * Math.sin(angle);
          starPoints.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`);
        }
        return starPoints.join(' ') + ' Z';
      
      default:
        return '';
    }
  }, []);

  /**
   * Creates a shape object based on the tool type
   */
  const createShapeObject = useCallback((
    shapeType: string,
    x: number,
    y: number,
    width: number,
    height: number,
    strokeColor: string,
    fillColor: string,
    strokeWidth: number,
    opacity: number
  ): Omit<WhiteboardObject, 'id' | 'createdAt' | 'updatedAt'> | null => {
    // Use shape-specific border weight instead of brush stroke width
    const shapeBorderWeight = toolStore.toolSettings.shapeBorderWeight || 2;
    
    switch (shapeType) {
      case 'rectangle':
        return {
          type: 'rectangle',
          x,
          y,
          width,
          height,
          stroke: strokeColor,
          fill: 'none', // Always empty fill
          strokeWidth: shapeBorderWeight,
          opacity
        };
      
      case 'circle':
        const radius = Math.min(width, height) / 2;
        return {
          type: 'circle',
          x: x + width / 2 - radius,
          y: y + height / 2 - radius,
          width: radius * 2,
          height: radius * 2,
          stroke: strokeColor,
          fill: 'none', // Always empty fill
          strokeWidth: shapeBorderWeight,
          opacity
        };
      
      case 'triangle':
      case 'hexagon':
      case 'star':
      case 'pentagon':
      case 'diamond':
        // Create these as path objects with custom shape data
        const shapeData = generateShapePath(shapeType, width, height);
        return {
          type: 'path',
          x,
          y,
          stroke: strokeColor,
          fill: 'none', // Always empty fill
          strokeWidth: shapeBorderWeight,
          opacity,
          data: {
            path: shapeData,
            shapeType,
            isShape: true
          }
        };
      
      default:
        console.warn('Unknown shape type:', shapeType);
        return null;
    }
  }, [toolStore.toolSettings.shapeBorderWeight, generateShapePath]);

  /**
   * Ends current drawing session and saves the path if valid
   */
  const endCurrentDrawing = useCallback(() => {
    const activeTool = toolStore.activeTool;
    
    if ((activeTool === 'pencil' || activeTool === 'brush') && 
        isDrawingRef.current && 
        pathBuilderRef.current && 
        pathStartRef.current &&
        pathBuilderRef.current.getPointCount() > 1) {
      
      // Get the final smooth path from the builder
      const finalSmoothPath = pathBuilderRef.current.getCurrentPath();
      
      // Create the drawing object with the smooth path
      const drawingObject: Omit<WhiteboardObject, 'id' | 'createdAt' | 'updatedAt'> = {
        type: 'path',
        x: pathStartRef.current.x,
        y: pathStartRef.current.y,
        stroke: toolStore.toolSettings.strokeColor,
        strokeWidth: toolStore.toolSettings.strokeWidth,
        opacity: toolStore.toolSettings.opacity,
        fill: 'none',
        data: {
          path: finalSmoothPath,
          brushType: activeTool === 'brush' ? toolStore.toolSettings.brushType : 'pencil'
        }
      };

      const objectId = whiteboardStore.addObject(drawingObject);
      console.log('✏️ Auto-saved drawing on mouse leave:', objectId.slice(0, 8));
    }
    
    if (activeTool === 'eraser' && isDrawingRef.current) {
      handleEraserEnd(redrawCanvasRef.current || undefined);
      console.log('🧹 Auto-ended erasing on mouse leave');
    }

    // Handle shape completion
    if (['rectangle', 'circle', 'triangle', 'hexagon', 'star', 'pentagon', 'diamond'].includes(activeTool) && 
        isDrawingRef.current && 
        currentShapePreviewRef.current) {
      
      const preview = currentShapePreviewRef.current;
      const width = Math.abs(preview.endX - preview.startX);
      const height = Math.abs(preview.endY - preview.startY);
      
      if (width > 5 && height > 5) { // Only create shape if it's big enough
        const shapeObject = createShapeObject(
          activeTool,
          Math.min(preview.startX, preview.endX),
          Math.min(preview.startY, preview.endY),
          width,
          height,
          preview.strokeColor,
          preview.fillColor,
          preview.strokeWidth,
          preview.opacity
        );

        if (shapeObject) {
          const objectId = whiteboardStore.addObject(shapeObject);
          console.log('🔷 Auto-saved shape on mouse leave:', objectId.slice(0, 8));
        }
      }
    }
    
    // Reset all drawing state
    isDrawingRef.current = false;
    isDraggingRef.current = false;
    lastPointRef.current = null;
    pathStartRef.current = null;
    pathBuilderRef.current = null;
    dragStartRef.current = null;
    currentDrawingPreviewRef.current = null;
    currentShapePreviewRef.current = null;
    
    // Trigger redraw to clear preview
    if (redrawCanvasRef.current) {
      redrawCanvasRef.current();
    }
  }, [toolStore.activeTool, toolStore.toolSettings, whiteboardStore, handleEraserEnd, createShapeObject]);

  // Add document-level mouseup listener to catch releases outside canvas
  useEffect(() => {
    const handleDocumentMouseUp = () => {
      if (isDrawingRef.current || isDraggingRef.current) {
        console.log('🖱️ Document mouse up - ending current interaction');
        endCurrentDrawing();
      }
    };

    document.addEventListener('mouseup', handleDocumentMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleDocumentMouseUp);
    };
  }, [endCurrentDrawing]);

  /**
   * Handles mouse leaving the canvas area
   */
  const handleMouseLeave = useCallback(() => {
    if (isDrawingRef.current || isDraggingRef.current) {
      console.log('🖱️ Mouse left canvas - ending current interaction');
      endCurrentDrawing();
    }
  }, [endCurrentDrawing]);

  /**
   * Handles the start of a drawing/interaction session
   */
  const handlePointerDown = useCallback((event: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    event.preventDefault();
    const coords = getCanvasCoordinates(event, canvas);
    const activeTool = toolStore.activeTool;

    console.log('🖱️ Pointer down:', { tool: activeTool, coords });

    switch (activeTool) {
      case 'select': {
        const objectId = findObjectAt(coords.x, coords.y);
        if (objectId) {
          whiteboardStore.selectObjects([objectId]);
          isDraggingRef.current = true;
          dragStartRef.current = coords;
          console.log('🎯 Selected object for dragging:', objectId.slice(0, 8));
        } else {
          whiteboardStore.clearSelection();
          console.log('🎯 Cleared selection');
        }
        break;
      }

      case 'pencil':
      case 'brush': {
        isDrawingRef.current = true;
        lastPointRef.current = coords;
        pathStartRef.current = coords;
        
        // Initialize simple path builder with tool-specific settings
        const config = getSmoothingConfig(activeTool);
        pathBuilderRef.current = new SimplePathBuilder(config.minDistance, config.smoothingStrength);
        
        // Add the first point (relative to origin)
        const initialPath = pathBuilderRef.current.addPoint({ x: 0, y: 0 });
        
        // Set up drawing preview
        currentDrawingPreviewRef.current = {
          path: initialPath,
          startX: coords.x,
          startY: coords.y,
          strokeColor: toolStore.toolSettings.strokeColor,
          strokeWidth: toolStore.toolSettings.strokeWidth,
          opacity: toolStore.toolSettings.opacity,
          brushType: activeTool === 'brush' ? toolStore.toolSettings.brushType : 'pencil'
        };
        
        console.log('✏️ Started simple smooth drawing at:', coords);
        break;
      }

      case 'rectangle':
      case 'circle':
      case 'triangle':
      case 'hexagon':
      case 'star':
      case 'pentagon':
      case 'diamond': {
        isDrawingRef.current = true;
        lastPointRef.current = coords;
        pathStartRef.current = coords;
        
        // Set up shape preview with shape-specific border weight
        const shapeBorderWeight = toolStore.toolSettings.shapeBorderWeight || 2;
        currentShapePreviewRef.current = {
          type: activeTool,
          startX: coords.x,
          startY: coords.y,
          endX: coords.x,
          endY: coords.y,
          strokeColor: toolStore.toolSettings.strokeColor,
          fillColor: 'transparent', // Always transparent fill
          strokeWidth: shapeBorderWeight,
          opacity: toolStore.toolSettings.opacity
        };
        
        console.log('🔷 Started shape drawing:', activeTool, coords);
        break;
      }

      case 'eraser': {
        isDrawingRef.current = true;
        lastPointRef.current = coords;
        
        handleEraserStart(coords, findObjectAt, redrawCanvasRef.current || undefined);
        
        console.log('🧹 Started erasing:', { mode: toolStore.toolSettings.eraserMode, coords });
        break;
      }

      default:
        console.log('🔧 Tool not implemented yet:', activeTool);
    }
  }, [toolStore.activeTool, toolStore.toolSettings, whiteboardStore, findObjectAt, getCanvasCoordinates, handleEraserStart]);

  /**
   * Handles pointer movement during interaction
   */
  const handlePointerMove = useCallback((event: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const coords = getCanvasCoordinates(event, canvas);
    const activeTool = toolStore.activeTool;

    switch (activeTool) {
      case 'select': {
        if (isDraggingRef.current && dragStartRef.current && whiteboardStore.selectedObjectIds.length > 0) {
          const deltaX = coords.x - dragStartRef.current.x;
          const deltaY = coords.y - dragStartRef.current.y;
          
          // Update selected objects position
          whiteboardStore.selectedObjectIds.forEach(objectId => {
            const obj = whiteboardStore.objects[objectId];
            if (obj) {
              whiteboardStore.updateObject(objectId, {
                x: obj.x + deltaX,
                y: obj.y + deltaY
              });
            }
          });
          
          dragStartRef.current = coords;
          
          // Trigger canvas redraw for smooth dragging
          if (redrawCanvasRef.current) {
            redrawCanvasRef.current();
          }
        }
        break;
      }

      case 'pencil':
      case 'brush': {
        if (isDrawingRef.current && lastPointRef.current && pathStartRef.current && pathBuilderRef.current) {
          // Calculate relative coordinates from the path start
          const relativeX = coords.x - pathStartRef.current.x;
          const relativeY = coords.y - pathStartRef.current.y;
          
          // Add point to path builder and get smooth path
          const smoothPath = pathBuilderRef.current.addPoint({ x: relativeX, y: relativeY });
          
          lastPointRef.current = coords;
          
          // Update drawing preview with smooth path
          if (currentDrawingPreviewRef.current) {
            currentDrawingPreviewRef.current.path = smoothPath;
          }
          
          // Throttle redraws for performance
          if (redrawCanvasRef.current) {
            requestAnimationFrame(() => {
              if (redrawCanvasRef.current && isDrawingRef.current) {
                redrawCanvasRef.current();
              }
            });
          }
        }
        break;
      }

      case 'rectangle':
      case 'circle':
      case 'triangle':
      case 'hexagon':
      case 'star':
      case 'pentagon':
      case 'diamond': {
        if (isDrawingRef.current && pathStartRef.current && currentShapePreviewRef.current) {
          // Update shape preview end coordinates
          currentShapePreviewRef.current.endX = coords.x;
          currentShapePreviewRef.current.endY = coords.y;
          
          // Throttle redraws for performance
          if (redrawCanvasRef.current) {
            requestAnimationFrame(() => {
              if (redrawCanvasRef.current && isDrawingRef.current) {
                redrawCanvasRef.current();
              }
            });
          }
        }
        break;
      }

      case 'eraser': {
        if (isDrawingRef.current && lastPointRef.current) {
          handleEraserMove(coords, lastPointRef.current, findObjectAt, redrawCanvasRef.current || undefined);
          lastPointRef.current = coords;
        }
        break;
      }
    }
  }, [toolStore.activeTool, toolStore.toolSettings, whiteboardStore, getCanvasCoordinates, handleEraserMove, findObjectAt]);

  /**
   * Handles the end of a drawing/interaction session
   */
  const handlePointerUp = useCallback((event: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const activeTool = toolStore.activeTool;

    console.log('🖱️ Pointer up:', { tool: activeTool, wasDrawing: isDrawingRef.current, wasDragging: isDraggingRef.current });

    switch (activeTool) {
      case 'select': {
        if (isDraggingRef.current) {
          console.log('🔄 Finished dragging objects');
        }
        isDraggingRef.current = false;
        dragStartRef.current = null;
        break;
      }

      case 'pencil':
      case 'brush': {
        if (isDrawingRef.current && pathBuilderRef.current && pathStartRef.current) {
          // Get the final smooth path from the builder
          const finalSmoothPath = pathBuilderRef.current.getCurrentPath();
          
          // Create the drawing object with the smooth path
          const drawingObject: Omit<WhiteboardObject, 'id' | 'createdAt' | 'updatedAt'> = {
            type: 'path',
            x: pathStartRef.current.x,
            y: pathStartRef.current.y,
            stroke: toolStore.toolSettings.strokeColor,
            strokeWidth: toolStore.toolSettings.strokeWidth,
            opacity: toolStore.toolSettings.opacity,
            fill: 'none',
            data: {
              path: finalSmoothPath,
              brushType: activeTool === 'brush' ? toolStore.toolSettings.brushType : 'pencil'
            }
          };

          const objectId = whiteboardStore.addObject(drawingObject);
          console.log('✏️ Created smooth drawing object:', objectId.slice(0, 8), {
            pointCount: pathBuilderRef.current.getPointCount(),
            pathLength: finalSmoothPath.length
          });
          
          // Clear drawing preview and path builder
          currentDrawingPreviewRef.current = null;
          pathBuilderRef.current = null;
          
          // Trigger redraw to show the final object
          if (redrawCanvasRef.current) {
            redrawCanvasRef.current();
          }
        }
        break;
      }

      case 'rectangle':
      case 'circle':
      case 'triangle':
      case 'hexagon':
      case 'star':
      case 'pentagon':
      case 'diamond': {
        if (isDrawingRef.current && pathStartRef.current && currentShapePreviewRef.current) {
          const preview = currentShapePreviewRef.current;
          const width = Math.abs(preview.endX - preview.startX);
          const height = Math.abs(preview.endY - preview.startY);
          
          // Only create shape if it's big enough
          if (width > 5 && height > 5) {
            const shapeObject = createShapeObject(
              activeTool,
              Math.min(preview.startX, preview.endX),
              Math.min(preview.startY, preview.endY),
              width,
              height,
              preview.strokeColor,
              preview.fillColor,
              preview.strokeWidth,
              preview.opacity
            );

            if (shapeObject) {
              const objectId = whiteboardStore.addObject(shapeObject);
              console.log('🔷 Created shape object:', activeTool, objectId.slice(0, 8), { width, height });
            }
          }
          
          // Clear shape preview
          currentShapePreviewRef.current = null;
          
          // Trigger redraw to show the final object
          if (redrawCanvasRef.current) {
            redrawCanvasRef.current();
          }
        }
        break;
      }

      case 'eraser': {
        if (isDrawingRef.current) {
          handleEraserEnd(redrawCanvasRef.current || undefined);
          console.log('🧹 Finished erasing:', { mode: toolStore.toolSettings.eraserMode });
        }
        break;
      }
    }

    // Reset drawing state
    isDrawingRef.current = false;
    lastPointRef.current = null;
    pathStartRef.current = null;
    pathBuilderRef.current = null;
  }, [toolStore.activeTool, toolStore.toolSettings, whiteboardStore, handleEraserEnd, createShapeObject]);

  /**
   * Gets the current drawing preview for rendering
   */
  const getCurrentDrawingPreview = useCallback(() => {
    return currentDrawingPreviewRef.current;
  }, []);

  /**
   * Gets the current shape preview for rendering
   */
  const getCurrentShapePreview = useCallback(() => {
    return currentShapePreviewRef.current;
  }, []);

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleMouseLeave,
    isDrawing: isDrawingRef.current,
    isDragging: isDraggingRef.current,
    getCurrentDrawingPreview,
    getCurrentShapePreview,
    setRedrawCanvas
  };
};
