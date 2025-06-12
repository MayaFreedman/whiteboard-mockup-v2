
import { useRef, useCallback } from 'react';
import { useWhiteboardStore } from '../stores/whiteboardStore';
import { useToolStore } from '../stores/toolStore';
import { WhiteboardObject } from '../types/whiteboard';

/**
 * Custom hook for handling canvas mouse and touch interactions
 * Manages drawing state and coordinates tool-specific behaviors
 */
export const useCanvasInteractions = () => {
  const whiteboardStore = useWhiteboardStore();
  const toolStore = useToolStore();
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const currentPathRef = useRef<string>('');

  /**
   * Converts screen coordinates to canvas coordinates
   * @param event - Mouse or touch event
   * @param canvas - Canvas element
   * @returns Canvas coordinates
   */
  const getCanvasCoordinates = useCallback((event: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }, []);

  /**
   * Finds the topmost object at the given coordinates
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns Object ID if found, null otherwise
   */
  const findObjectAt = useCallback((x: number, y: number): string | null => {
    const objects = Object.entries(whiteboardStore.objects);
    
    // Check objects from top to bottom (reverse order)
    for (let i = objects.length - 1; i >= 0; i--) {
      const [id, obj] = objects[i];
      
      // Simple bounding box check for now
      if (obj.width && obj.height) {
        if (x >= obj.x && x <= obj.x + obj.width &&
            y >= obj.y && y <= obj.y + obj.height) {
          return id;
        }
      } else {
        // For points/paths, use a small hit area
        const hitRadius = 5;
        if (Math.abs(x - obj.x) <= hitRadius && Math.abs(y - obj.y) <= hitRadius) {
          return id;
        }
      }
    }
    
    return null;
  }, [whiteboardStore.objects]);

  /**
   * Handles the start of a drawing/interaction session
   * @param event - Mouse or touch event
   * @param canvas - Canvas element
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
          console.log('🎯 Selected object:', objectId.slice(0, 8));
        } else {
          whiteboardStore.clearSelection();
          console.log('🎯 Cleared selection');
        }
        break;
      }

      case 'pencil': {
        isDrawingRef.current = true;
        lastPointRef.current = coords;
        currentPathRef.current = `M ${coords.x} ${coords.y}`;
        console.log('✏️ Started drawing at:', coords);
        break;
      }

      default:
        console.log('🔧 Tool not implemented yet:', activeTool);
    }
  }, [toolStore.activeTool, whiteboardStore, findObjectAt, getCanvasCoordinates]);

  /**
   * Handles pointer movement during interaction
   * @param event - Mouse or touch event
   * @param canvas - Canvas element
   */
  const handlePointerMove = useCallback((event: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    if (!isDrawingRef.current) return;

    const coords = getCanvasCoordinates(event, canvas);
    const activeTool = toolStore.activeTool;

    switch (activeTool) {
      case 'pencil': {
        if (lastPointRef.current) {
          currentPathRef.current += ` L ${coords.x} ${coords.y}`;
          lastPointRef.current = coords;
          
          // Draw preview on canvas
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.strokeStyle = toolStore.toolSettings.strokeColor;
            ctx.lineWidth = toolStore.toolSettings.strokeWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.globalAlpha = toolStore.toolSettings.opacity;
            
            ctx.beginPath();
            ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
            ctx.lineTo(coords.x, coords.y);
            ctx.stroke();
          }
        }
        break;
      }
    }
  }, [toolStore.activeTool, toolStore.toolSettings, getCanvasCoordinates]);

  /**
   * Handles the end of a drawing/interaction session
   * @param event - Mouse or touch event
   * @param canvas - Canvas element
   */
  const handlePointerUp = useCallback((event: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const activeTool = toolStore.activeTool;

    console.log('🖱️ Pointer up:', { tool: activeTool, wasDrawing: isDrawingRef.current });

    switch (activeTool) {
      case 'pencil': {
        if (isDrawingRef.current && currentPathRef.current) {
          const coords = getCanvasCoordinates(event, canvas);
          
          // Create the drawing object
          const drawingObject: Omit<WhiteboardObject, 'id' | 'createdAt' | 'updatedAt'> = {
            type: 'path',
            x: lastPointRef.current?.x || coords.x,
            y: lastPointRef.current?.y || coords.y,
            stroke: toolStore.toolSettings.strokeColor,
            strokeWidth: toolStore.toolSettings.strokeWidth,
            opacity: toolStore.toolSettings.opacity,
            fill: 'none',
            data: {
              path: currentPathRef.current,
              brushType: toolStore.toolSettings.brushType
            }
          };

          const objectId = whiteboardStore.addObject(drawingObject);
          console.log('✏️ Created drawing object:', objectId.slice(0, 8));
        }
        break;
      }
    }

    // Reset drawing state
    isDrawingRef.current = false;
    lastPointRef.current = null;
    currentPathRef.current = '';
  }, [toolStore.activeTool, toolStore.toolSettings, whiteboardStore, getCanvasCoordinates]);

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    isDrawing: isDrawingRef.current
  };
};
