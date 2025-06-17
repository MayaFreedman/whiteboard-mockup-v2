
import { useCallback } from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { WhiteboardObject } from '../../types/whiteboard';

/**
 * Hook for detecting objects at coordinates
 */
export const useObjectDetection = () => {
  const whiteboardStore = useWhiteboardStore();

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

  return {
    findObjectAt,
    isPointInPath,
    isPointInRectangle,
    isPointInCircle
  };
};
