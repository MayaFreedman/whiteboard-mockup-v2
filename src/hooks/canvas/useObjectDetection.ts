import { useCallback } from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { WhiteboardObject } from '../../types/whiteboard';

/**
 * Custom hook for detecting objects at specific coordinates
 * Handles hit testing for all whiteboard object types
 */
export const useObjectDetection = () => {
  const objects = useWhiteboardStore((state) => state.objects);

  /**
   * Finds the topmost object at the given coordinates
   * @param x - X coordinate to test
   * @param y - Y coordinate to test
   * @returns Object ID if found, null otherwise
   */
  const findObjectAt = useCallback((x: number, y: number): string | null => {
    const objectEntries = Object.entries(objects);
    
    // Sort by creation time (newest first for top-down hit testing)
    objectEntries.sort(([, a], [, b]) => b.createdAt - a.createdAt);

    for (const [id, obj] of objectEntries) {
      if (isPointInObject(x, y, obj)) {
        console.log('🎯 Object detected at coordinates:', { x, y, objectId: id.slice(0, 8), type: obj.type });
        return id;
      }
    }

    return null;
  }, [objects]);

  /**
   * Checks if a point is inside a whiteboard object
   * @param x - X coordinate to test
   * @param y - Y coordinate to test  
   * @param obj - Whiteboard object to test against
   * @returns True if point is inside object
   */
  const isPointInObject = useCallback((x: number, y: number, obj: WhiteboardObject): boolean => {
    switch (obj.type) {
      case 'path': {
        // Path hit testing (simplified - consider improving precision)
        return (
          x >= obj.x &&
          x <= obj.x + 10 &&
          y >= obj.y &&
          y <= obj.y + 10
        );
      }

      case 'rectangle': {
        if (!obj.width || !obj.height) return false;
        
        // Simple rectangular hit testing
        return (
          x >= obj.x &&
          x <= obj.x + obj.width &&
          y >= obj.y &&
          y <= obj.y + obj.height
        );
      }

      case 'circle': {
        if (!obj.width || !obj.height) return false;
        
        // Ellipse hit testing (approximate)
        const centerX = obj.x + obj.width / 2;
        const centerY = obj.y + obj.height / 2;
        const normX = (x - centerX) / (obj.width / 2);
        const normY = (y - centerY) / (obj.height / 2);
        return normX * normX + normY * normY <= 1;
      }

      case 'triangle': {
        if (!obj.width || !obj.height) return false;
        
        // Triangle hit testing (simplified - consider improving precision)
        return (
          x >= obj.x &&
          x <= obj.x + obj.width &&
          y >= obj.y &&
          y <= obj.y + obj.height
        );
      }

      case 'diamond': {
        if (!obj.width || !obj.height) return false;
        
        // Diamond hit testing (simplified - consider improving precision)
        return (
          x >= obj.x &&
          x <= obj.x + obj.width &&
          y >= obj.y &&
          y <= obj.y + obj.height
        );
      }

      case 'pentagon': {
        if (!obj.width || !obj.height) return false;
        
        // Pentagon hit testing (simplified - consider improving precision)
        return (
          x >= obj.x &&
          x <= obj.x + obj.width &&
          y >= obj.y &&
          y <= obj.y + obj.height
        );
      }

      case 'hexagon': {
        if (!obj.width || !obj.height) return false;
        
        // Hexagon hit testing (simplified - consider improving precision)
        return (
          x >= obj.x &&
          x <= obj.x + obj.width &&
          y >= obj.y &&
          y <= obj.y + obj.height
        );
      }

      case 'star': {
        if (!obj.width || !obj.height) return false;
        
        // Star hit testing (simplified - consider improving precision)
        return (
          x >= obj.x &&
          x <= obj.x + obj.width &&
          y >= obj.y &&
          y <= obj.y + obj.height
        );
      }

      case 'heart': {
        if (!obj.width || !obj.height) return false;
        
        // Heart hit testing (simplified - consider improving precision)
        return (
          x >= obj.x &&
          x <= obj.x + obj.width &&
          y >= obj.y &&
          y <= obj.y + obj.height
        );
      }

      case 'text': {
        if (!obj.width || !obj.height) return false;
        
        // Simple rectangular hit testing for text
        return (
          x >= obj.x &&
          x <= obj.x + obj.width &&
          y >= obj.y &&
          y <= obj.y + obj.height
        );
      }

      case 'stamp': {
        if (!obj.width || !obj.height) return false;
        
        // Simple rectangular hit testing for stamps
        return (
          x >= obj.x &&
          x <= obj.x + obj.width &&
          y >= obj.y &&
          y <= obj.y + obj.height
        );
      }

      default:
        return false;
    }
  }, []);

  /**
   * Gets the bounds of an object for selection highlighting
   * @param obj - Whiteboard object
   * @returns Bounding rectangle coordinates
   */
  const getObjectBounds = useCallback((obj: WhiteboardObject) => {
    switch (obj.type) {
      case 'path': {
        return {
          x: obj.x,
          y: obj.y,
          width: 10,
          height: 10
        };
      }

      case 'rectangle': {
        return {
          x: obj.x,
          y: obj.y,
          width: obj.width || 80,
          height: obj.height || 50
        };
      }

      case 'circle': {
        return {
          x: obj.x,
          y: obj.y,
          width: obj.width || 80,
          height: obj.height || 50
        };
      }

      case 'triangle': {
        return {
          x: obj.x,
          y: obj.y,
          width: obj.width || 80,
          height: obj.height || 50
        };
      }

      case 'diamond': {
        return {
          x: obj.x,
          y: obj.y,
          width: obj.width || 80,
          height: obj.height || 50
        };
      }

      case 'pentagon': {
        return {
          x: obj.x,
          y: obj.y,
          width: obj.width || 80,
          height: obj.height || 50
        };
      }

      case 'hexagon': {
        return {
          x: obj.x,
          y: obj.y,
          width: obj.width || 80,
          height: obj.height || 50
        };
      }

      case 'star': {
        return {
          x: obj.x,
          y: obj.y,
          width: obj.width || 80,
          height: obj.height || 50
        };
      }

      case 'heart': {
        return {
          x: obj.x,
          y: obj.y,
          width: obj.width || 80,
          height: obj.height || 50
        };
      }

      case 'text': {
        return {
          x: obj.x,
          y: obj.y,
          width: obj.width || 150,
          height: obj.height || 40
        };
      }

      case 'stamp': {
        return {
          x: obj.x,
          y: obj.y,
          width: obj.width || 80,
          height: obj.height || 80
        };
      }

      default:
        return {
          x: obj.x,
          y: obj.y,
          width: obj.width || 0,
          height: obj.height || 0
        };
    }
  }, []);

  return {
    findObjectAt,
    isPointInObject,
    getObjectBounds
  };
};
