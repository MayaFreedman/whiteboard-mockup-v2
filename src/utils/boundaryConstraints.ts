import { WhiteboardObject } from '../types/whiteboard';
import { pathToPoints } from './path/pathConversion';

interface Position {
  x: number;
  y: number;
}

interface Dimensions {
  width: number;
  height: number;
}

interface CanvasBounds {
  width: number;
  height: number;
}

/**
 * Constrains an object's position to stay within canvas bounds
 * Ensures no part of the object's bounding box goes off-screen
 * Includes a small margin to prevent objects from touching edges
 */
export function constrainObjectToBounds(
  position: Position,
  objectDimensions: Dimensions,
  canvasBounds: CanvasBounds,
  margin: number = 2
): Position {
  const { x, y } = position;
  const { width, height } = objectDimensions;
  const { width: canvasWidth, height: canvasHeight } = canvasBounds;

  // Calculate constrained position with margin
  const constrainedX = Math.max(margin, Math.min(x, canvasWidth - width - margin));
  const constrainedY = Math.max(margin, Math.min(y, canvasHeight - height - margin));

  return {
    x: constrainedX,
    y: constrainedY
  };
}

/**
 * Gets the effective dimensions and position of a whiteboard object for boundary calculations
 * Handles different object types and provides fallback dimensions
 */
export function getObjectDimensions(obj: WhiteboardObject): Dimensions {
  // For path objects, calculate bounding box from path data
  if (obj.type === 'path' && obj.data?.path) {
    try {
      const pathString = obj.data.path;
      const points = pathToPoints(pathString);
      
      if (points.length > 0) {
        const xs = points.map(p => p.x);
        const ys = points.map(p => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        
        // Add stroke width padding for hit detection
        const strokePadding = (obj.strokeWidth || 2) * 2;
        
        return {
          width: Math.max(maxX - minX + strokePadding, 20),
          height: Math.max(maxY - minY + strokePadding, 20)
        };
      }
    } catch (error) {
      console.warn('Error calculating path dimensions:', error);
    }
  }
  
  // For other objects, use explicit dimensions or fallback
  const width = obj.width || 50;
  const height = obj.height || 50;
  
  return { width, height };
}

/**
 * Gets the effective bounding box for a whiteboard object
 * Returns both position and dimensions for accurate bounding box placement
 */
export function getObjectBoundingBox(obj: WhiteboardObject): { x: number; y: number; width: number; height: number } {
  // For path objects, calculate bounding box from path data
  if (obj.type === 'path' && obj.data?.path) {
    try {
      const pathString = obj.data.path;
      const points = pathToPoints(pathString);
      
      if (points.length > 0) {
        const xs = points.map(p => p.x);
        const ys = points.map(p => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        
        // Add stroke width padding for hit detection
        const strokePadding = (obj.strokeWidth || 2) / 2;
        
        return {
          x: obj.x + minX - strokePadding,
          y: obj.y + minY - strokePadding,
          width: Math.max(maxX - minX + strokePadding * 2, 20),
          height: Math.max(maxY - minY + strokePadding * 2, 20)
        };
      }
    } catch (error) {
      console.warn('Error calculating path bounding box:', error);
    }
  }
  
  // For other objects, use explicit dimensions or fallback
  const width = obj.width || 50;
  const height = obj.height || 50;
  
  return {
    x: obj.x,
    y: obj.y,
    width,
    height
  };
}

/**
 * Constrains a whiteboard object's position to canvas bounds
 * High-level utility that combines position constraint with object dimension handling
 */
export function constrainWhiteboardObjectToBounds(
  position: Position,
  obj: WhiteboardObject,
  canvasBounds: CanvasBounds
): Position {
  const dimensions = getObjectDimensions(obj);
  return constrainObjectToBounds(position, dimensions, canvasBounds);
}