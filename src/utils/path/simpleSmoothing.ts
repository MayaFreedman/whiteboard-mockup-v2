import { Point } from './pathConversion';

/**
 * Enhanced real-time path smoothing using improved point averaging
 * Designed to provide very smooth lines while following the cursor accurately
 */

/**
 * Enhanced real-time path builder with velocity-aware smoothing
 * Uses multi-point averaging and applies MORE smoothing for fast movements
 */
export class SimplePathBuilder {
  private points: Point[] = [];
  private minDistance: number;
  private smoothingStrength: number;
  private velocitySmoothing: number;
  private lastVelocity: number = 0;
  
  constructor(minDistance: number = 1.5, smoothingStrength: number = 0.4, velocitySmoothing: number = 0.3) {
    this.minDistance = minDistance;
    this.smoothingStrength = smoothingStrength;
    this.velocitySmoothing = velocitySmoothing;
  }
  
  /**
   * Adds a new point with velocity-aware smoothing that applies MORE smoothing for fast movements
   * @param point - New point to add (relative coordinates)
   * @returns Updated SVG path string
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
    
    // Reduced aggressive point skipping - keep more points even at high velocity
    const velocity = distance;
    const adaptiveMinDistance = this.minDistance * (1 + Math.min(velocity / 40, 0.5));
    
    if (distance < adaptiveMinDistance) {
      return this.getCurrentPath();
    }
    
    // Apply velocity-aware smoothing - MORE smoothing for fast movements
    let smoothedPoint = point;
    if (this.points.length >= 3 && this.smoothingStrength > 0) {
      const prev3 = this.points[this.points.length - 3];
      const prev2 = this.points[this.points.length - 2];
      const prev1 = this.points[this.points.length - 1];
      
      // Inverted velocity logic: apply MORE smoothing when moving fast
      const velocityFactor = Math.min(this.lastVelocity / 15, 1);
      const dynamicSmoothing = this.smoothingStrength * (1 + velocityFactor * 0.5);
      
      // Enhanced 4-point weighted average with velocity-boost for fast movements
      smoothedPoint = {
        x: point.x * (1 - dynamicSmoothing) + 
           (prev1.x * 0.4 + prev2.x * 0.3 + prev3.x * 0.1) * dynamicSmoothing,
        y: point.y * (1 - dynamicSmoothing) + 
           (prev1.y * 0.4 + prev2.y * 0.3 + prev3.y * 0.1) * dynamicSmoothing
      };
    } else if (this.points.length >= 2 && this.smoothingStrength > 0) {
      // Simple 3-point average for early points with velocity awareness
      const prev2 = this.points[this.points.length - 2];
      const prev1 = this.points[this.points.length - 1];
      
      const velocityFactor = Math.min(this.lastVelocity / 15, 1);
      const dynamicSmoothing = this.smoothingStrength * (1 + velocityFactor * 0.3);
      
      smoothedPoint = {
        x: point.x * (1 - dynamicSmoothing) + 
           (prev1.x * 0.6 + prev2.x * 0.2) * dynamicSmoothing,
        y: point.y * (1 - dynamicSmoothing) + 
           (prev1.y * 0.6 + prev2.y * 0.2) * dynamicSmoothing
      };
    }
    
    // Exponential smoothing for velocity tracking to avoid sudden changes
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
 * Enhanced smoothing parameters with velocity-aware configurations
 * @param toolType - The drawing tool being used
 * @returns Configuration for the path builder
 */
export const getSmoothingConfig = (toolType: string) => {
  switch (toolType) {
    case 'brush':
      return { minDistance: 2, smoothingStrength: 0.6 }; // Increased for better fast movement handling
    case 'pencil':
      return { minDistance: 1.5, smoothingStrength: 0.45 }; // Slightly increased
    case 'eraser':
      return { minDistance: 1, smoothingStrength: 0 }; // No smoothing for eraser
    default:
      return { minDistance: 1.5, smoothingStrength: 0.45 };
  }
};
