import { useCallback } from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { WhiteboardObject } from '../../types/whiteboard';
import { 
  isPointInTriangle, 
  isPointInDiamond, 
  isPointInPolygon, 
  getPentagonVertices, 
  getHexagonVertices, 
  getStarVertices 
} from '../../utils/shapeRendering';
import { isPointInTextBounds } from '../../utils/textMeasurement';

/**
 * Hook for detecting objects at coordinates with improved accuracy
 */
export const useObjectDetection = () => {
  const whiteboardStore = useWhiteboardStore();

  /**
   * Checks if a point is inside a path using multiple detection methods
   */
  const isPointInPath = useCallback((pathString: string, x: number, y: number, strokeWidth: number = 2): boolean => {
    try {
      const path = new Path2D(pathString);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;

      // Primary method: stroke hit detection with generous hit area
      ctx.lineWidth = Math.max(strokeWidth * 2, 12); // At least 12px hit area
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      const strokeHit = ctx.isPointInStroke(path, x, y);
      
      // Fallback method: check multiple points around the target for better coverage
      if (!strokeHit) {
        const radius = Math.max(strokeWidth, 6);
        const testPoints = [
          { x: x - radius, y },
          { x: x + radius, y },
          { x, y: y - radius },
          { x, y: y + radius },
          { x: x - radius/2, y: y - radius/2 },
          { x: x + radius/2, y: y - radius/2 },
          { x: x - radius/2, y: y + radius/2 },
          { x: x + radius/2, y: y + radius/2 }
        ];
        
        return testPoints.some(point => ctx.isPointInStroke(path, point.x, point.y));
      }
      
      return strokeHit;
    } catch (error) {
      console.warn('Error checking path intersection:', error);
      return false;
    }
  }, []);

  /**
   * Checks if a point is inside a rectangle with padding
   */
  const isPointInRectangle = useCallback((obj: WhiteboardObject, x: number, y: number): boolean => {
    if (!obj.width || !obj.height) return false;
    
    // Add 5px padding for easier selection
    const padding = 5;
    return x >= obj.x - padding && x <= obj.x + obj.width + padding &&
           y >= obj.y - padding && y <= obj.y + obj.height + padding;
  }, []);

  /**
   * Checks if a point is inside an ellipse (circle) with padding
   */
  const isPointInCircle = useCallback((obj: WhiteboardObject, x: number, y: number): boolean => {
    if (!obj.width || !obj.height) return false;
    
    const radiusX = obj.width / 2;
    const radiusY = obj.height / 2;
    const centerX = obj.x + radiusX;
    const centerY = obj.y + radiusY;
    
    // Use ellipse equation: (x-h)²/a² + (y-k)²/b² <= 1
    // where (h,k) is center, a is radiusX, b is radiusY
    const normalizedX = (x - centerX) / (radiusX + 5); // Add 5px padding
    const normalizedY = (y - centerY) / (radiusY + 5); // Add 5px padding
    
    return (normalizedX * normalizedX + normalizedY * normalizedY) <= 1;
  }, []);

  /**
   * Checks if a point is near text with improved hit area using accurate measurement
   */
  const isPointInText = useCallback((obj: WhiteboardObject, x: number, y: number): boolean => {
    if (!obj.data?.content && obj.data?.content !== '') return false;
    
    const textData = obj.data;
    const content = textData.content || 'Double-click to edit';
    
    return isPointInTextBounds(
      x, y,
      obj.x + 4, // Account for canvas padding
      obj.y + 4, // Account for canvas padding
      content,
      textData.fontSize || 16,
      textData.fontFamily || 'Arial',
      textData.bold || false,
      textData.italic || false,
      textData.textAlign || 'left',
      obj.width ? obj.width - 8 : undefined, // Available width minus padding
      8 // Padding for easier selection
    );
  }, []);

  /**
   * Checks if a point is inside an image with padding
   */
  const isPointInImage = useCallback((obj: WhiteboardObject, x: number, y: number): boolean => {
    if (!obj.width || !obj.height) return false;
    
    // Add 5px padding for easier selection
    const padding = 5;
    return x >= obj.x - padding && x <= obj.x + obj.width + padding &&
           y >= obj.y - padding && y <= obj.y + obj.height + padding;
  }, []);

  /**
   * Checks if a point is inside a complex shape
   */
  const isPointInComplexShape = useCallback((obj: WhiteboardObject, x: number, y: number): boolean => {
    if (!obj.width || !obj.height) return false;
    
    const padding = 5; // Add padding for easier selection
    
    switch (obj.type) {
      case 'triangle':
        return isPointInTriangle(x, y, obj.x - padding, obj.y - padding, obj.width + padding * 2, obj.height + padding * 2);
      
      case 'diamond':
        return isPointInDiamond(x, y, obj.x - padding, obj.y - padding, obj.width + padding * 2, obj.height + padding * 2);
      
      case 'pentagon': {
        const vertices = getPentagonVertices(obj.x - padding, obj.y - padding, obj.width + padding * 2, obj.height + padding * 2);
        return isPointInPolygon(x, y, vertices);
      }
      
      case 'hexagon': {
        const vertices = getHexagonVertices(obj.x - padding, obj.y - padding, obj.width + padding * 2, obj.height + padding * 2);
        return isPointInPolygon(x, y, vertices);
      }
      
      case 'star': {
        const vertices = getStarVertices(obj.x - padding, obj.y - padding, obj.width + padding * 2, obj.height + padding * 2);
        return isPointInPolygon(x, y, vertices);
      }
      
      case 'heart': {
        // For heart, use a bounding box approach with some tolerance
        // This is a simplified approach - a more accurate method would trace the heart curve
        const centerX = obj.x + obj.width / 2;
        const centerY = obj.y + obj.height / 2;
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        const maxDistance = Math.min(obj.width, obj.height) / 2 + padding;
        return distance <= maxDistance;
      }
      
      default:
        return false;
    }
  }, []);

  /**
   * Finds the topmost object at the given coordinates with improved detection
   */
  const findObjectAt = useCallback((x: number, y: number): string | null => {
    const objects = Object.entries(whiteboardStore.objects);
    
    console.log('🎯 Finding object at:', { x, y, totalObjects: objects.length });
    
    // Check objects from top to bottom (reverse order for z-index)
    for (let i = objects.length - 1; i >= 0; i--) {
      const [id, obj] = objects[i];
      
      // Skip eraser objects
      if (obj.data?.isEraser) {
        continue;
      }
      
      let isHit = false;
      
      switch (obj.type) {
        case 'path': {
          if (obj.data?.path) {
            // Convert screen coordinates to path-relative coordinates
            const relativeX = x - obj.x;
            const relativeY = y - obj.y;
            isHit = isPointInPath(obj.data.path, relativeX, relativeY, obj.strokeWidth);
            
            console.log('🖊️ Path hit test:', {
              id: id.slice(0, 8),
              screenCoords: { x, y },
              objectCoords: { x: obj.x, y: obj.y },
              relativeCoords: { x: relativeX, y: relativeY },
              strokeWidth: obj.strokeWidth,
              isHit
            });
          }
          break;
        }
        
        case 'rectangle': {
          isHit = isPointInRectangle(obj, x, y);
          console.log('▭ Rectangle hit test:', {
            id: id.slice(0, 8),
            bounds: { x: obj.x, y: obj.y, width: obj.width, height: obj.height },
            isHit
          });
          break;
        }
        
        case 'circle': {
          isHit = isPointInCircle(obj, x, y);
          console.log('⭕ Circle hit test:', {
            id: id.slice(0, 8),
            center: { x: obj.x + (obj.width || 0) / 2, y: obj.y + (obj.height || 0) / 2 },
            radiusX: (obj.width || 0) / 2,
            radiusY: (obj.height || 0) / 2,
            isHit
          });
          break;
        }
        
        case 'text': {
          isHit = isPointInText(obj, x, y);
          console.log('📝 Text hit test (improved):', {
            id: id.slice(0, 8),
            position: { x: obj.x, y: obj.y },
            content: obj.data?.content,
            isHit
          });
          break;
        }
        
        case 'image': {
          isHit = isPointInImage(obj, x, y);
          console.log('🖼️ Image hit test:', {
            id: id.slice(0, 8),
            bounds: { x: obj.x, y: obj.y, width: obj.width, height: obj.height },
            isHit
          });
          break;
        }
        
        case 'triangle':
        case 'diamond':
        case 'pentagon':
        case 'hexagon':
        case 'star':
        case 'heart': {
          isHit = isPointInComplexShape(obj, x, y);
          console.log('🔷 Complex shape hit test:', {
            id: id.slice(0, 8),
            type: obj.type,
            bounds: { x: obj.x, y: obj.y, width: obj.width, height: obj.height },
            isHit
          });
          break;
        }
        
        default: {
          // Fallback for other types - use a larger hit area around the point
          const hitRadius = 15;
          isHit = Math.abs(x - obj.x) <= hitRadius && Math.abs(y - obj.y) <= hitRadius;
          console.log('❓ Unknown type hit test:', {
            id: id.slice(0, 8),
            type: obj.type,
            distance: Math.sqrt((x - obj.x) ** 2 + (y - obj.y) ** 2),
            hitRadius,
            isHit
          });
        }
      }
      
      if (isHit) {
        console.log('✅ Object found:', {
          id: id.slice(0, 8),
          type: obj.type,
          position: { x: obj.x, y: obj.y }
        });
        return id;
      }
    }
    
    console.log('❌ No object found at coordinates');
    return null;
  }, [whiteboardStore.objects, isPointInPath, isPointInRectangle, isPointInCircle, isPointInText, isPointInImage, isPointInComplexShape]);

  /**
   * Checks if an object intersects with a selection box
   */
  const isObjectInSelectionBox = useCallback((obj: WhiteboardObject, box: { startX: number; startY: number; endX: number; endY: number }): boolean => {
    // Calculate selection box bounds
    const boxLeft = Math.min(box.startX, box.endX);
    const boxRight = Math.max(box.startX, box.endX);
    const boxTop = Math.min(box.startY, box.endY);
    const boxBottom = Math.max(box.startY, box.endY);

    // Calculate object bounds based on type
    let objLeft = obj.x;
    let objRight = obj.x + (obj.width || 0);
    let objTop = obj.y;
    let objBottom = obj.y + (obj.height || 0);

    // For paths, we need to account for stroke width and potentially analyze the path bounds
    if (obj.type === 'path' && obj.data?.path) {
      const strokeWidth = obj.strokeWidth || 2;
      objLeft -= strokeWidth / 2;
      objRight += strokeWidth / 2;
      objTop -= strokeWidth / 2;
      objBottom += strokeWidth / 2;
    }

    // Check if object bounds intersect with selection box bounds
    return !(objRight < boxLeft || 
             objLeft > boxRight || 
             objBottom < boxTop || 
             objTop > boxBottom);
  }, []);

  /**
   * Finds all objects within a selection box
   */
  const findObjectsInSelectionBox = useCallback((box: { startX: number; startY: number; endX: number; endY: number }): string[] => {
    const objects = Object.entries(whiteboardStore.objects);
    const selectedIds: string[] = [];
    
    console.log('🎯 Finding objects in selection box:', box);
    
    for (const [id, obj] of objects) {
      // Skip eraser objects
      if (obj.data?.isEraser) {
        continue;
      }
      
      if (isObjectInSelectionBox(obj, box)) {
        selectedIds.push(id);
        console.log('✅ Object in selection box:', {
          id: id.slice(0, 8),
          type: obj.type,
          bounds: { x: obj.x, y: obj.y, width: obj.width, height: obj.height }
        });
      }
    }
    
    console.log('🎯 Found objects in selection box:', selectedIds.length);
    return selectedIds;
  }, [whiteboardStore.objects, isObjectInSelectionBox]);

  return {
    findObjectAt,
    findObjectsInSelectionBox,
    isObjectInSelectionBox,
    isPointInPath,
    isPointInRectangle,
    isPointInCircle,
    isPointInText,
    isPointInImage,
    isPointInComplexShape
  };
};
