
/**
 * Optimized brush effects with caching for consistent rendering
 */
import { 
  brushEffectCache, 
  precalculateSprayEffect, 
  precalculateChalkEffect,
  pathToPointsForBrush,
  SprayEffectData,
  ChalkEffectData
} from './brushCache';

/**
 * Calculates how much of the cached effect should be visible based on current path length
 */
const calculatePathProgression = (currentPath: string, cachedPointsLength: number): number => {
  // Quick estimation of current path length based on string length
  // This gives us a rough progression without expensive re-parsing
  const currentPathLength = currentPath.length;
  const estimatedFullLength = cachedPointsLength * 20; // Rough estimation
  return Math.min(1, currentPathLength / estimatedFullLength);
};

/**
 * Renders cached spray effect with consistent dot patterns
 */
export const renderSprayOptimized = (
  ctx: CanvasRenderingContext2D,
  path: string,
  strokeColor: string,
  strokeWidth: number,
  opacity: number,
  pathId?: string
) => {
  ctx.save();
  
  let sprayData: SprayEffectData;
  let pathPoints: Array<{ x: number; y: number }>;
  
  // Try to get cached effect data
  if (pathId) {
    const cached = brushEffectCache.get(pathId, 'spray');
    if (cached && cached.effectData) {
      sprayData = cached.effectData as SprayEffectData;
      pathPoints = cached.points;
    } else {
      // Calculate and cache new effect data ONLY if not cached
      pathPoints = pathToPointsForBrush(path);
      const baseSeed = pathId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      sprayData = precalculateSprayEffect(pathPoints, strokeWidth, baseSeed);
      
      brushEffectCache.store(pathId, 'spray', {
        type: 'spray',
        points: pathPoints,
        strokeWidth,
        strokeColor,
        opacity,
        effectData: sprayData
      });
      
      console.log('🎨 Cached NEW spray effect:', {
        pathId: pathId.slice(0, 8),
        pointCount: pathPoints.length,
        dotCount: sprayData.dots.length
      });
    }
  } else {
    // Fallback for preview mode
    pathPoints = pathToPointsForBrush(path);
    const baseSeed = Date.now(); // Use timestamp for preview
    sprayData = precalculateSprayEffect(pathPoints, strokeWidth, baseSeed);
  }
  
  // Calculate how much of the effect to show based on path progression
  const pathProgression = calculatePathProgression(path, pathPoints.length);
  const maxPointsToShow = Math.floor(pathPoints.length * pathProgression);
  
  // Render the cached spray dots using ONLY cached points for positioning
  ctx.fillStyle = strokeColor;
  
  sprayData.dots.forEach(dot => {
    // Only render dots for points that should be visible based on path progression
    if (dot.pointIndex < maxPointsToShow) {
      const pathPoint = pathPoints[dot.pointIndex];
      if (pathPoint) {
        ctx.globalAlpha = opacity * dot.opacity;
        ctx.beginPath();
        // Apply the dot offset relative to the CACHED path point position
        ctx.arc(pathPoint.x + dot.offsetX, pathPoint.y + dot.offsetY, dot.size, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  });
  
  ctx.restore();
};

/**
 * Renders cached chalk effect with consistent dust patterns
 */
export const renderChalkOptimized = (
  ctx: CanvasRenderingContext2D,
  path: string,
  strokeColor: string,
  strokeWidth: number,
  opacity: number,
  pathId?: string
) => {
  ctx.save();
  
  const pathObj = new Path2D(path);
  let chalkData: ChalkEffectData;
  let pathPoints: Array<{ x: number; y: number }>;
  
  // Try to get cached effect data
  if (pathId) {
    const cached = brushEffectCache.get(pathId, 'chalk');
    if (cached && cached.effectData) {
      chalkData = cached.effectData as ChalkEffectData;
      pathPoints = cached.points;
    } else {
      // Calculate and cache new effect data ONLY if not cached
      pathPoints = pathToPointsForBrush(path);
      const baseSeed = pathId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      chalkData = precalculateChalkEffect(pathPoints, strokeWidth, baseSeed);
      
      brushEffectCache.store(pathId, 'chalk', {
        type: 'chalk',
        points: pathPoints,
        strokeWidth,
        strokeColor,
        opacity,
        effectData: chalkData
      });
      
      console.log('🎨 Cached NEW chalk effect:', {
        pathId: pathId.slice(0, 8),
        pointCount: pathPoints.length,
        particleCount: chalkData.dustParticles.length
      });
    }
  } else {
    // Fallback for preview mode
    pathPoints = pathToPointsForBrush(path);
    const baseSeed = Date.now();
    chalkData = precalculateChalkEffect(pathPoints, strokeWidth, baseSeed);
  }
  
  // Draw the main stroke with roughness layers
  chalkData.roughnessLayers.forEach((layer) => {
    ctx.save();
    ctx.translate(layer.offsetX, layer.offsetY);
    ctx.globalAlpha = opacity * layer.alpha;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth * layer.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.shadowColor = strokeColor;
    ctx.shadowBlur = strokeWidth * 0.2;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    ctx.stroke(pathObj);
    ctx.restore();
  });
  
  // Calculate how much of the effect to show based on path progression
  const pathProgression = calculatePathProgression(path, pathPoints.length);
  const maxPointsToShow = Math.floor(pathPoints.length * pathProgression);
  
  // Add cached dust particles using ONLY cached points for positioning
  ctx.globalAlpha = opacity * 0.25;
  ctx.fillStyle = strokeColor;
  ctx.shadowBlur = 0;
  
  chalkData.dustParticles.forEach(particle => {
    // Only render particles for points that should be visible based on path progression
    if (particle.pointIndex < maxPointsToShow) {
      const pathPoint = pathPoints[particle.pointIndex];
      if (pathPoint) {
        ctx.globalAlpha = opacity * particle.opacity;
        ctx.beginPath();
        // Apply the particle offset relative to the CACHED path point position
        ctx.arc(pathPoint.x + particle.offsetX, pathPoint.y + particle.offsetY, particle.size, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  });
  
  ctx.restore();
};

/**
 * Renders paintbrush with consistent soft edges
 */
export const renderPaintbrushOptimized = (
  ctx: CanvasRenderingContext2D,
  path: string,
  strokeColor: string,
  strokeWidth: number,
  opacity: number
) => {
  ctx.save();
  
  // Add soft shadow effect for paintbrush
  ctx.shadowColor = strokeColor;
  ctx.shadowBlur = strokeWidth * 0.3;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  
  // Main stroke with slight transparency
  ctx.globalAlpha = opacity * 0.9;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  const pathObj = new Path2D(path);
  ctx.stroke(pathObj);
  
  // Add texture by drawing a slightly thinner stroke on top
  ctx.shadowBlur = 0;
  ctx.globalAlpha = opacity * 0.6;
  ctx.lineWidth = strokeWidth * 0.7;
  ctx.stroke(pathObj);
  
  ctx.restore();
};

/**
 * Renders crayon with consistent waxy texture
 */
export const renderCrayonOptimized = (
  ctx: CanvasRenderingContext2D,
  path: string,
  strokeColor: string,
  strokeWidth: number,
  opacity: number
) => {
  ctx.save();
  
  const pathObj = new Path2D(path);
  
  // Create waxy texture by drawing multiple layers with consistent properties
  const waxLayers = [
    { alpha: 0.6, width: 1.1, offset: { x: 0, y: 0 }, composite: 'source-over' },
    { alpha: 0.4, width: 0.9, offset: { x: 0.4, y: 0.3 }, composite: 'multiply' },
    { alpha: 0.4, width: 0.8, offset: { x: -0.3, y: 0.4 }, composite: 'multiply' },
    { alpha: 0.3, width: 1.0, offset: { x: 0.2, y: -0.3 }, composite: 'source-over' },
    { alpha: 0.3, width: 0.85, offset: { x: -0.4, y: -0.2 }, composite: 'source-over' }
  ];
  
  // Apply each waxy layer
  waxLayers.forEach((layer, index) => {
    ctx.save();
    ctx.globalCompositeOperation = layer.composite as GlobalCompositeOperation;
    ctx.translate(layer.offset.x, layer.offset.y);
    ctx.globalAlpha = opacity * layer.alpha;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth * layer.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.stroke(pathObj);
    ctx.restore();
  });
  
  // Add final clean layer on top for definition
  ctx.globalAlpha = opacity * 0.8;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = strokeWidth * 0.9;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke(pathObj);
  
  ctx.restore();
};
