
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
  
  // Try to get cached effect data
  if (pathId) {
    const cached = brushEffectCache.get(pathId, 'spray');
    if (cached && cached.effectData) {
      sprayData = cached.effectData as SprayEffectData;
    } else {
      // Calculate and cache new effect data
      const points = pathToPointsForBrush(path);
      const baseSeed = pathId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      sprayData = precalculateSprayEffect(points, strokeWidth, baseSeed);
      
      brushEffectCache.store(pathId, 'spray', {
        type: 'spray',
        points,
        strokeWidth,
        strokeColor,
        opacity,
        effectData: sprayData
      });
    }
  } else {
    // Fallback for preview mode
    const points = pathToPointsForBrush(path);
    const baseSeed = Date.now(); // Use timestamp for preview
    sprayData = precalculateSprayEffect(points, strokeWidth, baseSeed);
  }
  
  // Render the cached spray dots
  ctx.fillStyle = strokeColor;
  
  sprayData.dots.forEach(dot => {
    ctx.globalAlpha = opacity * dot.opacity;
    ctx.beginPath();
    ctx.arc(dot.offsetX, dot.offsetY, dot.size, 0, 2 * Math.PI);
    ctx.fill();
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
  
  // Try to get cached effect data
  if (pathId) {
    const cached = brushEffectCache.get(pathId, 'chalk');
    if (cached && cached.effectData) {
      chalkData = cached.effectData as ChalkEffectData;
    } else {
      // Calculate and cache new effect data
      const points = pathToPointsForBrush(path);
      const baseSeed = pathId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      chalkData = precalculateChalkEffect(points, strokeWidth, baseSeed);
      
      brushEffectCache.store(pathId, 'chalk', {
        type: 'chalk',
        points,
        strokeWidth,
        strokeColor,
        opacity,
        effectData: chalkData
      });
    }
  } else {
    // Fallback for preview mode
    const points = pathToPointsForBrush(path);
    const baseSeed = Date.now();
    chalkData = precalculateChalkEffect(points, strokeWidth, baseSeed);
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
  
  // Add cached dust particles
  ctx.globalAlpha = opacity * 0.25;
  ctx.fillStyle = strokeColor;
  ctx.shadowBlur = 0;
  
  chalkData.dustParticles.forEach(particle => {
    ctx.globalAlpha = opacity * particle.opacity;
    ctx.beginPath();
    ctx.arc(particle.offsetX, particle.offsetY, particle.size, 0, 2 * Math.PI);
    ctx.fill();
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
