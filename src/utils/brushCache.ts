/**
 * Brush effect caching system for consistent rendering
 * Stores pre-calculated brush patterns to maintain visual consistency
 */

import { pathPointsCache } from './pathPointsCache';

export interface BrushEffectData {
  type: 'paintbrush' | 'chalk' | 'spray' | 'crayon';
  points: Array<{ x: number; y: number }>;
  strokeWidth: number;
  strokeColor: string;
  opacity: number;
  // Cached effect-specific data
  effectData?: any;
}

export interface SprayEffectData {
  dots: Array<{
    offsetX: number;
    offsetY: number;
    size: number;
    opacity: number;
    pointIndex: number; // Which path point this dot is associated with
  }>;
}

export interface ChalkEffectData {
  dustParticles: Array<{
    offsetX: number;
    offsetY: number;
    size: number;
    opacity: number;
    pointIndex: number;
  }>;
  roughnessLayers: Array<{
    offsetX: number;
    offsetY: number;
    alpha: number;
    width: number;
  }>;
}

/**
 * Cache for storing pre-calculated brush effects
 */
class BrushEffectCache {
  private cache = new Map<string, BrushEffectData>();
  
  generateCacheKey(pathId: string, brushType: string): string {
    return `${pathId}_${brushType}`;
  }
  
  store(pathId: string, brushType: string, effectData: BrushEffectData): void {
    const key = this.generateCacheKey(pathId, brushType);
    this.cache.set(key, effectData);
  }
  
  get(pathId: string, brushType: string): BrushEffectData | null {
    const key = this.generateCacheKey(pathId, brushType);
    return this.cache.get(key) || null;
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  remove(pathId: string, brushType: string): void {
    const key = this.generateCacheKey(pathId, brushType);
    this.cache.delete(key);
  }

  /**
   * Transfers brush effect data from a parent object to its segments after erasing
   */
  transferToSegments(
    originalPathId: string, 
    brushType: string, 
    segments: Array<{ points: Array<{ x: number; y: number }>; id: string }>
  ): void {
    const originalData = this.get(originalPathId, brushType);
    if (!originalData || !originalData.effectData) return;

    console.log('🔄 Transferring brush effects from parent to segments:', {
      originalPathId: originalPathId.slice(0, 8),
      brushType,
      segmentCount: segments.length,
      originalEffectData: originalData.effectData
    });

    // Transfer appropriate brush effects to each segment
    segments.forEach(segment => {
      if (brushType === 'spray') {
        const sprayData = originalData.effectData as SprayEffectData;
        const segmentSprayData = this.mapSprayDataToSegment(sprayData, originalData.points, segment.points);
        
        this.store(segment.id, brushType, {
          type: brushType as any,
          points: segment.points,
          strokeWidth: originalData.strokeWidth,
          strokeColor: originalData.strokeColor,
          opacity: originalData.opacity,
          effectData: segmentSprayData
        });
      } else if (brushType === 'chalk') {
        const chalkData = originalData.effectData as ChalkEffectData;
        const segmentChalkData = this.mapChalkDataToSegment(chalkData, originalData.points, segment.points);
        
        this.store(segment.id, brushType, {
          type: brushType as any,
          points: segment.points,
          strokeWidth: originalData.strokeWidth,
          strokeColor: originalData.strokeColor,
          opacity: originalData.opacity,
          effectData: segmentChalkData
        });
      }
    });

    console.log('✅ Brush effect transfer complete');
  }

  /**
   * Maps spray dots from original path to a segment
   */
  private mapSprayDataToSegment(
    originalSprayData: SprayEffectData,
    originalPoints: Array<{ x: number; y: number }>,
    segmentPoints: Array<{ x: number; y: number }>
  ): SprayEffectData {
    const segmentDots: SprayEffectData['dots'] = [];
    
    // Map each original spray dot to the segment if it belongs there
    originalSprayData.dots.forEach(dot => {
      const originalPoint = originalPoints[dot.pointIndex];
      if (!originalPoint) return;

      // Find the closest point in the segment
      let closestSegmentIndex = -1;
      let minDistance = Infinity;
      
      segmentPoints.forEach((segmentPoint, index) => {
        const distance = Math.sqrt(
          Math.pow(originalPoint.x - segmentPoint.x, 2) + 
          Math.pow(originalPoint.y - segmentPoint.y, 2)
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          closestSegmentIndex = index;
        }
      });

      // If the dot is close enough to a segment point, include it
      if (closestSegmentIndex !== -1 && minDistance < 20) { // 20px tolerance
        segmentDots.push({
          ...dot,
          pointIndex: closestSegmentIndex
        });
      }
    });

    return { dots: segmentDots };
  }

  /**
   * Maps chalk particles from original path to a segment
   */
  private mapChalkDataToSegment(
    originalChalkData: ChalkEffectData,
    originalPoints: Array<{ x: number; y: number }>,
    segmentPoints: Array<{ x: number; y: number }>
  ): ChalkEffectData {
    const segmentParticles: ChalkEffectData['dustParticles'] = [];
    
    // Map each original chalk particle to the segment if it belongs there
    originalChalkData.dustParticles.forEach(particle => {
      const originalPoint = originalPoints[particle.pointIndex];
      if (!originalPoint) return;

      // Find the closest point in the segment
      let closestSegmentIndex = -1;
      let minDistance = Infinity;
      
      segmentPoints.forEach((segmentPoint, index) => {
        const distance = Math.sqrt(
          Math.pow(originalPoint.x - segmentPoint.x, 2) + 
          Math.pow(originalPoint.y - segmentPoint.y, 2)
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          closestSegmentIndex = index;
        }
      });

      // If the particle is close enough to a segment point, include it
      if (closestSegmentIndex !== -1 && minDistance < 20) { // 20px tolerance
        segmentParticles.push({
          ...particle,
          pointIndex: closestSegmentIndex
        });
      }
    });

    return { 
      dustParticles: segmentParticles,
      roughnessLayers: originalChalkData.roughnessLayers // Keep the same roughness layers
    };
  }
}

export const brushEffectCache = new BrushEffectCache();

/**
 * Deterministic random number generator for consistent patterns
 */
export function createSeededRandom(seed: number) {
  let currentSeed = seed;
  
  return function() {
    const x = Math.sin(currentSeed) * 10000;
    currentSeed += 1;
    return x - Math.floor(x);
  };
}

/**
 * Pre-calculates spray effect data for consistent rendering
 */
export function precalculateSprayEffect(
  points: Array<{ x: number; y: number }>,
  strokeWidth: number,
  baseSeed: number
): SprayEffectData {
  const dots: SprayEffectData['dots'] = [];
  const sprayRadius = strokeWidth;
  const dotsPerPoint = Math.floor(strokeWidth * 3);
  
  points.forEach((point, pointIndex) => {
    const seededRandom = createSeededRandom(baseSeed + pointIndex * 1000);
    
    for (let i = 0; i < dotsPerPoint; i++) {
      const angle = seededRandom() * Math.PI * 2;
      const distance = seededRandom() * sprayRadius;
      const size = seededRandom() * (strokeWidth * 0.15) + 0.5;
      const distanceRatio = distance / sprayRadius;
      const opacity = 1 - distanceRatio * 0.7;
      
      dots.push({
        offsetX: Math.cos(angle) * distance,
        offsetY: Math.sin(angle) * distance,
        size,
        opacity,
        pointIndex
      });
    }
  });
  
  return { dots };
}

/**
 * Pre-calculates enhanced chalk effect data for more noticeable chalk appearance
 */
export function precalculateChalkEffect(
  points: Array<{ x: number; y: number }>,
  strokeWidth: number,
  baseSeed: number
): ChalkEffectData {
  const dustParticles: ChalkEffectData['dustParticles'] = [];
  
  points.forEach((point, pointIndex) => {
    const seededRandom = createSeededRandom(baseSeed + pointIndex * 1000);
    const dustCount = Math.max(5, Math.floor(strokeWidth * 1.5)); // Increased dust count
    
    for (let i = 0; i < dustCount; i++) {
      const angle = seededRandom() * Math.PI * 2;
      const distance = seededRandom() * strokeWidth * 0.8; // Increased spread
      const size = seededRandom() * (strokeWidth * 0.2) + 0.8; // Larger particles
      
      dustParticles.push({
        offsetX: Math.cos(angle) * distance,
        offsetY: Math.sin(angle) * distance,
        size,
        opacity: 0.4, // Increased opacity from 0.25
        pointIndex
      });
    }
  });
  
  // Enhanced roughness layers with more variation
  const roughnessLayers = [
    { offsetX: 0, offsetY: 0, alpha: 0.8, width: 1.0 },
    { offsetX: 0.5, offsetY: 0.3, alpha: 0.5, width: 0.9 },
    { offsetX: -0.3, offsetY: 0.6, alpha: 0.5, width: 0.8 },
    { offsetX: 0.6, offsetY: -0.4, alpha: 0.4, width: 0.9 },
    { offsetX: -0.4, offsetY: -0.3, alpha: 0.4, width: 0.85 },
    { offsetX: 0.2, offsetY: 0.7, alpha: 0.3, width: 0.7 }, // Additional layer
    { offsetX: -0.6, offsetY: 0.2, alpha: 0.3, width: 0.8 }  // Additional layer
  ];
  
  return { dustParticles, roughnessLayers };
}

/**
 * Improved function to convert SVG path to points array for effect calculation
 * Now uses caching to improve performance during drawing
 */
export function pathToPointsForBrush(path: string): Array<{ x: number; y: number }> {
  if (!path || typeof path !== 'string') {
    return [];
  }

  // Try to get from cache first
  const cachedPoints = pathPointsCache.get(path);
  if (cachedPoints) {
    return cachedPoints;
  }

  console.log('🔍 Computing path-to-points conversion:', {
    inputPath: path.slice(0, 100) + (path.length > 100 ? '...' : ''),
    pathLength: path.length
  });

  const points: Array<{ x: number; y: number }> = [];
  
  // Split the path into commands, handling both uppercase and lowercase
  const commands = path.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g) || [];
  
  let currentX = 0;
  let currentY = 0;
  
  commands.forEach(command => {
    const type = command[0];
    const isAbsolute = type === type.toUpperCase();
    const coords = command.slice(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
    
    switch (type.toUpperCase()) {
      case 'M': // Move to
        if (coords.length >= 2) {
          currentX = isAbsolute ? coords[0] : currentX + coords[0];
          currentY = isAbsolute ? coords[1] : currentY + coords[1];
          points.push({ x: currentX, y: currentY });
          
          // Handle additional coordinate pairs as implicit line-to commands
          for (let i = 2; i < coords.length; i += 2) {
            if (i + 1 < coords.length) {
              currentX = isAbsolute ? coords[i] : currentX + coords[i];
              currentY = isAbsolute ? coords[i + 1] : currentY + coords[i + 1];
              points.push({ x: currentX, y: currentY });
            }
          }
        }
        break;
        
      case 'L': // Line to
        for (let i = 0; i < coords.length; i += 2) {
          if (i + 1 < coords.length) {
            currentX = isAbsolute ? coords[i] : currentX + coords[i];
            currentY = isAbsolute ? coords[i + 1] : currentY + coords[i + 1];
            points.push({ x: currentX, y: currentY });
          }
        }
        break;
        
      case 'H': // Horizontal line to
        for (let i = 0; i < coords.length; i++) {
          currentX = isAbsolute ? coords[i] : currentX + coords[i];
          points.push({ x: currentX, y: currentY });
        }
        break;
        
      case 'V': // Vertical line to
        for (let i = 0; i < coords.length; i++) {
          currentY = isAbsolute ? coords[i] : currentY + coords[i];
          points.push({ x: currentX, y: currentY });
        }
        break;
        
      case 'C': // Cubic Bezier curve
        for (let i = 0; i < coords.length; i += 6) {
          if (i + 5 < coords.length) {
            // For now, just take the end point of the curve
            // TODO: Could interpolate along the curve for more accuracy
            currentX = isAbsolute ? coords[i + 4] : currentX + coords[i + 4];
            currentY = isAbsolute ? coords[i + 5] : currentY + coords[i + 5];
            points.push({ x: currentX, y: currentY });
          }
        }
        break;
        
      case 'Q': // Quadratic Bezier curve
        for (let i = 0; i < coords.length; i += 4) {
          if (i + 3 < coords.length) {
            // For now, just take the end point of the curve
            currentX = isAbsolute ? coords[i + 2] : currentX + coords[i + 2];
            currentY = isAbsolute ? coords[i + 3] : currentY + coords[i + 3];
            points.push({ x: currentX, y: currentY });
          }
        }
        break;
        
      case 'Z': // Close path
        // Don't add a point for close path command
        break;
    }
  });
  
  // Cache the result for future use
  pathPointsCache.set(path, points);
  
  console.log('✅ Path-to-points conversion complete:', {
    commandCount: commands.length,
    extractedPoints: points.length,
    firstFewPoints: points.slice(0, 3)
  });
  
  return points;
}
