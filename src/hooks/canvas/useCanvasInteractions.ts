import { useRef, useCallback, useEffect } from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useToolStore } from '../../stores/toolStore';
import { useUser } from '../../contexts/UserContext';
import { WhiteboardObject, TextData, ImageData } from '../../types/whiteboard';
import { useCanvasCoordinates } from './useCanvasCoordinates';
import { useObjectDetection } from './useObjectDetection';
import { useEraserLogic } from './useEraserLogic';
import { useActionBatching } from '../useActionBatching';
import { SimplePathBuilder, getSmoothingConfig } from '../../utils/path/simpleSmoothing';

/**
 * Custom hook for handling canvas mouse and touch interactions
 * Manages drawing state and coordinates tool-specific behaviors
 */
export const useCanvasInteractions = () => {
  const whiteboardStore = useWhiteboardStore();
  const toolStore = useToolStore();
  const { userId } = useUser();
  const { getCanvasCoordinates } = useCanvasCoordinates();
  const { findObjectAt } = useObjectDetection();
  
  // Initialize action batching with optimized settings
  const { startBatch, endBatch, checkBatchSize } = useActionBatching({
    batchTimeout: 1000, // 1 second timeout for batch completion
    maxBatchSize: 50 // Max 50 actions per batch
  });
  
  // Use eraser logic without passing arguments since it manages its own batching
  const { handleEraserStart, handleEraserMove, handleEraserEnd } = useEraserLogic();
  
  const isDrawingRef = useRef(false);
  const isDraggingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const pathStartRef = useRef<{ x: number; y: number } | null>(null);
  const redrawCanvasRef = useRef<(() => void) | null>(null);
  const doubleClickProtectionRef = useRef(false);
  const isEditingTextRef = useRef(false);
  
  // Batching state refs
  const currentBatchIdRef = useRef<string | null>(null);
  const draggedObjectIdRef = useRef<string | null>(null);
  const drawingObjectIdRef = useRef<string | null>(null);
  
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
    isEraser?: boolean;
  } | null>(null);

  // Store shape preview for rendering
  const currentShapePreviewRef = useRef<{
    type: string;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    strokeColor: string;
    strokeWidth: number;
    opacity: number;
  } | null>(null);

  /**
   * Ends any active batch and cleans up batching state
   */
  const cleanupBatching = useCallback(() => {
    if (currentBatchIdRef.current) {
      console.log('🎯 Cleaning up batch:', currentBatchIdRef.current.slice(0, 8));
      endBatch();
      currentBatchIdRef.current = null;
    }
    draggedObjectIdRef.current = null;
    drawingObjectIdRef.current = null;
  }, [endBatch]);

  /**
   * Sets the redraw canvas function (called by Canvas component)
   */
  const setRedrawCanvas = useCallback((redrawFn: () => void) => {
    redrawCanvasRef.current = redrawFn;
  }, []);

  /**
   * Sets the double-click protection flag (called by Canvas component)
   */
  const setDoubleClickProtection = useCallback((isProtected: boolean) => {
    doubleClickProtectionRef.current = isProtected;
    console.log('🛡️ Double-click protection set to:', isProtected);
  }, []);

  /**
   * Sets the text editing state (called by Canvas component)
   */
  const setEditingState = useCallback((isEditing: boolean) => {
    isEditingTextRef.current = isEditing;
    console.log('✏️ Text editing state set to:', isEditing);
  }, []);

  /**
   * Creates text objects with proper data structure
   */
  const createTextObject = useCallback((
    x: number,
    y: number,
    width: number,
    height: number,
    strokeColor: string
  ): Omit<WhiteboardObject, 'id' | 'createdAt' | 'updatedAt'> => {
    const textData: TextData = {
      content: 'Double-click to edit', // Keep the placeholder text for created objects
      fontSize: toolStore.toolSettings.fontSize,
      fontFamily: toolStore.toolSettings.fontFamily,
      bold: toolStore.toolSettings.textBold,
      italic: toolStore.toolSettings.textItalic,
      underline: toolStore.toolSettings.textUnderline,
      textAlign: toolStore.toolSettings.textAlign
    };

    return {
      type: 'text',
      x,
      y,
      width: Math.max(width, 100), // Minimum width for readability
      height: Math.max(height, 30), // Minimum height for text
      stroke: strokeColor,
      fill: 'transparent',
      strokeWidth: 1,
      opacity: 1,
      data: textData
    };
  }, [toolStore.toolSettings]);

  /**
   * Creates icon stamp objects
   */
  const createStampObject = useCallback((
    x: number,
    y: number,
    size: number
  ): Omit<WhiteboardObject, 'id' | 'createdAt' | 'updatedAt'> => {
    const selectedSticker = toolStore.toolSettings.selectedSticker || '/icons/emotions/happy.svg';
    const actualSize = size * 10; // Convert slider value to actual pixel size
    
    // Create an image object for icon stamps
    const stampData = {
      src: selectedSticker,
      alt: 'Stamp icon'
    };

    return {
      type: 'image',
      x: x - actualSize / 2, // Center the stamp on the click point
      y: y - actualSize / 2,
      width: actualSize,
      height: actualSize,
      stroke: 'transparent',
      fill: 'transparent',
      strokeWidth: 0,
      opacity: toolStore.toolSettings.opacity,
      data: stampData
    };
  }, [toolStore.toolSettings]);

  /**
   * Creates shape objects - all shapes as their native types
   */
  const createShapeObject = useCallback((
    shapeType: string,
    x: number,
    y: number,
    width: number,
    height: number,
    strokeColor: string,
    strokeWidth: number,
    opacity: number
  ): Omit<WhiteboardObject, 'id' | 'createdAt' | 'updatedAt'> | null => {
    const shapeBorderWeight = toolStore.toolSettings.shapeBorderWeight || 2;
    
    // All shapes are now created as native types
    const baseShape = {
      x,
      y,
      width,
      height,
      stroke: strokeColor,
      fill: 'none',
      strokeWidth: shapeBorderWeight,
      opacity
    };
    
    switch (shapeType) {
      case 'rectangle':
        return { type: 'rectangle', ...baseShape };
      case 'circle':
        return { type: 'circle', ...baseShape };
      case 'triangle':
        return { type: 'triangle', ...baseShape };
      case 'diamond':
        return { type: 'diamond', ...baseShape };
      case 'pentagon':
        return { type: 'pentagon', ...baseShape };
      case 'hexagon':
        return { type: 'hexagon', ...baseShape };
      case 'star':
        return { type: 'star', ...baseShape };
      case 'heart':
        return { type: 'heart', ...baseShape };
      default:
        return null;
    }
  }, [toolStore.toolSettings.shapeBorderWeight]);

  /**
   * Generates SVG path data for complex shapes
   */
  const generateShapePath = useCallback((shapeType: string, x: number, y: number, width: number, height: number): string => {
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    
    switch (shapeType) {
      case 'triangle':
        return `M ${centerX} ${y} L ${x + width} ${y + height} L ${x} ${y + height} Z`;
      
      case 'diamond':
        return `M ${centerX} ${y} L ${x + width} ${centerY} L ${centerX} ${y + height} L ${x} ${centerY} Z`;
      
      case 'pentagon': {
        const pentagonPoints = [];
        for (let i = 0; i < 5; i++) {
          const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
          const px = centerX + (width / 2) * Math.cos(angle);
          const py = centerY + (height / 2) * Math.sin(angle);
          pentagonPoints.push(`${i === 0 ? 'M' : 'L'} ${px} ${py}`);
        }
        return pentagonPoints.join(' ') + ' Z';
      }
      
      case 'hexagon': {
        const hexagonPoints = [];
        for (let i = 0; i < 6; i++) {
          const angle = (i * 2 * Math.PI) / 6;
          const px = centerX + (width / 2) * Math.cos(angle);
          const py = centerY + (height / 2) * Math.sin(angle);
          hexagonPoints.push(`${i === 0 ? 'M' : 'L'} ${px} ${py}`);
        }
        return hexagonPoints.join(' ') + ' Z';
      }
      
      case 'star': {
        const starPoints = [];
        const outerRadiusX = width / 2;
        const outerRadiusY = height / 2;
        const innerRadiusX = outerRadiusX * 0.4;
        const innerRadiusY = outerRadiusY * 0.4;
        
        for (let i = 0; i < 10; i++) {
          const angle = (i * Math.PI) / 5 - Math.PI / 2;
          const radiusX = i % 2 === 0 ? outerRadiusX : innerRadiusX;
          const radiusY = i % 2 === 0 ? outerRadiusY : innerRadiusY;
          const px = centerX + radiusX * Math.cos(angle);
          const py = centerY + radiusY * Math.sin(angle);
          starPoints.push(`${i === 0 ? 'M' : 'L'} ${px} ${py}`);
        }
        return starPoints.join(' ') + ' Z';
      }
      
      case 'heart': {
        const heartWidth = width;
        const heartHeight = height;
        const topCurveHeight = heartHeight * 0.3;
        const centerXHeart = x + width / 2;
        
        return `M ${centerXHeart} ${y + heartHeight * 0.3}
                C ${centerXHeart} ${y + topCurveHeight * 0.5}, ${centerXHeart - heartWidth * 0.2} ${y}, ${centerXHeart - heartWidth * 0.4} ${y}
                C ${centerXHeart - heartWidth * 0.6} ${y}, ${centerXHeart - heartWidth * 0.8} ${y + topCurveHeight * 0.5}, ${centerXHeart - heartWidth * 0.5} ${y + topCurveHeight}
                C ${centerXHeart - heartWidth * 0.5} ${y + topCurveHeight}, ${centerXHeart} ${y + heartHeight * 0.6}, ${centerXHeart} ${y + heartHeight}
                C ${centerXHeart} ${y + heartHeight * 0.6}, ${centerXHeart + heartWidth * 0.5} ${y + topCurveHeight}, ${centerXHeart + heartWidth * 0.5} ${y + topCurveHeight}
                C ${centerXHeart + heartWidth * 0.8} ${y + topCurveHeight * 0.5}, ${centerXHeart + heartWidth * 0.6} ${y}, ${centerXHeart + heartWidth * 0.4} ${y}
                C ${centerXHeart + heartWidth * 0.2} ${y}, ${centerXHeart} ${y + topCurveHeight * 0.5}, ${centerXHeart} ${y + heartHeight * 0.3} Z`;
      }
      
      default:
        return '';
    }
  }, []);

  /**
   * Handles fill tool click - fills the clicked shape with the current stroke color
   */
  const handleFillClick = useCallback((coords: { x: number; y: number }) => {
    console.log('🎨 Fill tool clicked at:', coords);
    
    const objectId = findObjectAt(coords.x, coords.y);
    if (!objectId) {
      console.log('🎨 No object found to fill at:', coords);
      return;
    }
    
    const obj = whiteboardStore.objects[objectId];
    if (!obj) {
      console.log('🎨 Object not found in store:', objectId);
      return;
    }
    
    console.log('🎨 Found object to fill:', { 
      id: objectId.slice(0, 8), 
      type: obj.type, 
      currentFill: obj.fill 
    });
    
    // Use the current stroke color from toolbar as fill color
    const fillColor = toolStore.toolSettings.strokeColor;
    
    // Update the object with the fill color - NOW WITH USER ID
    whiteboardStore.updateObject(objectId, {
      fill: fillColor
    }, userId);
    
    console.log('🎨 Filled object:', { 
      objectId: objectId.slice(0, 8), 
      fillColor,
      previousFill: obj.fill,
      userId: userId.slice(0, 8)
    });
    
    // Trigger redraw
    if (redrawCanvasRef.current) {
      redrawCanvasRef.current();
    }
  }, [findObjectAt, whiteboardStore, toolStore.toolSettings.strokeColor, userId]);

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
      
      const finalSmoothPath = pathBuilderRef.current.getCurrentPath();
      
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

      // NOW WITH USER ID
      const objectId = whiteboardStore.addObject(drawingObject, userId);
      console.log('✏️ Auto-saved drawing on mouse leave:', objectId.slice(0, 8), 'for user:', userId.slice(0, 8));
    }
    
    if (activeTool === 'eraser' && isDrawingRef.current) {
      handleEraserEnd(redrawCanvasRef.current || undefined);
      console.log('🧹 Auto-ended erasing on mouse leave');
    }

    // Handle shape completion
    if (['rectangle', 'circle'].includes(activeTool) && 
        isDrawingRef.current && 
        currentShapePreviewRef.current) {
      
      const preview = currentShapePreviewRef.current;
      const width = Math.abs(preview.endX - preview.startX);
      const height = Math.abs(preview.endY - preview.startY);
      
      if (width > 5 && height > 5) {
        const shapeObject = createShapeObject(
          activeTool,
          Math.min(preview.startX, preview.endX),
          Math.min(preview.startY, preview.endY),
          width,
          height,
          preview.strokeColor,
          preview.strokeWidth,
          preview.opacity
        );

        if (shapeObject) {
          // NOW WITH USER ID
          const objectId = whiteboardStore.addObject(shapeObject, userId);
          console.log('🔷 Auto-saved shape on mouse leave:', objectId.slice(0, 8), 'for user:', userId.slice(0, 8));
        }
      }
    }

    // Handle text completion
    if (activeTool === 'text' && 
        isDrawingRef.current && 
        currentShapePreviewRef.current) {
      
      const preview = currentShapePreviewRef.current;
      const width = Math.abs(preview.endX - preview.startX);
      const height = Math.abs(preview.endY - preview.startY);
      
      if (width > 10 && height > 10) {
        const textObject = createTextObject(
          Math.min(preview.startX, preview.endX),
          Math.min(preview.startY, preview.endY),
          width,
          height,
          preview.strokeColor
        );

        const objectId = whiteboardStore.addObject(textObject, userId);
        console.log('📝 Auto-saved text on mouse leave:', objectId.slice(0, 8), 'for user:', userId.slice(0, 8));
      }
    }
    
    // Clean up batching and reset all drawing state
    cleanupBatching();
    isDrawingRef.current = false;
    isDraggingRef.current = false;
    lastPointRef.current = null;
    pathStartRef.current = null;
    pathBuilderRef.current = null;
    dragStartRef.current = null;
    currentDrawingPreviewRef.current = null;
    currentShapePreviewRef.current = null;
    
    if (redrawCanvasRef.current) {
      redrawCanvasRef.current();
    }
  }, [toolStore.activeTool, toolStore.toolSettings, whiteboardStore, handleEraserEnd, createShapeObject, createTextObject, userId, cleanupBatching]);

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
    
    // Check double-click protection OR text editing state
    if (doubleClickProtectionRef.current || isEditingTextRef.current) {
      console.log('🛡️ Pointer down blocked - protection:', doubleClickProtectionRef.current, 'editing:', isEditingTextRef.current);
      return;
    }
    
    const coords = getCanvasCoordinates(event, canvas);
    const activeTool = toolStore.activeTool;

    console.log('🖱️ Pointer down:', { tool: activeTool, coords, userId: userId.slice(0, 8), protection: doubleClickProtectionRef.current, editing: isEditingTextRef.current });

    // BLOCK TEXT TOOL if currently editing any text
    if (activeTool === 'text' && isEditingTextRef.current) {
      console.log('📝 Text tool blocked - already editing text');
      return;
    }

    switch (activeTool) {
      case 'fill': {
        handleFillClick(coords);
        return;
      }

      case 'stamp': {
        const stampSize = toolStore.toolSettings.strokeWidth || 5;
        const stampObject = createStampObject(coords.x, coords.y, stampSize);
        
        const objectId = whiteboardStore.addObject(stampObject, userId);
        console.log('🖼️ Created stamp object:', objectId.slice(0, 8), {
          size: stampSize * 10,
          sticker: toolStore.toolSettings.selectedSticker,
          coords,
          userId: userId.slice(0, 8)
        });
        
        if (redrawCanvasRef.current) {
          redrawCanvasRef.current();
        }
        return;
      }

      case 'select': {
        const objectId = findObjectAt(coords.x, coords.y);
        if (objectId) {
          // START BATCH for object dragging
          currentBatchIdRef.current = startBatch('UPDATE_OBJECT', objectId, userId);
          draggedObjectIdRef.current = objectId;
          
          whiteboardStore.selectObjects([objectId], userId);
          isDraggingRef.current = true;
          dragStartRef.current = coords;
          console.log('🎯 Selected object for dragging:', objectId.slice(0, 8), 'batch:', currentBatchIdRef.current?.slice(0, 8), 'by user:', userId.slice(0, 8));
        } else {
          whiteboardStore.clearSelection();
          console.log('🎯 Cleared selection');
        }
        break;
      }

      case 'text': {
        // Additional check to prevent text creation while editing
        if (isEditingTextRef.current) {
          console.log('📝 Text creation blocked - currently editing text');
          return;
        }

        isDrawingRef.current = true;
        lastPointRef.current = coords;
        pathStartRef.current = coords;
        
        currentShapePreviewRef.current = {
          type: 'text',
          startX: coords.x,
          startY: coords.y,
          endX: coords.x,
          endY: coords.y,
          strokeColor: toolStore.toolSettings.strokeColor,
          strokeWidth: 1,
          opacity: 1
        };
        
        console.log('📝 Started text box creation:', coords, 'for user:', userId.slice(0, 8));
        break;
      }

      case 'pencil':
      case 'brush': {
        // START BATCH for drawing
        currentBatchIdRef.current = startBatch('ADD_OBJECT', 'drawing', userId);
        
        isDrawingRef.current = true;
        lastPointRef.current = coords;
        pathStartRef.current = coords;
        
        const config = getSmoothingConfig(activeTool);
        pathBuilderRef.current = new SimplePathBuilder(config.minDistance, config.smoothingStrength);
        
        const initialPath = pathBuilderRef.current.addPoint({ x: 0, y: 0 });
        
        currentDrawingPreviewRef.current = {
          path: initialPath,
          startX: coords.x,
          startY: coords.y,
          strokeColor: toolStore.toolSettings.strokeColor,
          strokeWidth: toolStore.toolSettings.strokeWidth,
          opacity: toolStore.toolSettings.opacity,
          brushType: activeTool === 'brush' ? toolStore.toolSettings.brushType : 'pencil'
        };
        
        console.log('✏️ Started drawing with batch:', currentBatchIdRef.current?.slice(0, 8), 'at:', coords, 'for user:', userId.slice(0, 8));
        break;
      }

      case 'rectangle':
      case 'circle':
      case 'triangle':
      case 'diamond':
      case 'pentagon':
      case 'hexagon':
      case 'star':
      case 'heart': {
        isDrawingRef.current = true;
        lastPointRef.current = coords;
        pathStartRef.current = coords;
        
        const shapeBorderWeight = toolStore.toolSettings.shapeBorderWeight || 2;
        currentShapePreviewRef.current = {
          type: activeTool,
          startX: coords.x,
          startY: coords.y,
          endX: coords.x,
          endY: coords.y,
          strokeColor: toolStore.toolSettings.strokeColor,
          strokeWidth: shapeBorderWeight,
          opacity: toolStore.toolSettings.opacity
        };
        
        console.log('🔷 Started shape drawing:', activeTool, coords, 'for user:', userId.slice(0, 8));
        break;
      }

      case 'eraser': {
        isDrawingRef.current = true;
        lastPointRef.current = coords;
        
        handleEraserStart(coords, findObjectAt, redrawCanvasRef.current || undefined);
        
        console.log('🧹 Started erasing:', { mode: toolStore.toolSettings.eraserMode, coords, userId: userId.slice(0, 8) });
        break;
      }

      default:
        console.log('🔧 Tool not implemented yet:', activeTool);
    }
  }, [toolStore.activeTool, toolStore.toolSettings, whiteboardStore, findObjectAt, getCanvasCoordinates, handleEraserStart, handleFillClick, createTextObject, createStampObject, userId, startBatch]);

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
          
          whiteboardStore.selectedObjectIds.forEach(objectId => {
            const obj = whiteboardStore.objects[objectId];
            if (obj) {
              // Update object position - this will be batched
              whiteboardStore.updateObject(objectId, {
                x: obj.x + deltaX,
                y: obj.y + deltaY
              }, userId);
            }
          });
          
          // Check if batch is getting too large
          if (currentBatchIdRef.current) {
            checkBatchSize();
          }
          
          dragStartRef.current = coords;
          
          if (redrawCanvasRef.current) {
            redrawCanvasRef.current();
          }
        }
        break;
      }

      case 'text':
      case 'rectangle':
      case 'circle':
      case 'triangle':
      case 'diamond':
      case 'pentagon':
      case 'hexagon':
      case 'star':
      case 'heart': {
        if (isDrawingRef.current && pathStartRef.current && currentShapePreviewRef.current) {
          currentShapePreviewRef.current.endX = coords.x;
          currentShapePreviewRef.current.endY = coords.y;
          
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

      case 'pencil':
      case 'brush': {
        if (isDrawingRef.current && lastPointRef.current && pathStartRef.current && pathBuilderRef.current) {
          const relativeX = coords.x - pathStartRef.current.x;
          const relativeY = coords.y - pathStartRef.current.y;
          
          const smoothPath = pathBuilderRef.current.addPoint({ x: relativeX, y: relativeY });
          
          lastPointRef.current = coords;
          
          if (currentDrawingPreviewRef.current) {
            currentDrawingPreviewRef.current.path = smoothPath;
          }
          
          // Check if batch is getting too large
          if (currentBatchIdRef.current) {
            checkBatchSize();
          }
          
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
  }, [toolStore.activeTool, toolStore.toolSettings, whiteboardStore, getCanvasCoordinates, handleEraserMove, findObjectAt, userId, checkBatchSize]);

  /**
   * Handles the end of a drawing/interaction session
   */
  const handlePointerUp = useCallback((event: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const activeTool = toolStore.activeTool;

    console.log('🖱️ Pointer up:', { tool: activeTool, wasDrawing: isDrawingRef.current, wasDragging: isDraggingRef.current, batchActive: !!currentBatchIdRef.current, userId: userId.slice(0, 8) });

    switch (activeTool) {
      case 'select': {
        if (isDraggingRef.current) {
          console.log('🔄 Finished dragging objects, ending batch:', currentBatchIdRef.current?.slice(0, 8), 'for user:', userId.slice(0, 8));
          // END BATCH for object dragging
          if (currentBatchIdRef.current) {
            endBatch();
            currentBatchIdRef.current = null;
            draggedObjectIdRef.current = null;
          }
        }
        isDraggingRef.current = false;
        dragStartRef.current = null;
        break;
      }

      case 'text': {
        // Additional check to prevent text creation while editing
        if (isEditingTextRef.current) {
          console.log('📝 Text creation blocked in pointer up - currently editing text');
          isDrawingRef.current = false;
          currentShapePreviewRef.current = null;
          return;
        }

        if (isDrawingRef.current && pathStartRef.current && currentShapePreviewRef.current) {
          const preview = currentShapePreviewRef.current;
          const width = Math.abs(preview.endX - preview.startX);
          const height = Math.abs(preview.endY - preview.startY);
          
          if (width > 10 && height > 10) {
            const textObject = createTextObject(
              Math.min(preview.startX, preview.endX),
              Math.min(preview.startY, preview.endY),
              width,
              height,
              preview.strokeColor
            );

            const objectId = whiteboardStore.addObject(textObject, userId);
            console.log('📝 Created text object:', objectId.slice(0, 8), { width, height, userId: userId.slice(0, 8) });
          }
          
          currentShapePreviewRef.current = null;
          
          if (redrawCanvasRef.current) {
            redrawCanvasRef.current();
          }
        }
        break;
      }

      case 'pencil':
      case 'brush': {
        if (isDrawingRef.current && pathBuilderRef.current && pathStartRef.current) {
          const finalSmoothPath = pathBuilderRef.current.getCurrentPath();
          
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

          const objectId = whiteboardStore.addObject(drawingObject, userId);
          console.log('✏️ Created smooth drawing object, ending batch:', currentBatchIdRef.current?.slice(0, 8), objectId.slice(0, 8), {
            pointCount: pathBuilderRef.current.getPointCount(),
            pathLength: finalSmoothPath.length,
            userId: userId.slice(0, 8)
          });
          
          // END BATCH for drawing
          if (currentBatchIdRef.current) {
            endBatch();
            currentBatchIdRef.current = null;
            drawingObjectIdRef.current = null;
          }
          
          currentDrawingPreviewRef.current = null;
          pathBuilderRef.current = null;
          
          if (redrawCanvasRef.current) {
            redrawCanvasRef.current();
          }
        }
        break;
      }

      case 'rectangle':
      case 'circle':
      case 'triangle':
      case 'diamond':
      case 'pentagon':
      case 'hexagon':
      case 'star':
      case 'heart': {
        if (isDrawingRef.current && pathStartRef.current && currentShapePreviewRef.current) {
          const preview = currentShapePreviewRef.current;
          const width = Math.abs(preview.endX - preview.startX);
          const height = Math.abs(preview.endY - preview.startY);
          
          if (width > 5 && height > 5) {
            const shapeObject = createShapeObject(
              activeTool,
              Math.min(preview.startX, preview.endX),
              Math.min(preview.startY, preview.endY),
              width,
              height,
              preview.strokeColor,
              preview.strokeWidth,
              preview.opacity
            );

            if (shapeObject) {
              // NOW WITH USER ID
              const objectId = whiteboardStore.addObject(shapeObject, userId);
              console.log('🔷 Created shape object:', activeTool, objectId.slice(0, 8), { width, height, userId: userId.slice(0, 8) });
            }
          }
          
          currentShapePreviewRef.current = null;
          
          if (redrawCanvasRef.current) {
            redrawCanvasRef.current();
          }
        }
        break;
      }

      case 'eraser': {
        if (isDrawingRef.current) {
          handleEraserEnd(redrawCanvasRef.current || undefined);
          console.log('🧹 Finished erasing:', { mode: toolStore.toolSettings.eraserMode, userId: userId.slice(0, 8) });
        }
        break;
      }
    }

    isDrawingRef.current = false;
    lastPointRef.current = null;
    pathStartRef.current = null;
    pathBuilderRef.current = null;
  }, [toolStore.activeTool, toolStore.toolSettings, whiteboardStore, handleEraserEnd, createShapeObject, createTextObject, userId, endBatch]);

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
    setRedrawCanvas,
    setDoubleClickProtection,
    setEditingState
  };
};
