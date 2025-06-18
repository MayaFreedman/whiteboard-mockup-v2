
import { Point } from './pathConversion';

/**
 * Real-time curve smoothing for drawing applications
 * Converts linear paths to smooth quadratic Bézier curves
 */

/**
 * Converts a series of points to a smooth SVG path using quadratic Bézier curves
 * @param points - Array of points representing the drawing path
 * @param smoothingFactor - How aggressive the smoothing should be (0-1)
 * @returns Smooth SVG path string with Q commands
 */
export const pointsToSmoothPath = (points: Point[], smoothingFactor: number = 0.4): string => {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;
  
  // For 3 points, create a simple curve
  if (points.length === 3) {
    const controlPoint = calculateControlPoint(points[0], points[1], points[2], smoothingFactor);
    path += ` Q ${controlPoint.x} ${controlPoint.y} ${points[2].x} ${points[2].y}`;
    return path;
  }

  // For more points, create a series of smooth curves
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const current = points[i];
    const next = points[i + 1];
    
    const controlPoint = calculateControlPoint(prev, current, next, smoothingFactor);
    
    if (i === 1) {
      // First curve - from start point to second point
      path += ` Q ${controlPoint.x} ${controlPoint.y} ${current.x} ${current.y}`;
    } else {
      // Subsequent curves
      path += ` T ${current.x} ${current.y}`;
    }
  }
  
  // Add the final point
  const lastPoint = points[points.length - 1];
  path += ` T ${lastPoint.x} ${lastPoint.y}`;
  
  return path;
};

/**
 * Calculates a control point for smooth curve transitions
 * @param prev - Previous point
 * @param current - Current point  
 * @param next - Next point
 * @param smoothingFactor - How much to smooth (0-1)
 * @returns Control point for quadratic curve
 */
const calculateControlPoint = (prev: Point, current: Point, next: Point, smoothingFactor: number): Point => {
  // Calculate the direction vectors
  const prevVector = { x: current.x - prev.x, y: current.y - prev.y };
  const nextVector = { x: next.x - current.x, y: next.y - current.y };
  
  // Calculate the average direction
  const avgDirection = {
    x: (prevVector.x + nextVector.x) * 0.5,
    y: (prevVector.y + nextVector.y) * 0.5
  };
  
  // Apply smoothing factor to offset from current point
  const controlOffset = {
    x: avgDirection.x * smoothingFactor,
    y: avgDirection.y * smoothingFactor
  };
  
  return {
    x: current.x + controlOffset.x,
    y: current.y + controlOffset.y
  };
};

/**
 * Converts an existing linear SVG path to a smooth curved path
 * @param pathString - Linear SVG path with M and L commands
 * @param smoothingFactor - How much to smooth (0-1)
 * @returns Smooth curved SVG path
 */
export const linearPathToSmoothPath = (pathString: string, smoothingFactor: number = 0.4): string => {
  const points = extractPointsFromPath(pathString);
  if (points.length < 3) return pathString; // Not enough points to smooth
  
  return pointsToSmoothPath(points, smoothingFactor);
};

/**
 * Extracts points from an SVG path string
 * @param pathString - SVG path string
 * @returns Array of points
 */
const extractPointsFromPath = (pathString: string): Point[] => {
  const points: Point[] = [];
  const commands = pathString.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi) || [];
  
  commands.forEach(command => {
    const type = command[0].toUpperCase();
    const coords = command.slice(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
    
    if ((type === 'M' || type === 'L') && coords.length >= 2) {
      points.push({ x: coords[0], y: coords[1] });
    }
  });
  
  return points;
};

/**
 * Real-time curve builder for incremental drawing
 * Maintains smooth curves as points are added during drawing
 */
export class RealTimeCurveBuilder {
  private points: Point[] = [];
  private smoothingFactor: number;
  
  constructor(smoothingFactor: number = 0.4) {
    this.smoothingFactor = smoothingFactor;
  }
  
  /**
   * Adds a new point and returns the updated smooth path
   * @param point - New point to add
   * @returns Updated smooth SVG path
   */
  addPoint(point: Point): string {
    this.points.push(point);
    return this.getCurrentPath();
  }
  
  /**
   * Gets the current smooth path
   * @returns Smooth SVG path string
   */
  getCurrentPath(): string {
    return pointsToSmoothPath(this.points, this.smoothingFactor);
  }
  
  /**
   * Resets the builder for a new drawing
   */
  reset(): void {
    this.points = [];
  }
  
  /**
   * Gets the current point count
   */
  getPointCount(): number {
    return this.points.length;
  }
}
