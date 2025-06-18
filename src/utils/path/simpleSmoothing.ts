import { Point } from './pathConversion';

/**
 * Subtle real-time path smoothing with light velocity awareness
 * Provides gentle smoothing for fast movements while maintaining responsiveness
 */

/**
 * Simple path builder with subtle velocity-aware smoothing
 */
export class SimplePathBuilder {
  private points: Point[] = [];
  private minDistance: number;
  private smoothingStrength: number;
  private lastVelocity: number = 0;
  
  constructor(minDistance: number = 1.5, smoothingStrength: number = 0.15) {
    this.minDistance = minDistance;
    this.smoothingStrength = smoothingStrength;
  }
  
  /**
   * Adds a new point with subtle velocity-aware smoothing
   */
  addPoint(point: Point): string {
    // Always add the first point
    if (this.points.length === 0) {
      this.points.push(point);
      return `M ${point.x} ${point.y}`;
    }
    
    // Calculate distance and velocity from last point
    const lastPoint = this.points[this.points.length - 1];
    const distance = Math.sqrt((point.x - lastPoint.x) ** 2 + (point.y - lastPoint.y) ** 2);
    
    // Light adaptive distance filtering
    const velocity = distance;
    const adaptiveMinDistance = this.minDistance * (1 + Math.min(velocity / 60, 0.3));
    
    if (distance < adaptiveMinDistance) {
      return this.getCurrentPath();
    }
    
    // Apply very subtle smoothing, slightly more for fast movements
    let smoothedPoint = point;
    if (this.points.length >= 2 && this.smoothingStrength > 0) {
      const prev1 = this.points[this.points.length - 1];
      
      // Light velocity boost - just a tiny bit more smoothing for fast movements
      const velocityFactor = Math.min(velocity / 30, 1);
      const dynamicSmoothing = this.smoothingStrength * (1 + velocityFactor * 0.2);
      
      // Simple 2-point averaging
      smoothedPoint = {
        x: point.x * (1 - dynamicSmoothing) + prev1.x * dynamicSmoothing,
        y: point.y * (1 - dynamicSmoothing) + prev1.y * dynamicSmoothing
      };
    }
    
    // Light velocity smoothing
    this.lastVelocity = this.lastVelocity * 0.8 + velocity * 0.2;
    
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
    this.lastVelocity = 0;
  }
  
  /**
   * Gets the current point count
   */
  getPointCount(): number {
    return this.points.length;
  }
}

/**
 * Light smoothing configurations
 */
export const getSmoothingConfig = (toolType: string) => {
  switch (toolType) {
    case 'brush':
      return { minDistance: 2, smoothingStrength: 0.2 }; // Just a touch more for brush
    case 'pencil':
      return { minDistance: 1.5, smoothingStrength: 0.15 }; // Very light
    case 'eraser':
      return { minDistance: 1, smoothingStrength: 0 }; // No smoothing for eraser
    default:
      return { minDistance: 1.5, smoothingStrength: 0.15 };
  }
};
