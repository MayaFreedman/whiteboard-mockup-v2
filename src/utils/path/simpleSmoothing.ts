
import { Point } from './pathConversion';

/**
 * Enhanced real-time path smoothing using improved point averaging
 * Designed to provide very smooth lines while following the cursor accurately
 */

/**
 * Enhanced real-time path builder with improved smoothing
 * Uses multi-point averaging and adaptive filtering for ultra-smooth results
 */
export class SimplePathBuilder {
  private points: Point[] = [];
  private minDistance: number;
  private smoothingStrength: number;
  private velocitySmoothing: number;
  private lastVelocity: number = 0;
  
  constructor(minDistance: number = 1.5, smoothingStrength: number = 0.4, velocitySmoothing: number = 0.3) {
    this.minDistance = minDistance;
    this.smoothingStrength = smoothingStrength; // Increased for more smoothing
    this.velocitySmoothing = velocitySmoothing; // Velocity-based smoothing
  }
  
  /**
   * Adds a new point with enhanced distance filtering and multi-point smoothing
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
    
    // Adaptive distance filtering based on velocity
    const velocity = distance;
    const adaptiveMinDistance = this.minDistance * (1 + Math.min(velocity / 20, 1));
    
    if (distance < adaptiveMinDistance) {
      return this.getCurrentPath(); // Don't add point, return current path
    }
    
    // Apply enhanced multi-point smoothing
    let smoothedPoint = point;
    if (this.points.length >= 3 && this.smoothingStrength > 0) {
      // Use more points for better smoothing
      const prev3 = this.points[this.points.length - 3];
      const prev2 = this.points[this.points.length - 2];
      const prev1 = this.points[this.points.length - 1];
      
      // Enhanced 4-point weighted average with velocity consideration
      const velocityFactor = Math.min(this.lastVelocity / 10, 1);
      const dynamicSmoothing = this.smoothingStrength * (1 - velocityFactor * 0.3);
      
      smoothedPoint = {
        x: point.x * (1 - dynamicSmoothing) + 
           (prev1.x * 0.4 + prev2.x * 0.3 + prev3.x * 0.1) * dynamicSmoothing,
        y: point.y * (1 - dynamicSmoothing) + 
           (prev1.y * 0.4 + prev2.y * 0.3 + prev3.y * 0.1) * dynamicSmoothing
      };
    } else if (this.points.length >= 2 && this.smoothingStrength > 0) {
      // Simple 3-point average for early points
      const prev2 = this.points[this.points.length - 2];
      const prev1 = this.points[this.points.length - 1];
      
      smoothedPoint = {
        x: point.x * (1 - this.smoothingStrength) + 
           (prev1.x * 0.6 + prev2.x * 0.2) * this.smoothingStrength,
        y: point.y * (1 - this.smoothingStrength) + 
           (prev1.y * 0.6 + prev2.y * 0.2) * this.smoothingStrength
      };
    }
    
    // Update velocity tracking
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
 * Enhanced smoothing parameters based on tool type
 * @param toolType - The drawing tool being used
 * @returns Configuration for the path builder
 */
export const getSmoothingConfig = (toolType: string) => {
  switch (toolType) {
    case 'brush':
      return { minDistance: 2, smoothingStrength: 0.5 }; // Very smooth for brush
    case 'pencil':
      return { minDistance: 1.5, smoothingStrength: 0.35 }; // Moderate smoothing for pencil
    case 'eraser':
      return { minDistance: 1, smoothingStrength: 0 }; // No smoothing for eraser
    default:
      return { minDistance: 1.5, smoothingStrength: 0.4 };
  }
};
