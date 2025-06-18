
import { useRef, useCallback } from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useToolStore } from '../../stores/toolStore';
import { WhiteboardObject } from '../../types/whiteboard';
import { useCanvasCoordinates } from './useCanvasCoordinates';
import { useObjectDetection } from './useObjectDetection';
import { useEraserLogic } from './useEraserLogic';
import { RealTimeCurveBuilder } from '../../utils/path/curveSmoothing';

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
  
  // Real-time curve builder for smooth drawing
  const curveBuilderRef = useRef<RealTimeCurveBuilder | null>(null);
  
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

  /**
   * Sets the redraw canvas function (called by Canvas component)
   */
  const setRedrawCanvas = useCallback((redrawFn: () => void) => {
    redrawCanvasRef.current = redrawFn;
  }, []);

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
        
        // Initialize real-time curve builder with appropriate smoothing
        const smoothingFactor = activeTool === 'brush' ? 0.5 : 0.3; // More smoothing for brush
        curveBuilderRef.current = new RealTimeCurveBuilder(smoothingFactor);
        
        // Add the first point (relative to origin)
        const initialPath = curveBuilderRef.current.addPoint({ x: 0, y: 0 });
        
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
        
        console.log('✏️ Started smooth drawing at:', coords);
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
        if (isDrawingRef.current && lastPointRef.current && pathStartRef.current && curveBuilderRef.current) {
          // Calculate relative coordinates from the path start
          const relativeX = coords.x - pathStartRef.current.x;
          const relativeY = coords.y - pathStartRef.current.y;
          
          // Add point to curve builder and get smooth path
          const smoothPath = curveBuilderRef.current.addPoint({ x: relativeX, y: relativeY });
          
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
        if (isDrawingRef.current && curveBuilderRef.current && pathStartRef.current) {
          // Get the final smooth path from the curve builder
          const finalSmoothPath = curveBuilderRef.current.getCurrentPath();
          
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
            pointCount: curveBuilderRef.current.getPointCount(),
            pathLength: finalSmoothPath.length
          });
          
          // Clear drawing preview and curve builder
          currentDrawingPreviewRef.current = null;
          curveBuilderRef.current = null;
          
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
    curveBuilderRef.current = null;
  }, [toolStore.activeTool, toolStore.toolSettings, whiteboardStore, handleEraserEnd]);

  /**
   * Gets the current drawing preview for rendering
   */
  const getCurrentDrawingPreview = useCallback(() => {
    return currentDrawingPreviewRef.current;
  }, []);

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    isDrawing: isDrawingRef.current,
    isDragging: isDraggingRef.current,
    getCurrentDrawingPreview,
    setRedrawCanvas
  };
};
