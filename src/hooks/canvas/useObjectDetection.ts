
import { useCallback } from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { WhiteboardObject } from '../../types/whiteboard';

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
   * Checks if a point is inside a circle with padding
   */
  const isPointInCircle = useCallback((obj: WhiteboardObject, x: number, y: number): boolean => {
    if (!obj.width) return false;
    
    const radius = obj.width / 2;
    const centerX = obj.x + radius;
    const centerY = obj.y + radius;
    const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
    
    // Add 5px padding for easier selection
    return distance <= radius + 5;
  }, []);

  /**
   * Checks if a point is near text with improved hit area
   */
  const isPointInText = useCallback((obj: WhiteboardObject, x: number, y: number): boolean => {
    const fontSize = obj.data?.fontSize || 16;
    const textContent = obj.data?.content || '';
    
    // Improved text width estimation and generous hit area
    const textWidth = Math.max(textContent.length * fontSize * 0.7, 20); // More accurate estimation
    const textHeight = fontSize * 1.5; // Account for line height
    const padding = 8; // Generous padding for text selection
    
    return x >= obj.x - padding && x <= obj.x + textWidth + padding &&
           y >= obj.y - fontSize - padding && y <= obj.y + textHeight - fontSize + padding;
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
            center: { x: obj.x + (obj.width || 0) / 2, y: obj.y + (obj.width || 0) / 2 },
            radius: (obj.width || 0) / 2,
            isHit
          });
          break;
        }
        
        case 'text': {
          isHit = isPointInText(obj, x, y);
          console.log('📝 Text hit test:', {
            id: id.slice(0, 8),
            position: { x: obj.x, y: obj.y },
            content: obj.data?.content,
            isHit
          });
          break;
        }
        
        default: {
          // Fallback for other types - use a larger hit area around the point
          const hitRadius = 15; // Increased from 10px
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
  }, [whiteboardStore.objects, isPointInPath, isPointInRectangle, isPointInCircle, isPointInText]);

  return {
    findObjectAt,
    isPointInPath,
    isPointInRectangle,
    isPointInCircle,
    isPointInText
  };
};
