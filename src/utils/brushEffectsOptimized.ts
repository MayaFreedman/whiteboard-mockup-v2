
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
 * Generates a stable seed from path coordinates for consistent preview rendering
 */
const generateCoordinateBasedSeed = (pathPoints: Array<{ x: number; y: number }>): number => {
  if (pathPoints.length === 0) return 12345; // fallback seed
  
  // Use the first point's coordinates to create a stable seed
  const firstPoint = pathPoints[0];
  return Math.floor(firstPoint.x * 1000 + firstPoint.y * 1000);
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
      console.log('🎯 Using cached spray data:', { pathId: pathId.slice(0, 8), dots: cached.effectData.dots?.length });
      sprayData = cached.effectData as SprayEffectData;
      pathPoints = cached.points;
    } else {
      // Calculate and cache new effect data - use coordinate-based seed for consistency
      console.log('⚠️ FALLBACK: Generating new spray data for:', { pathId: pathId.slice(0, 8), reason: 'no cache' });
      pathPoints = pathToPointsForBrush(path);
      const baseSeed = generateCoordinateBasedSeed(pathPoints);
      sprayData = precalculateSprayEffect(pathPoints, strokeWidth, baseSeed);
      
      brushEffectCache.store(pathId, 'spray', {
        type: 'spray',
        points: pathPoints,
        strokeWidth,
        strokeColor,
        opacity,
        effectData: sprayData
      });
    }
  } else {
    // Fallback for preview mode - use coordinate-based seed for stability
    console.log('⚠️ FALLBACK: Preview mode spray generation');
    pathPoints = pathToPointsForBrush(path);
    const baseSeed = generateCoordinateBasedSeed(pathPoints);
    sprayData = precalculateSprayEffect(pathPoints, strokeWidth, baseSeed);
  }
  
  // Render the cached spray dots - apply them relative to each path point
  ctx.fillStyle = strokeColor;
  
  sprayData.dots.forEach(dot => {
    // Get the path point this dot is associated with
    const pathPoint = pathPoints[dot.pointIndex];
    if (pathPoint) {
      ctx.globalAlpha = opacity * dot.opacity;
      ctx.beginPath();
      // Apply the dot offset relative to the path point position
      ctx.arc(pathPoint.x + dot.offsetX, pathPoint.y + dot.offsetY, dot.size, 0, 2 * Math.PI);
      ctx.fill();
    }
  });
  
  ctx.restore();
};

/**
 * Renders cached chalk effect with enhanced dust and roughness
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
      console.log('🎯 Using cached chalk data:', { pathId: pathId.slice(0, 8), particles: cached.effectData.dustParticles?.length });
      chalkData = cached.effectData as ChalkEffectData;
      pathPoints = cached.points;
    } else {
      // Calculate and cache new effect data - use coordinate-based seed for consistency
      console.log('⚠️ FALLBACK: Generating new chalk data for:', { pathId: pathId.slice(0, 8), reason: 'no cache' });
      pathPoints = pathToPointsForBrush(path);
      const baseSeed = generateCoordinateBasedSeed(pathPoints);
      chalkData = precalculateChalkEffect(pathPoints, strokeWidth, baseSeed);
      
      brushEffectCache.store(pathId, 'chalk', {
        type: 'chalk',
        points: pathPoints,
        strokeWidth,
        strokeColor,
        opacity,
        effectData: chalkData
      });
    }
  } else {
    // Fallback for preview mode - use coordinate-based seed for stability
    console.log('⚠️ FALLBACK: Preview mode chalk generation');
    pathPoints = pathToPointsForBrush(path);
    const baseSeed = generateCoordinateBasedSeed(pathPoints);
    chalkData = precalculateChalkEffect(pathPoints, strokeWidth, baseSeed);
  }
  
  // Draw the main stroke with enhanced roughness layers
  chalkData.roughnessLayers.forEach((layer) => {
    ctx.save();
    ctx.translate(layer.offsetX, layer.offsetY);
    ctx.globalAlpha = opacity * layer.alpha;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth * layer.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Enhanced shadow effect for more chalky appearance
    ctx.shadowColor = strokeColor;
    ctx.shadowBlur = strokeWidth * 0.4; // Increased from 0.2
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    ctx.stroke(pathObj);
    ctx.restore();
  });
  
  // Add enhanced dust particles with more visibility
  ctx.fillStyle = strokeColor;
  ctx.shadowBlur = 0;
  
  chalkData.dustParticles.forEach(particle => {
    // Get the path point this particle is associated with
    const pathPoint = pathPoints[particle.pointIndex];
    if (pathPoint) {
      ctx.globalAlpha = opacity * particle.opacity * 0.7; // Increased visibility
      ctx.beginPath();
      // Apply the particle offset relative to the path point position
      ctx.arc(pathPoint.x + particle.offsetX, pathPoint.y + particle.offsetY, particle.size, 0, 2 * Math.PI);
      ctx.fill();
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
 * Renders crayon with enhanced waxy texture and color variation
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
  
  // Enhanced waxy texture with more pronounced layers and color variation
  const waxLayers = [
    { alpha: 0.7, width: 1.2, offset: { x: 0, y: 0 }, composite: 'source-over', hueShift: 0 },
    { alpha: 0.5, width: 0.95, offset: { x: 0.6, y: 0.4 }, composite: 'multiply', hueShift: -5 },
    { alpha: 0.5, width: 0.85, offset: { x: -0.4, y: 0.5 }, composite: 'multiply', hueShift: 3 },
    { alpha: 0.4, width: 1.1, offset: { x: 0.3, y: -0.4 }, composite: 'source-over', hueShift: -2 },
    { alpha: 0.4, width: 0.9, offset: { x: -0.5, y: -0.3 }, composite: 'source-over', hueShift: 4 },
    { alpha: 0.3, width: 0.8, offset: { x: 0.4, y: 0.6 }, composite: 'multiply', hueShift: -3 },
    { alpha: 0.3, width: 1.0, offset: { x: -0.3, y: 0.2 }, composite: 'source-over', hueShift: 2 }
  ];
  
  // Apply each waxy layer with enhanced color variation
  waxLayers.forEach((layer, index) => {
    ctx.save();
    ctx.globalCompositeOperation = layer.composite as GlobalCompositeOperation;
    ctx.translate(layer.offset.x, layer.offset.y);
    ctx.globalAlpha = opacity * layer.alpha;
    
    // Apply color variation for more realistic crayon effect
    let layerColor = strokeColor;
    if (layer.hueShift !== 0) {
      const hslColor = hexToHsl(strokeColor);
      if (hslColor) {
        const variedHue = (hslColor.h + layer.hueShift + 360) % 360;
        const variedLightness = Math.max(10, Math.min(90, hslColor.l + layer.hueShift * 0.5));
        layerColor = hslToHex(variedHue, hslColor.s, variedLightness);
      }
    }
    
    ctx.strokeStyle = layerColor;
    ctx.lineWidth = strokeWidth * layer.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Add slight texture shadow for some layers
    if (index % 2 === 0) {
      ctx.shadowColor = layerColor;
      ctx.shadowBlur = strokeWidth * 0.1;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    } else {
      ctx.shadowBlur = 0;
    }
    
    ctx.stroke(pathObj);
    ctx.restore();
  });
  
  // Add final definition layer with enhanced opacity
  ctx.globalAlpha = opacity * 0.9; // Increased from 0.8
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = strokeWidth * 0.85; // Slightly thicker
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowBlur = 0;
  ctx.stroke(pathObj);
  
  ctx.restore();
};

/**
 * Helper function to convert hex to HSL
 */
function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Helper function to convert HSL to hex
 */
function hslToHex(h: number, s: number, l: number): string {
  h /= 360;
  s /= 100;
  l /= 100;

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  const toHex = (c: number) => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
