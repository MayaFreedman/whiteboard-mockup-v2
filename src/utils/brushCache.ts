
/**
 * Brush effect caching system for consistent rendering
 * Stores pre-calculated brush patterns to maintain visual consistency
 */

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
 * Pre-calculates chalk effect data for consistent rendering
 */
export function precalculateChalkEffect(
  points: Array<{ x: number; y: number }>,
  strokeWidth: number,
  baseSeed: number
): ChalkEffectData {
  const dustParticles: ChalkEffectData['dustParticles'] = [];
  
  points.forEach((point, pointIndex) => {
    const seededRandom = createSeededRandom(baseSeed + pointIndex * 1000);
    const dustCount = Math.max(3, Math.floor(strokeWidth / 2));
    
    for (let i = 0; i < dustCount; i++) {
      const angle = seededRandom() * Math.PI * 2;
      const distance = seededRandom() * strokeWidth * 0.6;
      const size = seededRandom() * (strokeWidth * 0.15) + 0.5;
      
      dustParticles.push({
        offsetX: Math.cos(angle) * distance,
        offsetY: Math.sin(angle) * distance,
        size,
        opacity: 0.25,
        pointIndex
      });
    }
  });
  
  // Pre-calculate roughness layers
  const roughnessLayers = [
    { offsetX: 0, offsetY: 0, alpha: 0.7, width: 1.0 },
    { offsetX: 0.3, offsetY: 0.2, alpha: 0.4, width: 0.9 },
    { offsetX: -0.2, offsetY: 0.4, alpha: 0.4, width: 0.8 },
    { offsetX: 0.4, offsetY: -0.3, alpha: 0.3, width: 0.9 },
    { offsetX: -0.3, offsetY: -0.2, alpha: 0.3, width: 0.85 }
  ];
  
  return { dustParticles, roughnessLayers };
}

/**
 * Converts SVG path to points array for effect calculation
 */
export function pathToPointsForBrush(path: string): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  const commands = path.split(/[ML]/).filter(cmd => cmd.trim());
  
  commands.forEach(cmd => {
    const coords = cmd.trim().split(' ').map(Number).filter(n => !isNaN(n));
    if (coords.length >= 2) {
      points.push({ x: coords[0], y: coords[1] });
    }
  });
  
  return points;
}
