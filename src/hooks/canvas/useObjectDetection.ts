
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

/**
 * Hook for detecting objects at coordinates with improved accuracy and performance
 */
export const useObjectDetection = () => {
  const whiteboardStore = useWhiteboardStore();

  /**
   * Checks if a point is inside a path using optimized detection methods
   */
  const isPointInPath = useCallback((pathString: string, x: number, y: number, strokeWidth: number = 2): boolean => {
    try {
      const path = new Path2D(pathString);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;

      // Optimized: Use smaller hit area for better performance
      ctx.lineWidth = Math.max(strokeWidth * 1.5, 8); // Reduced from strokeWidth * 2
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      const strokeHit = ctx.isPointInStroke(path, x, y);
      
      // Reduced fallback testing for performance
      if (!strokeHit) {
        const radius = Math.max(strokeWidth, 4); // Reduced from 6
        const testPoints = [
          { x: x - radius, y },
          { x: x + radius, y },
          { x, y: y - radius },
          { x, y: y + radius }
        ]; // Reduced from 8 test points to 4
        
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
    
    // Reduced padding for performance
    const padding = 3; // Reduced from 5
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
    const normalizedX = (x - centerX) / (radiusX + 3); // Reduced padding from 5 to 3
    const normalizedY = (y - centerY) / (radiusY + 3);
    
    return (normalizedX * normalizedX + normalizedY * normalizedY) <= 1;
  }, []);

  /**
   * Checks if a point is near text with improved hit area
   */
  const isPointInText = useCallback((obj: WhiteboardObject, x: number, y: number): boolean => {
    const fontSize = obj.data?.fontSize || 16;
    const textContent = obj.data?.content || '';
    
    // Optimized text width estimation
    const textWidth = Math.max(textContent.length * fontSize * 0.6, 15); // Slightly more conservative
    const textHeight = fontSize * 1.3; // Reduced multiplier
    const padding = 5; // Reduced padding from 8 to 5
    
    return x >= obj.x - padding && x <= obj.x + textWidth + padding &&
           y >= obj.y - fontSize - padding && y <= obj.y + textHeight - fontSize + padding;
  }, []);

  /**
   * Checks if a point is inside a complex shape
   */
  const isPointInComplexShape = useCallback((obj: WhiteboardObject, x: number, y: number): boolean => {
    if (!obj.width || !obj.height) return false;
    
    const padding = 3; // Reduced padding from 5 to 3
    
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
        // Simplified heart detection for performance
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
   * Finds the topmost object at the given coordinates with optimized detection
   */
  const findObjectAt = useCallback((x: number, y: number): string | null => {
    const objects = Object.entries(whiteboardStore.objects);
    
    // Reduced logging for performance
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
          isHit = isPointInText(obj, x, y);
          break;
        }
        
        case 'triangle':
        case 'diamond':
        case 'pentagon':
        case 'hexagon':
        case 'star':
        case 'heart': {
          isHit = isPointInComplexShape(obj, x, y);
          break;
        }
        
        default: {
          // Fallback for other types - reduced hit radius
          const hitRadius = 10; // Reduced from 15
          isHit = Math.abs(x - obj.x) <= hitRadius && Math.abs(y - obj.y) <= hitRadius;
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
  }, [whiteboardStore.objects, isPointInPath, isPointInRectangle, isPointInCircle, isPointInText, isPointInComplexShape]);

  return {
    findObjectAt,
    isPointInPath,
    isPointInRectangle,
    isPointInCircle,
    isPointInText,
    isPointInComplexShape
  };
};
