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
  const isDraggingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const currentPathRef = useRef<string>('');
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

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
   * Checks if a point is inside a path using path intersection
   * @param pathString - SVG path string
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param strokeWidth - Width of the stroke for hit area
   * @returns True if point intersects with path
   */
  const isPointInPath = useCallback((pathString: string, x: number, y: number, strokeWidth: number = 2): boolean => {
    try {
      const path = new Path2D(pathString);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;

      // Create a hit area around the stroke
      ctx.lineWidth = Math.max(strokeWidth, 8); // Minimum 8px hit area
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      return ctx.isPointInStroke(path, x, y);
    } catch (error) {
      console.warn('Error checking path intersection:', error);
      return false;
    }
  }, []);

  /**
   * Checks if a point is inside a rectangle
   * @param obj - Rectangle object
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns True if point is inside rectangle
   */
  const isPointInRectangle = useCallback((obj: WhiteboardObject, x: number, y: number): boolean => {
    if (!obj.width || !obj.height) return false;
    return x >= obj.x && x <= obj.x + obj.width &&
           y >= obj.y && y <= obj.y + obj.height;
  }, []);

  /**
   * Checks if a point is inside a circle
   * @param obj - Circle object
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns True if point is inside circle
   */
  const isPointInCircle = useCallback((obj: WhiteboardObject, x: number, y: number): boolean => {
    if (!obj.width) return false;
    const radius = obj.width / 2;
    const centerX = obj.x + radius;
    const centerY = obj.y + radius;
    const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
    return distance <= radius;
  }, []);

  /**
   * Finds the topmost object at the given coordinates
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns Object ID if found, null otherwise
   */
  const findObjectAt = useCallback((x: number, y: number): string | null => {
    const objects = Object.entries(whiteboardStore.objects);
    
    console.log('🔍 Checking for objects at:', { x, y, totalObjects: objects.length });
    
    // Check objects from top to bottom (reverse order for z-index)
    for (let i = objects.length - 1; i >= 0; i--) {
      const [id, obj] = objects[i];
      
      console.log('🎯 Checking object:', { 
        id: id.slice(0, 8), 
        type: obj.type, 
        position: { x: obj.x, y: obj.y },
        size: obj.width ? { width: obj.width, height: obj.height } : 'no size'
      });
      
      let isHit = false;
      
      switch (obj.type) {
        case 'path': {
          if (obj.data?.path) {
            isHit = isPointInPath(obj.data.path, x, y, obj.strokeWidth);
            console.log('📏 Path hit test:', { id: id.slice(0, 8), isHit, strokeWidth: obj.strokeWidth });
          }
          break;
        }
        
        case 'rectangle': {
          isHit = isPointInRectangle(obj, x, y);
          console.log('📦 Rectangle hit test:', { id: id.slice(0, 8), isHit });
          break;
        }
        
        case 'circle': {
          isHit = isPointInCircle(obj, x, y);
          console.log('⭕ Circle hit test:', { id: id.slice(0, 8), isHit });
          break;
        }
        
        case 'text': {
          // For text, use a simple bounding box (approximate)
          const fontSize = obj.data?.fontSize || 16;
          const textWidth = (obj.data?.content?.length || 0) * fontSize * 0.6; // Rough estimate
          isHit = x >= obj.x && x <= obj.x + textWidth &&
                  y >= obj.y - fontSize && y <= obj.y;
          console.log('📝 Text hit test:', { id: id.slice(0, 8), isHit, textWidth, fontSize });
          break;
        }
        
        default: {
          // Fallback for other types - use a small hit area around the point
          const hitRadius = 10;
          isHit = Math.abs(x - obj.x) <= hitRadius && Math.abs(y - obj.y) <= hitRadius;
          console.log('❓ Default hit test:', { id: id.slice(0, 8), isHit, hitRadius });
        }
      }
      
      if (isHit) {
        console.log('✅ Found object at coordinates:', { id: id.slice(0, 8), type: obj.type });
        return id;
      }
    }
    
    console.log('❌ No object found at coordinates');
    return null;
  }, [whiteboardStore.objects, isPointInPath, isPointInRectangle, isPointInCircle]);

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
          isDraggingRef.current = true;
          dragStartRef.current = coords;
          console.log('🎯 Selected object for dragging:', objectId.slice(0, 8));
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
          console.log('🔄 Dragging objects:', { deltaX, deltaY });
        }
        break;
      }

      case 'pencil': {
        if (isDrawingRef.current && lastPointRef.current) {
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
  }, [toolStore.activeTool, toolStore.toolSettings, whiteboardStore, getCanvasCoordinates]);

  /**
   * Handles the end of a drawing/interaction session
   * @param event - Mouse or touch event
   * @param canvas - Canvas element
   */
  const handlePointerUp = useCallback((event: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const activeTool = toolStore.activeTool;

    console.log('🖱️ Pointer up:', { tool: activeTool, wasDrawing: isDrawingRef.current, wasDragging: isDraggingRef.current });

    switch (activeTool) {
      case 'select': {
        isDraggingRef.current = false;
        dragStartRef.current = null;
        break;
      }

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
