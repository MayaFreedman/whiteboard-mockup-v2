
import { Point } from './pathConversion';

/**
 * Enhanced real-time path smoothing with stronger velocity awareness
 * Provides more aggressive smoothing for fast movements while maintaining responsiveness
 */

/**
 * Simple path builder with enhanced velocity-aware smoothing
 */
export class SimplePathBuilder {
  private points: Point[] = [];
  private minDistance: number;
  private smoothingStrength: number;
  private lastVelocity: number = 0;
  
  constructor(minDistance: number = 1.5, smoothingStrength: number = 0.25) {
    this.minDistance = minDistance;
    this.smoothingStrength = smoothingStrength;
  }
  
  /**
   * Adds a new point with enhanced velocity-aware smoothing
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
    
    // Enhanced adaptive distance filtering
    const velocity = distance;
    const adaptiveMinDistance = this.minDistance * (1 + Math.min(velocity / 40, 0.5));
    
    if (distance < adaptiveMinDistance) {
      return this.getCurrentPath();
    }
    
    // Apply enhanced smoothing with stronger velocity boost
    let smoothedPoint = point;
    if (this.points.length >= 2 && this.smoothingStrength > 0) {
      const prev1 = this.points[this.points.length - 1];
      
      // More aggressive smoothing for fast movements (velocity > 30)
      const isFast = velocity > 30;
      const velocityBoost = isFast ? Math.min((velocity - 30) / 60, 0.6) : 0;
      const dynamicSmoothing = this.smoothingStrength * (1 + velocityBoost);
      
      // Enhanced multi-point averaging for better smoothness
      if (this.points.length >= 3) {
        const prev2 = this.points[this.points.length - 2];
        // Use weighted averaging with previous two points for stronger smoothing
        smoothedPoint = {
          x: point.x * (1 - dynamicSmoothing) + prev1.x * (dynamicSmoothing * 0.7) + prev2.x * (dynamicSmoothing * 0.3),
          y: point.y * (1 - dynamicSmoothing) + prev1.y * (dynamicSmoothing * 0.7) + prev2.y * (dynamicSmoothing * 0.3)
        };
      } else {
        // Standard 2-point averaging with enhanced strength
        smoothedPoint = {
          x: point.x * (1 - dynamicSmoothing) + prev1.x * dynamicSmoothing,
          y: point.y * (1 - dynamicSmoothing) + prev1.y * dynamicSmoothing
        };
      }
    }
    
    // Enhanced velocity smoothing
    this.lastVelocity = this.lastVelocity * 0.7 + velocity * 0.3;
    
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
 * Enhanced smoothing configurations with stronger smoothing
 */
export const getSmoothingConfig = (toolType: string) => {
  switch (toolType) {
    case 'brush':
      return { minDistance: 2, smoothingStrength: 0.35 }; // Increased from 0.2
    case 'pencil':
      return { minDistance: 1.5, smoothingStrength: 0.25 }; // Increased from 0.15
    case 'eraser':
      return { minDistance: 1, smoothingStrength: 0 }; // No smoothing for eraser
    default:
      return { minDistance: 1.5, smoothingStrength: 0.25 };
  }
};
