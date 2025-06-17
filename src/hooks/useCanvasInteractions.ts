import { useRef, useCallback } from 'react';
import {
  useWhiteboardStore
} from '../stores/whiteboardStore';
import { useToolStore } from '../stores/toolStore';
import { WhiteboardObject } from '../types/whiteboard';
import {
  interpolatePoints,
  doesPathIntersectEraserBatch,
  erasePointsFromPathBatch,
  pathToPoints,
  lineSegmentIntersectsCircle
} from '../utils/pathUtils';

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
  
  // For real-time eraser: batch processing with line segment intersection
  const eraserPointsRef = useRef<Array<{ x: number; y: number; radius: number }>>([]);
  const lastEraserProcessRef = useRef<number>(0);
  const ERASER_BATCH_SIZE = 3; // Process every N points
  const ERASER_THROTTLE_MS = 16; // ~60fps max
  
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
   * Converts screen coordinates to canvas coordinates
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
   */
  const isPointInRectangle = useCallback((obj: WhiteboardObject, x: number, y: number): boolean => {
    if (!obj.width || !obj.height) return false;
    return x >= obj.x && x <= obj.x + obj.width &&
           y >= obj.y && y <= obj.y + obj.height;
  }, []);

  /**
   * Checks if a point is inside a circle
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
   */
  const findObjectAt = useCallback((x: number, y: number): string | null => {
    const objects = Object.entries(whiteboardStore.objects);
    
    // Check objects from top to bottom (reverse order for z-index)
    for (let i = objects.length - 1; i >= 0; i--) {
      const [id, obj] = objects[i];
      
      let isHit = false;
      
      switch (obj.type) {
        case 'path': {
          if (obj.data?.path && !obj.data?.isEraser) { // Skip eraser objects
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
   * Processes accumulated eraser points against all objects using line segment intersection
   */
  const processEraserBatch = useCallback(() => {
    if (eraserPointsRef.current.length === 0) return;
    
    const objects = Object.entries(whiteboardStore.objects);
    const objectsToModify: Array<{ id: string; segments: any[] }> = [];
    const objectsToDelete: string[] = [];
    
    objects.forEach(([id, obj]) => {
      if (obj.type === 'path' && obj.data?.path && !obj.data?.isEraser) {
        // Check if this path intersects with any eraser points
        const intersects = doesPathIntersectEraserBatch(
          obj.data.path,
          obj.x,
          obj.y,
          eraserPointsRef.current
        );
        
        if (intersects) {
          // Convert path to points and erase intersecting areas
          const points = pathToPoints(obj.data.path);
          
          // Convert eraser coordinates to path-relative coordinates
          const relativeEraserPoints = eraserPointsRef.current.map(eraser => ({
            x: eraser.x - obj.x,
            y: eraser.y - obj.y,
            radius: eraser.radius
          }));
          
          // Get remaining segments after erasing with line segment intersection
          const segments = erasePointsFromPathBatch(points, relativeEraserPoints);
          
          if (segments.length === 0) {
            // Object is completely erased
            objectsToDelete.push(id);
          } else {
            // Object has remaining segments
            objectsToModify.push({ id, segments });
          }
        }
      }
    });
    
    // Apply modifications
    objectsToDelete.forEach(id => {
      whiteboardStore.deleteObject(id);
    });
    
    objectsToModify.forEach(({ id, segments }) => {
      const originalObj = whiteboardStore.objects[id];
      if (!originalObj) return;
      
      // Delete original object
      whiteboardStore.deleteObject(id);
      
      // Create new objects for each segment
      segments.forEach((segment, index) => {
        if (segment.points.length >= 2) {
          const newPath = segment.points.reduce((path: string, point: any, i: number) => {
            return i === 0 ? `M ${point.x} ${point.y}` : `${path} L ${point.x} ${point.y}`;
          }, '');
          
          const newObject: Omit<WhiteboardObject, 'id' | 'createdAt' | 'updatedAt'> = {
            ...originalObj,
            data: {
              ...originalObj.data,
              path: newPath
            }
          };
          whiteboardStore.addObject(newObject);
        }
      });
    });
    
    console.log('🧹 Processed eraser batch:', {
      eraserPoints: eraserPointsRef.current.length,
      deleted: objectsToDelete.length,
      modified: objectsToModify.length
    });
  }, [whiteboardStore]);

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
        
        // Initialize eraser batch processing
        eraserPointsRef.current = [{
          x: coords.x,
          y: coords.y,
          radius: toolStore.toolSettings.eraserSize / 2
        }];
        lastEraserProcessRef.current = Date.now();
        
        // Process initial eraser point immediately
        processEraserBatch();
        
        console.log('🧹 Started real-time erasing at:', coords);
        break;
      }

      default:
        console.log('🔧 Tool not implemented yet:', activeTool);
    }
  }, [toolStore.activeTool, toolStore.toolSettings, whiteboardStore, findObjectAt, getCanvasCoordinates, processEraserBatch]);

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
          const eraserRadius = toolStore.toolSettings.eraserSize / 2;
          
          // Add interpolated points for continuous coverage
          const interpolatedPoints = interpolatePoints(lastPointRef.current, coords, eraserRadius / 2);
          
          // Add each interpolated point to the batch
          interpolatedPoints.slice(1).forEach(point => {
            eraserPointsRef.current.push({
              x: point.x,
              y: point.y,
              radius: eraserRadius
            });
          });
          
          lastPointRef.current = coords;
          
          // Process eraser batch if we have enough points or enough time has passed
          const now = Date.now();
          const shouldProcess = 
            eraserPointsRef.current.length >= ERASER_BATCH_SIZE ||
            now - lastEraserProcessRef.current >= ERASER_THROTTLE_MS;
          
          if (shouldProcess) {
            processEraserBatch();
            // Don't clear all points - keep the last one for continuity
            const lastPoint = eraserPointsRef.current[eraserPointsRef.current.length - 1];
            eraserPointsRef.current = lastPoint ? [lastPoint] : [];
            lastEraserProcessRef.current = now;
            
            // Trigger canvas redraw
            if (redrawCanvasRef.current) {
              redrawCanvasRef.current();
            }
          }
        }
        break;
      }
    }
  }, [toolStore.activeTool, toolStore.toolSettings, whiteboardStore, getCanvasCoordinates, processEraserBatch]);

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
          // Process any remaining eraser points
          if (eraserPointsRef.current.length > 0) {
            processEraserBatch();
            eraserPointsRef.current = [];
            
            // Trigger final redraw
            if (redrawCanvasRef.current) {
              redrawCanvasRef.current();
            }
          }
          
          console.log('🧹 Finished real-time erasing');
        }
        break;
      }
    }

    // Reset drawing state
    isDrawingRef.current = false;
    lastPointRef.current = null;
    currentPathRef.current = '';
    pathStartRef.current = null;
    eraserPointsRef.current = [];
  }, [toolStore.activeTool, toolStore.toolSettings, whiteboardStore, processEraserBatch]);

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
