import { WhiteboardObject } from '../types/whiteboard';

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
 * Gets the effective dimensions of a whiteboard object for boundary calculations
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

// Helper function to extract points from SVG path string
function pathToPoints(pathString: string): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const commands = pathString.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi);
  
  if (!commands) return points;
  
  let currentX = 0;
  let currentY = 0;
  
  commands.forEach(command => {
    const type = command[0].toUpperCase();
    const args = command.slice(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
    
    switch (type) {
      case 'M': // Move to
        if (args.length >= 2) {
          currentX = args[0];
          currentY = args[1];
          points.push({ x: currentX, y: currentY });
        }
        break;
      case 'L': // Line to
        if (args.length >= 2) {
          currentX = args[0];
          currentY = args[1];
          points.push({ x: currentX, y: currentY });
        }
        break;
      case 'H': // Horizontal line
        if (args.length >= 1) {
          currentX = args[0];
          points.push({ x: currentX, y: currentY });
        }
        break;
      case 'V': // Vertical line
        if (args.length >= 1) {
          currentY = args[0];
          points.push({ x: currentX, y: currentY });
        }
        break;
      case 'C': // Cubic bezier
        for (let i = 0; i < args.length; i += 6) {
          if (i + 5 < args.length) {
            points.push({ x: args[i], y: args[i + 1] });
            points.push({ x: args[i + 2], y: args[i + 3] });
            currentX = args[i + 4];
            currentY = args[i + 5];
            points.push({ x: currentX, y: currentY });
          }
        }
        break;
    }
  });
  
  return points;
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