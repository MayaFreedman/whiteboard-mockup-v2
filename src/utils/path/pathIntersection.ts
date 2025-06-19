import { Point } from './pathConversion';

/**
 * Checks if a point is within a circle (eraser area) with proper stroke width compensation
 * @param point - Point to check
 * @param centerX - Circle center X
 * @param centerY - Circle center Y
 * @param radius - Circle radius
 * @param strokeWidth - Stroke width of the target line (optional)
 * @returns True if point is within the circle
 */
export const isPointInCircle = (point: Point, centerX: number, centerY: number, radius: number, strokeWidth: number = 0): boolean => {
  const distance = Math.sqrt((point.x - centerX) ** 2 + (point.y - centerY) ** 2);
  
  // Restore effective stroke compensation - removed overly conservative size ratio logic
  const strokeCompensation = strokeWidth * 0.5; // Restored from the toned-down 0.1-0.3 range
  const effectiveRadius = radius + strokeCompensation;
  
  return distance <= effectiveRadius;
};

/**
 * Calculates the shortest distance from a point to a line segment
 * @param point - The point to check
 * @param lineStart - Start point of the line segment
 * @param lineEnd - End point of the line segment
 * @returns Distance from point to line segment
 */
export const distanceFromPointToLineSegment = (point: Point, lineStart: Point, lineEnd: Point): number => {
  const A = point.x - lineStart.x;
  const B = point.y - lineStart.y;
  const C = lineEnd.x - lineStart.x;
  const D = lineEnd.y - lineStart.y;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  
  if (lenSq === 0) {
    // Line segment is actually a point
    return Math.sqrt(A * A + B * B);
  }
  
  let param = dot / lenSq;
  
  let xx: number, yy: number;
  
  if (param < 0) {
    xx = lineStart.x;
    yy = lineStart.y;
  } else if (param > 1) {
    xx = lineEnd.x;
    yy = lineEnd.y;
  } else {
    xx = lineStart.x + param * C;
    yy = lineStart.y + param * D;
  }
  
  const dx = point.x - xx;
  const dy = point.y - yy;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Checks if a line segment intersects with a circle (eraser area) with proper stroke width compensation
 * @param lineStart - Start point of the line segment
 * @param lineEnd - End point of the line segment
 * @param centerX - Circle center X
 * @param centerY - Circle center Y
 * @param radius - Circle radius
 * @param strokeWidth - Stroke width of the target line (optional)
 * @returns True if line segment intersects the circle
 */
export const lineSegmentIntersectsCircle = (
  lineStart: Point, 
  lineEnd: Point, 
  centerX: number, 
  centerY: number, 
  radius: number,
  strokeWidth: number = 0
): boolean => {
  const center = { x: centerX, y: centerY };
  const distance = distanceFromPointToLineSegment(center, lineStart, lineEnd);
  
  // Restore effective stroke compensation
  const strokeCompensation = strokeWidth * 0.5; // Restored from the toned-down 0.1-0.3 range
  const effectiveRadius = radius + strokeCompensation;
  
  return distance <= effectiveRadius;
};
