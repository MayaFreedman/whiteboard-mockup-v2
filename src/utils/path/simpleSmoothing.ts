
import { Point } from './pathConversion';

/**
 * Simple real-time path smoothing using point averaging
 * Designed to reduce jaggedness without causing oscillations
 */

/**
 * Simple real-time path builder that smooths points as they are added
 * Uses basic point averaging and distance filtering for stable results
 */
export class SimplePathBuilder {
  private points: Point[] = [];
  private minDistance: number;
  private smoothingStrength: number;
  
  constructor(minDistance: number = 2, smoothingStrength: number = 0.2) {
    this.minDistance = minDistance;
    this.smoothingStrength = smoothingStrength; // 0-1, how much to smooth
  }
  
  /**
   * Adds a new point with distance filtering and simple smoothing
   * @param point - New point to add (relative coordinates)
   * @returns Updated SVG path string
   */
  addPoint(point: Point): string {
    // Always add the first point
    if (this.points.length === 0) {
      this.points.push(point);
      return `M ${point.x} ${point.y}`;
    }
    
    // Check distance from last point to avoid adding too many close points
    const lastPoint = this.points[this.points.length - 1];
    const distance = Math.sqrt((point.x - lastPoint.x) ** 2 + (point.y - lastPoint.y) ** 2);
    
    if (distance < this.minDistance) {
      return this.getCurrentPath(); // Don't add point, return current path
    }
    
    // Apply simple smoothing if we have previous points
    let smoothedPoint = point;
    if (this.points.length >= 2 && this.smoothingStrength > 0) {
      const prev2 = this.points[this.points.length - 2];
      const prev1 = this.points[this.points.length - 1];
      
      // Simple 3-point moving average
      smoothedPoint = {
        x: point.x * (1 - this.smoothingStrength) + 
           (prev1.x + prev2.x) * 0.5 * this.smoothingStrength,
        y: point.y * (1 - this.smoothingStrength) + 
           (prev1.y + prev2.y) * 0.5 * this.smoothingStrength
      };
    }
    
    this.points.push(smoothedPoint);
    return this.getCurrentPath();
  }
  
  /**
   * Gets the current path as simple linear segments
   * @returns SVG path string with M and L commands only
   */
  getCurrentPath(): string {
    if (this.points.length === 0) return '';
    if (this.points.length === 1) return `M ${this.points[0].x} ${this.points[0].y}`;
    
    let path = `M ${this.points[0].x} ${this.points[0].y}`;
    for (let i = 1; i < this.points.length; i++) {
      path += ` L ${this.points[i].x} ${this.points[i].y}`;
    }
    
    return path;
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

/**
 * Calculates appropriate smoothing parameters based on tool type
 * @param toolType - The drawing tool being used
 * @returns Configuration for the path builder
 */
export const getSmoothingConfig = (toolType: string) => {
  switch (toolType) {
    case 'brush':
      return { minDistance: 3, smoothingStrength: 0.3 }; // More smoothing for brush
    case 'pencil':
      return { minDistance: 2, smoothingStrength: 0.15 }; // Light smoothing for pencil
    case 'eraser':
      return { minDistance: 1, smoothingStrength: 0 }; // No smoothing for eraser
    default:
      return { minDistance: 2, smoothingStrength: 0.2 };
  }
};
