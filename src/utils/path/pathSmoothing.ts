
import { Point } from './pathConversion';
import { interpolatePoints } from './pathInterpolation';

/**
 * Simple path smoothing utilities for drawing
 */

/**
 * Smooths a path by interpolating points and applying basic curve fitting
 * @param points - Array of points representing the path
 * @param smoothingFactor - How much smoothing to apply (0-1, where 0 = no smoothing)
 * @returns Smoothed SVG path string
 */
export const smoothPath = (points: Point[], smoothingFactor: number = 0.5): string => {
  if (points.length < 2) return '';
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  
  // First, interpolate points to ensure density
  const interpolatedPoints = interpolatePointsForSmoothing(points);
  
  if (smoothingFactor === 0 || interpolatedPoints.length < 3) {
    // No smoothing, return linear path
    let path = `M ${interpolatedPoints[0].x} ${interpolatedPoints[0].y}`;
    for (let i = 1; i < interpolatedPoints.length; i++) {
      path += ` L ${interpolatedPoints[i].x} ${interpolatedPoints[i].y}`;
    }
    return path;
  }
  
  // Apply quadratic curve smoothing
  return createSmoothCurvePath(interpolatedPoints, smoothingFactor);
};

/**
 * Interpolates points to ensure adequate density for smoothing
 */
const interpolatePointsForSmoothing = (points: Point[]): Point[] => {
  const result: Point[] = [points[0]];
  
  for (let i = 1; i < points.length; i++) {
    const interpolated = interpolatePoints(points[i - 1], points[i], 8); // Max 8px between points
    result.push(...interpolated.slice(1)); // Skip first point to avoid duplicates
  }
  
  return result;
};

/**
 * Creates a smooth curve path using quadratic Bézier curves
 */
const createSmoothCurvePath = (points: Point[], smoothingFactor: number): string => {
  if (points.length < 3) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  
  let path = `M ${points[0].x} ${points[0].y}`;
  
  // Use quadratic curves for smoothing
  for (let i = 1; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    
    // Calculate control point for smooth curve
    const controlX = current.x + (next.x - current.x) * smoothingFactor * 0.5;
    const controlY = current.y + (next.y - current.y) * smoothingFactor * 0.5;
    
    path += ` Q ${controlX} ${controlY} ${next.x} ${next.y}`;
  }
  
  return path;
};

/**
 * Real-time path smoothing for drawing preview
 * Applies minimal smoothing to maintain responsiveness
 */
export const smoothDrawingPath = (pathString: string): string => {
  if (!pathString.includes('L')) return pathString; // Already smooth or too short
  
  // Extract points from path
  const commands = pathString.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi) || [];
  const points: Point[] = [];
  
  commands.forEach(command => {
    const type = command[0].toUpperCase();
    const coords = command.slice(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
    
    if ((type === 'M' || type === 'L') && coords.length >= 2) {
      points.push({ x: coords[0], y: coords[1] });
    }
  });
  
  // Apply light smoothing for real-time drawing
  return smoothPath(points, 0.3); // Light smoothing to maintain responsiveness
};
