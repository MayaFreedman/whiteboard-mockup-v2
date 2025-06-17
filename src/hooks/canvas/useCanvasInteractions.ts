
import { useRef, useCallback } from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useToolStore } from '../../stores/toolStore';
import { WhiteboardObject } from '../../types/whiteboard';
import { useCanvasCoordinates } from './useCanvasCoordinates';
import { useObjectDetection } from './useObjectDetection';
import { useEraserLogic } from './useEraserLogic';

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
  const currentPathRef = useRef<string>('');
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const pathStartRef = useRef<{ x: number; y: number } | null>(null);
  const redrawCanvasRef = useRef<(() => void) | null>(null);
  
  // Store the current drawing preview for rendering (not used for eraser anymore)
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
        // Start path relative to origin
        currentPathRef.current = `M 0 0`;
        
        // Set up drawing preview with brush type
        currentDrawingPreviewRef.current = {
          path: currentPathRef.current,
          startX: coords.x,
          startY: coords.y,
          strokeColor: toolStore.toolSettings.strokeColor,
          strokeWidth: toolStore.toolSettings.strokeWidth,
          opacity: toolStore.toolSettings.opacity,
          brushType: activeTool === 'brush' ? toolStore.toolSettings.brushType : 'pencil'
        };
        
        console.log('✏️ Started drawing at:', coords);
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
        if (isDrawingRef.current && lastPointRef.current && pathStartRef.current) {
          // Calculate relative coordinates from the path start
          const relativeX = coords.x - pathStartRef.current.x;
          const relativeY = coords.y - pathStartRef.current.y;
          
          currentPathRef.current += ` L ${relativeX} ${relativeY}`;
          lastPointRef.current = coords;
          
          // Update drawing preview
          if (currentDrawingPreviewRef.current) {
            currentDrawingPreviewRef.current.path = currentPathRef.current;
          }
          
          // Trigger canvas redraw to show smooth preview
          if (redrawCanvasRef.current) {
            redrawCanvasRef.current();
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
        if (isDrawingRef.current && currentPathRef.current && pathStartRef.current) {
          // Create the drawing object with the path start position
          const drawingObject: Omit<WhiteboardObject, 'id' | 'createdAt' | 'updatedAt'> = {
            type: 'path',
            x: pathStartRef.current.x,
            y: pathStartRef.current.y,
            stroke: toolStore.toolSettings.strokeColor,
            strokeWidth: toolStore.toolSettings.strokeWidth,
            opacity: toolStore.toolSettings.opacity,
            fill: 'none',
            data: {
              path: currentPathRef.current,
              brushType: activeTool === 'brush' ? toolStore.toolSettings.brushType : 'pencil'
            }
          };

          const objectId = whiteboardStore.addObject(drawingObject);
          console.log('✏️ Created drawing object:', objectId.slice(0, 8));
          
          // Clear drawing preview
          currentDrawingPreviewRef.current = null;
          
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
    currentPathRef.current = '';
    pathStartRef.current = null;
  }, [toolStore.activeTool, toolStore.toolSettings, whiteboardStore, handleEraserEnd]);

  /**
   * Gets the current drawing preview for rendering (not used for eraser)
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
