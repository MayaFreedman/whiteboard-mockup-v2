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
 * Calculates the collective bounding box for a group of objects
 * Returns the overall bounds that encompass all objects in the group
 */
export function calculateGroupBoundingBox(
  objects: WhiteboardObject[]
): { x: number; y: number; width: number; height: number } {
  if (objects.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  // Get bounding boxes for all objects
  const boundingBoxes = objects.map(obj => getObjectBoundingBox(obj));
  
  // Find the collective bounds
  const minX = Math.min(...boundingBoxes.map(box => box.x));
  const minY = Math.min(...boundingBoxes.map(box => box.y));
  const maxX = Math.max(...boundingBoxes.map(box => box.x + box.width));
  const maxY = Math.max(...boundingBoxes.map(box => box.y + box.height));
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

/**
 * Constrains a group movement delta to keep all objects within canvas bounds
 * Returns the constrained delta that should be applied to all objects in the group
 */
export function constrainGroupToBounds(
  objects: WhiteboardObject[],
  proposedDelta: { x: number; y: number },
  canvasBounds: CanvasBounds
): { x: number; y: number } {
  if (objects.length === 0) {
    return proposedDelta;
  }

  // Calculate the group's current bounding box
  const groupBounds = calculateGroupBoundingBox(objects);
  
  // Calculate the proposed new position for the group
  const proposedGroupPosition = {
    x: groupBounds.x + proposedDelta.x,
    y: groupBounds.y + proposedDelta.y
  };
  
  // Constrain the group position to canvas bounds
  const constrainedGroupPosition = constrainObjectToBounds(
    proposedGroupPosition,
    { width: groupBounds.width, height: groupBounds.height },
    canvasBounds
  );
  
  // Calculate the constrained delta
  return {
    x: constrainedGroupPosition.x - groupBounds.x,
    y: constrainedGroupPosition.y - groupBounds.y
  };
}

/**
 * Constrains a whiteboard object's position to canvas bounds
 * High-level utility that combines position constraint with object bounding box handling
 */
export function constrainWhiteboardObjectToBounds(
  position: Position,
  obj: WhiteboardObject,
  canvasBounds: CanvasBounds
): Position {
  // Get the actual bounding box for this object
  const boundingBox = getObjectBoundingBox(obj);
  
  // Calculate the offset between the object's position and its bounding box
  const offsetX = boundingBox.x - obj.x;
  const offsetY = boundingBox.y - obj.y;
  
  // Constrain the bounding box position
  const constrainedBoundingPos = constrainObjectToBounds(
    { x: position.x + offsetX, y: position.y + offsetY },
    { width: boundingBox.width, height: boundingBox.height },
    canvasBounds
  );
  
  // Return the object position that results in the constrained bounding box
  return {
    x: constrainedBoundingPos.x - offsetX,
    y: constrainedBoundingPos.y - offsetY
  };
}