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
  const width = obj.width || 50; // Fallback for paths or undefined width
  const height = obj.height || 50; // Fallback for paths or undefined height
  
  return { width, height };
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