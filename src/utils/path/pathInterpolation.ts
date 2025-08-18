
import { Point } from './pathConversion';
import { debugLog } from '../../config/devMode';

/**
 * Interpolates points between two points to ensure continuous coverage
 * @param point1 - Start point
 * @param point2 - End point
 * @param maxDistance - Maximum distance between interpolated points
 * @returns Array of interpolated points including start and end
 */
export const interpolatePoints = (point1: Point, point2: Point, maxDistance: number = 5): Point[] => {
  const distance = Math.sqrt((point2.x - point1.x) ** 2 + (point2.y - point1.y) ** 2);
  
  if (distance <= maxDistance) {
    return [point1, point2];
  }
  
  const steps = Math.ceil(distance / maxDistance);
  const points: Point[] = [point1];
  
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    points.push({
      x: point1.x + (point2.x - point1.x) * t,
      y: point1.y + (point2.y - point1.y) * t
    });
  }
  
  points.push(point2);
  return points;
};

/**
 * Enhanced interpolation for eraser-size-adaptive point density
 * Creates ultra-dense points for small erasers to ensure detection
 * @param points - Original path points
 * @param maxDistance - Maximum distance between points
 * @returns Array of points with interpolated points added
 */
export const interpolatePathPoints = (points: Point[], maxDistance: number = 3): Point[] => {
  if (points.length < 2) return points;
  
  const interpolatedPoints: Point[] = [points[0]];
  
  for (let i = 1; i < points.length; i++) {
    const interpolated = interpolatePoints(points[i - 1], points[i], maxDistance);
    // Skip the first point since it's already in the array
    interpolatedPoints.push(...interpolated.slice(1));
  }
  
  return interpolatedPoints;
};

/**
 * Pre-processes long line segments by breaking them into smaller chunks
 * This ensures small erasers can detect paths with large gaps between points
 * @param points - Original path points
 * @param minEraserRadius - Smallest eraser radius for scaling
 * @returns Array of points with additional breakdown points
 */
export const preprocessPathForSmallErasers = (points: Point[], minEraserRadius: number): Point[] => {
  if (points.length < 2 || minEraserRadius >= 15) return points;
  
  // For very small erasers, break segments into even tinier chunks
  const maxSegmentLength = Math.max(0.5, minEraserRadius / 3);
  
  debugLog(`🔧 Pre-processing path for small eraser (${minEraserRadius}px radius):`, {
    originalPoints: points.length,
    maxSegmentLength
  });
  
  const processedPoints: Point[] = [points[0]];
  
  for (let i = 1; i < points.length; i++) {
    const distance = Math.sqrt(
      (points[i].x - points[i-1].x) ** 2 + 
      (points[i].y - points[i-1].y) ** 2
    );
    
    if (distance > maxSegmentLength) {
      // Break this segment into smaller pieces
      const steps = Math.ceil(distance / maxSegmentLength);
      for (let j = 1; j < steps; j++) {
        const t = j / steps;
        processedPoints.push({
          x: points[i-1].x + (points[i].x - points[i-1].x) * t,
          y: points[i-1].y + (points[i].y - points[i-1].y) * t
        });
      }
    }
    
    processedPoints.push(points[i]);
  }
  
  debugLog(`🔧 Path pre-processing complete:`, {
    originalPoints: points.length,
    processedPoints: processedPoints.length,
    pointsAdded: processedPoints.length - points.length
  });
  
  return processedPoints;
};
