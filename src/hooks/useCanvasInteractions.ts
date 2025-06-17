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
  const erasedObjectsRef = useRef<Set<string>>(new Set());
  
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
            // Convert screen coordinates to path-relative coordinates
            const relativeX = x - obj.x;
            const relativeY = y - obj.y;
            isHit = isPointInPath(obj.data.path, relativeX, relativeY, obj.strokeWidth);
            console.log('📏 Path hit test:', { 
              id: id.slice(0, 8), 
              isHit, 
              strokeWidth: obj.strokeWidth,
              screenCoords: { x, y },
              pathOrigin: { x: obj.x, y: obj.y },
              relativeCoords: { x: relativeX, y: relativeY }
            });
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
   * Finds objects that intersect with the eraser area
   * @param eraserPath - The eraser path
   * @param eraserStart - Starting position of eraser
   * @param eraserSize - Size of eraser
   * @returns Array of object IDs that should be erased
   */
  const findObjectsInEraserPath = useCallback((eraserPath: string, eraserStart: { x: number; y: number }, eraserSize: number): string[] => {
    const objectsToErase: string[] = [];
    const objects = Object.entries(whiteboardStore.objects);
    
    // Create a temporary canvas to test eraser path intersections
    const testCanvas = document.createElement('canvas');
    const testCtx = testCanvas.getContext('2d');
    if (!testCtx) return objectsToErase;
    
    testCtx.lineWidth = eraserSize;
    testCtx.lineCap = 'round';
    testCtx.lineJoin = 'round';
    
    // Test each object for intersection with eraser path
    objects.forEach(([id, obj]) => {
      if (obj.data?.isEraser) return; // Skip existing eraser objects
      
      let intersects = false;
      
      switch (obj.type) {
        case 'path': {
          if (obj.data?.path) {
            // Check if the eraser path intersects with the object path
            // For simplicity, we'll check if any points along the eraser path hit the object
            const path = new Path2D(eraserPath);
            const objPath = new Path2D(obj.data.path);
            
            // Sample points along the eraser path and test intersection
            const samplePoints = 10;
            for (let i = 0; i <= samplePoints; i++) {
              const t = i / samplePoints;
              // This is a simplified intersection test - in a production app you'd want more sophisticated geometry
              const relativeX = eraserStart.x - obj.x;
              const relativeY = eraserStart.y - obj.y;
              
              if (testCtx.isPointInStroke(objPath, relativeX, relativeY)) {
                intersects = true;
                break;
              }
            }
          }
          break;
        }
        
        case 'rectangle': {
          if (obj.width && obj.height) {
            // Check if eraser overlaps with rectangle
            const eraserLeft = eraserStart.x - eraserSize / 2;
            const eraserRight = eraserStart.x + eraserSize / 2;
            const eraserTop = eraserStart.y - eraserSize / 2;
            const eraserBottom = eraserStart.y + eraserSize / 2;
            
            intersects = !(eraserRight < obj.x || eraserLeft > obj.x + obj.width ||
                          eraserBottom < obj.y || eraserTop > obj.y + obj.height);
          }
          break;
        }
        
        case 'circle': {
          if (obj.width) {
            const radius = obj.width / 2;
            const centerX = obj.x + radius;
            const centerY = obj.y + radius;
            const distance = Math.sqrt((eraserStart.x - centerX) ** 2 + (eraserStart.y - centerY) ** 2);
            intersects = distance <= (radius + eraserSize / 2);
          }
          break;
        }
      }
      
      if (intersects) {
        objectsToErase.push(id);
      }
    });
    
    return objectsToErase;
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
        
        console.log('✏️ Started drawing at:', coords, 'Preview set:', !!currentDrawingPreviewRef.current, 'Brush type:', currentDrawingPreviewRef.current.brushType);
        break;
      }

      case 'eraser': {
        isDrawingRef.current = true;
        lastPointRef.current = coords;
        pathStartRef.current = coords;
        erasedObjectsRef.current = new Set();
        
        // Start eraser path
        currentPathRef.current = `M 0 0`;
        
        // Set up eraser preview
        currentDrawingPreviewRef.current = {
          path: currentPathRef.current,
          startX: coords.x,
          startY: coords.y,
          strokeColor: '#ff0000', // Red preview for eraser
          strokeWidth: toolStore.toolSettings.eraserSize,
          opacity: 0.5, // Semi-transparent preview
          isEraser: true
        };
        
        console.log('🧹 Started erasing at:', coords, 'Mode:', toolStore.toolSettings.eraserMode);
        break;
      }

      default:
        console.log('🔧 Tool not implemented yet:', activeTool);
    }
  }, [toolStore.activeTool, toolStore.toolSettings, whiteboardStore, findObjectAt, getCanvasCoordinates, findObjectsInEraserPath]);

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
          
          console.log('🔄 Dragging objects:', { deltaX, deltaY });
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
            console.log('🖊️ Updated drawing preview path length:', currentPathRef.current.length);
          }
          
          // Trigger canvas redraw to show smooth preview
          if (redrawCanvasRef.current) {
            redrawCanvasRef.current();
          }
        }
        break;
      }

      case 'eraser': {
        if (isDrawingRef.current && lastPointRef.current && pathStartRef.current) {
          // Calculate relative coordinates from the path start
          const relativeX = coords.x - pathStartRef.current.x;
          const relativeY = coords.y - pathStartRef.current.y;
          
          currentPathRef.current += ` L ${relativeX} ${relativeY}`;
          
          // For object eraser mode, find and mark objects for deletion
          if (toolStore.toolSettings.eraserMode === 'object') {
            const objectsToErase = findObjectsInEraserPath(
              currentPathRef.current,
              coords,
              toolStore.toolSettings.eraserSize
            );
            
            objectsToErase.forEach(id => erasedObjectsRef.current.add(id));
          }
          
          lastPointRef.current = coords;
          
          // Update eraser preview
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
    }
  }, [toolStore.activeTool, toolStore.toolSettings, whiteboardStore, getCanvasCoordinates, findObjectsInEraserPath]);

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
          console.log('✏️ Created drawing object:', objectId.slice(0, 8), 'with brush type:', drawingObject.data.brushType);
          
          // Clear drawing preview
          currentDrawingPreviewRef.current = null;
          console.log('🧹 Cleared drawing preview');
          
          // Trigger redraw to show the final object
          if (redrawCanvasRef.current) {
            redrawCanvasRef.current();
          }
        }
        break;
      }

      case 'eraser': {
        if (isDrawingRef.current && currentPathRef.current && pathStartRef.current) {
          const eraserMode = toolStore.toolSettings.eraserMode;
          
          if (eraserMode === 'pixel') {
            // Create pixel eraser action
            whiteboardStore.erasePixels({
              path: currentPathRef.current,
              x: pathStartRef.current.x,
              y: pathStartRef.current.y,
              size: toolStore.toolSettings.eraserSize,
              opacity: toolStore.toolSettings.eraserOpacity
            });
            console.log('🧹 Created pixel eraser');
          } else if (eraserMode === 'object') {
            // Create object deletion action
            const objectIds = Array.from(erasedObjectsRef.current);
            if (objectIds.length > 0) {
              whiteboardStore.deleteObjectsInArea(objectIds, {
                x: pathStartRef.current.x - toolStore.toolSettings.eraserSize / 2,
                y: pathStartRef.current.y - toolStore.toolSettings.eraserSize / 2,
                width: toolStore.toolSettings.eraserSize,
                height: toolStore.toolSettings.eraserSize
              });
              console.log('🗑️ Deleted objects:', objectIds.length);
            }
          }
          
          // Clear eraser preview
          currentDrawingPreviewRef.current = null;
          erasedObjectsRef.current.clear();
          
          // Trigger redraw to show final result
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
  }, [toolStore.activeTool, toolStore.toolSettings, whiteboardStore, getCanvasCoordinates]);

  /**
   * Gets the current drawing preview for rendering
   * @returns Current drawing preview or null
   */
  const getCurrentDrawingPreview = useCallback(() => {
    console.log('📋 Getting drawing preview:', !!currentDrawingPreviewRef.current);
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
