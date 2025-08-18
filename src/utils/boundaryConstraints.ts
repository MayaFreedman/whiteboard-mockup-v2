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
 * Gets the bounding box that encompasses all objects in a group
 * Returns the leftmost, topmost, rightmost, and bottommost coordinates
 */
export function getGroupBoundingBox(objects: WhiteboardObject[]): { x: number; y: number; width: number; height: number } {
  if (objects.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  // Get bounding boxes for all objects
  const boundingBoxes = objects.map(obj => {
    const box = getObjectBoundingBox(obj);
    console.log('🔍 GROUP BOUNDS: Object', obj.id?.slice(0, 8), 'box:', box, 'position:', { x: obj.x, y: obj.y });
    return box;
  });
  
  // Find extreme coordinates
  const leftmost = Math.min(...boundingBoxes.map(box => box.x));
  const topmost = Math.min(...boundingBoxes.map(box => box.y));
  const rightmost = Math.max(...boundingBoxes.map(box => box.x + box.width));
  const bottommost = Math.max(...boundingBoxes.map(box => box.y + box.height));
  
  const groupBounds = {
    x: leftmost,
    y: topmost,
    width: rightmost - leftmost,
    height: bottommost - topmost
  };
  
  console.log('🔍 GROUP BOUNDS: Final group bounding box:', groupBounds, 'from', objects.length, 'objects');
  return groupBounds;
}

/**
 * Constrains a group of objects' movement to canvas bounds
 * Returns the constrained deltas that keep the entire group within bounds
 */
export function constrainGroupToBounds(
  deltaX: number,
  deltaY: number,
  objects: WhiteboardObject[],
  canvasBounds: CanvasBounds
): { x: number; y: number } {
  if (objects.length === 0) {
    console.warn('🚨 GROUP CONSTRAINT: No objects provided');
    return { x: deltaX, y: deltaY };
  }

  // Get the current group bounding box
  const groupBounds = getGroupBoundingBox(objects);
  console.log('🎯 GROUP CONSTRAINT: Current group bounds:', groupBounds);
  
  // Calculate the new position with the proposed deltas
  const newGroupPosition = {
    x: groupBounds.x + deltaX,
    y: groupBounds.y + deltaY
  };
  console.log('🎯 GROUP CONSTRAINT: Proposed new position:', newGroupPosition, 'with deltas:', { deltaX, deltaY });

  // Apply boundary constraints to the group bounding box
  const constrainedGroupPos = constrainObjectToBounds(
    newGroupPosition,
    { width: groupBounds.width, height: groupBounds.height },
    canvasBounds
  );
  console.log('🎯 GROUP CONSTRAINT: Constrained position:', constrainedGroupPos);
  console.log('🎯 GROUP CONSTRAINT: Canvas bounds:', canvasBounds);

  // Calculate the constrained deltas
  const constrainedDeltas = {
    x: constrainedGroupPos.x - groupBounds.x,
    y: constrainedGroupPos.y - groupBounds.y
  };
  
  console.log('🎯 GROUP CONSTRAINT: Final deltas:', {
    original: { x: deltaX, y: deltaY },
    constrained: constrainedDeltas,
    difference: { 
      x: constrainedDeltas.x - deltaX, 
      y: constrainedDeltas.y - deltaY 
    }
  });

  return constrainedDeltas;
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