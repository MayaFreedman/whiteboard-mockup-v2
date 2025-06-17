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
  const pathStartRef = useRef<{ x: number; y: number } | null>(null);
  const redrawCanvasRef = useRef<(() => void) | null>(null);
  
  // For eraser: track accumulated erase path instead of individual actions
  const currentErasePathRef = useRef<string>('');
  const eraseStartRef = useRef<{ x: number; y: number } | null>(null);
  
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

  /**
   * Sets the redraw canvas function (called by Canvas component)
   */
  const setRedrawCanvas = useCallback((redrawFn: () => void) => {
    redrawCanvasRef.current = redrawFn;
  }, []);

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
   * @param x - X coordinate (relative to path origin)
   * @param y - Y coordinate (relative to path origin)
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
    
    // Check objects from top to bottom (reverse order for z-index)
    for (let i = objects.length - 1; i >= 0; i--) {
      const [id, obj] = objects[i];
      
      let isHit = false;
      
      switch (obj.type) {
        case 'path': {
          if (obj.data?.path) {
            // Convert screen coordinates to path-relative coordinates
            const relativeX = x - obj.x;
            const relativeY = y - obj.y;
            isHit = isPointInPath(obj.data.path, relativeX, relativeY, obj.strokeWidth);
          }
          break;
        }
        
        case 'rectangle': {
          isHit = isPointInRectangle(obj, x, y);
          break;
        }
        
        case 'circle': {
          isHit = isPointInCircle(obj, x, y);
          break;
        }
        
        case 'text': {
          // For text, use a simple bounding box (approximate)
          const fontSize = obj.data?.fontSize || 16;
          const textWidth = (obj.data?.content?.length || 0) * fontSize * 0.6; // Rough estimate
          isHit = x >= obj.x && x <= obj.x + textWidth &&
                  y >= obj.y - fontSize && y <= obj.y;
          break;
        }
        
        default: {
          // Fallback for other types - use a small hit area around the point
          const hitRadius = 10;
          isHit = Math.abs(x - obj.x) <= hitRadius && Math.abs(y - obj.y) <= hitRadius;
        }
      }
      
      if (isHit) {
        return id;
      }
    }
    
    return null;
  }, [whiteboardStore.objects, isPointInPath, isPointInRectangle, isPointInCircle]);

  /**
   * Finds objects that intersect with the eraser area
   * @param eraserX - X coordinate of eraser center
   * @param eraserY - Y coordinate of eraser center
   * @param eraserSize - Size of eraser
   * @returns Array of object IDs that should be erased
   */
  const findObjectsInEraserArea = useCallback((eraserX: number, eraserY: number, eraserSize: number): string[] => {
    const objectsToErase: string[] = [];
    const objects = Object.entries(whiteboardStore.objects);
    
    const eraserRadius = eraserSize / 2;
    
    objects.forEach(([id, obj]) => {
      if (obj.data?.isEraser) return; // Skip existing eraser objects
      
      let intersects = false;
      
      switch (obj.type) {
        case 'path': {
          if (obj.data?.path) {
            // Check if any part of the path is within the eraser circle
            const relativeX = eraserX - obj.x;
            const relativeY = eraserY - obj.y;
            
            // Use a simplified check - if the center point is within stroke area
            if (isPointInPath(obj.data.path, relativeX, relativeY, obj.strokeWidth || 2)) {
              intersects = true;
            }
          }
          break;
        }
        
        case 'rectangle': {
          if (obj.width && obj.height) {
            // Check if eraser circle overlaps with rectangle
            const closestX = Math.max(obj.x, Math.min(eraserX, obj.x + obj.width));
            const closestY = Math.max(obj.y, Math.min(eraserY, obj.y + obj.height));
            const distance = Math.sqrt((eraserX - closestX) ** 2 + (eraserY - closestY) ** 2);
            intersects = distance <= eraserRadius;
          }
          break;
        }
        
        case 'circle': {
          if (obj.width) {
            const objRadius = obj.width / 2;
            const centerX = obj.x + objRadius;
            const centerY = obj.y + objRadius;
            const distance = Math.sqrt((eraserX - centerX) ** 2 + (eraserY - centerY) ** 2);
            intersects = distance <= (objRadius + eraserRadius);
          }
          break;
        }
        
        case 'text': {
          // Simple distance check for text
          const distance = Math.sqrt((eraserX - obj.x) ** 2 + (eraserY - obj.y) ** 2);
          intersects = distance <= eraserRadius;
          break;
        }
      }
      
      if (intersects) {
        objectsToErase.push(id);
      }
    });
    
    return objectsToErase;
  }, [whiteboardStore.objects, isPointInPath]);

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
        eraseStartRef.current = coords;
        
        // Start eraser preview path
        currentErasePathRef.current = `M 0 0`;
        
        // Set up eraser preview
        currentDrawingPreviewRef.current = {
          path: currentErasePathRef.current,
          startX: coords.x,
          startY: coords.y,
          strokeColor: '#ff0000',
          strokeWidth: toolStore.toolSettings.eraserSize,
          opacity: 0.3,
          isEraser: true
        };
        
        console.log('🧹 Started erasing at:', coords, 'Mode:', toolStore.toolSettings.eraserMode);
        break;
      }

      default:
        console.log('🔧 Tool not implemented yet:', activeTool);
    }
  }, [toolStore.activeTool, toolStore.toolSettings, whiteboardStore, findObjectAt, getCanvasCoordinates]);

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
        if (isDrawingRef.current && lastPointRef.current && eraseStartRef.current) {
          // Calculate relative coordinates from the erase start
          const relativeX = coords.x - eraseStartRef.current.x;
          const relativeY = coords.y - eraseStartRef.current.y;
          
          currentErasePathRef.current += ` L ${relativeX} ${relativeY}`;
          lastPointRef.current = coords;
          
          // Update eraser preview
          if (currentDrawingPreviewRef.current) {
            currentDrawingPreviewRef.current.path = currentErasePathRef.current;
          }
          
          // Trigger canvas redraw to show eraser preview
          if (redrawCanvasRef.current) {
            redrawCanvasRef.current();
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
        if (isDrawingRef.current && currentErasePathRef.current && eraseStartRef.current) {
          const eraserMode = toolStore.toolSettings.eraserMode;
          
          if (eraserMode === 'pixel') {
            // Create eraser object that will be processed by the rendering system
            const eraserObject: Omit<WhiteboardObject, 'id' | 'createdAt' | 'updatedAt'> = {
              type: 'path',
              x: eraseStartRef.current.x,
              y: eraseStartRef.current.y,
              stroke: '#000000',
              strokeWidth: toolStore.toolSettings.eraserSize,
              opacity: 1,
              fill: 'none',
              data: {
                path: currentErasePathRef.current,
                isEraser: true
              }
            };

            const objectId = whiteboardStore.addObject(eraserObject);
            console.log('🧹 Created eraser object:', objectId.slice(0, 8));
          } else {
            // Object eraser mode - find objects along the erase path and delete them
            // This is a simplified approach - we could make it more sophisticated later
            const eraserSize = toolStore.toolSettings.eraserSize;
            const coords = getCanvasCoordinates(event, canvas);
            const objectsToErase = findObjectsInEraserArea(coords.x, coords.y, eraserSize);
            
            if (objectsToErase.length > 0) {
              whiteboardStore.deleteObjectsInArea(objectsToErase, {
                x: coords.x - eraserSize / 2,
                y: coords.y - eraserSize / 2,
                width: eraserSize,
                height: eraserSize
              });
              console.log('🗑️ Deleted objects:', objectsToErase.length);
            }
          }
          
          // Clear eraser preview
          currentDrawingPreviewRef.current = null;
          
          // Trigger redraw to show the final result
          if (redrawCanvasRef.current) {
            redrawCanvasRef.current();
          }
        }
        break;
      }
    }

    // Reset drawing state
    isDrawingRef.current = false;
    lastPointRef.current = null;
    currentPathRef.current = '';
    pathStartRef.current = null;
    currentErasePathRef.current = '';
    eraseStartRef.current = null;
  }, [toolStore.activeTool, toolStore.toolSettings, whiteboardStore, getCanvasCoordinates, findObjectsInEraserArea]);

  /**
   * Gets the current drawing preview for rendering (includes eraser preview)
   * @returns Current drawing preview or null
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
