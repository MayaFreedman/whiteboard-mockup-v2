
/**
 * Brush effects utility for rendering different brush types
 * Each brush type has its own unique visual characteristics
 */

/**
 * Renders a paintbrush stroke with soft edges and variable width
 */
export const renderPaintbrush = (
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
 * Renders a chalk stroke with broken, irregular texture and width variation
 */
export const renderChalk = (
  ctx: CanvasRenderingContext2D,
  path: string,
  strokeColor: string,
  strokeWidth: number,
  opacity: number
) => {
  ctx.save();
  
  // Parse path to get points for custom rendering
  const points = parsePathToPoints(path);
  if (points.length < 2) {
    ctx.restore();
    return;
  }

  // Interpolate points for smoother texture application
  const interpolatedPoints = interpolatePoints(points, 3);
  
  ctx.strokeStyle = strokeColor;
  ctx.fillStyle = strokeColor;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Render main broken stroke with width variation
  for (let i = 0; i < interpolatedPoints.length - 1; i++) {
    const point = interpolatedPoints[i];
    const nextPoint = interpolatedPoints[i + 1];
    
    // Create width variation using sine wave
    const progress = i / interpolatedPoints.length;
    const widthVariation = 0.7 + 0.6 * Math.sin(progress * Math.PI * 8 + point.x * 0.01);
    const currentWidth = strokeWidth * widthVariation;
    
    // Skip some segments to create broken chalk effect
    const seed = point.x * 100 + point.y * 50 + i;
    const shouldSkip = seededRandom(seed) < 0.15; // 15% chance to skip segment
    
    if (!shouldSkip) {
      // Draw main stroke segment
      ctx.globalAlpha = opacity * (0.8 + 0.4 * seededRandom(seed + 1));
      ctx.lineWidth = currentWidth;
      
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      ctx.lineTo(nextPoint.x, nextPoint.y);
      ctx.stroke();
      
      // Add roughness with offset strokes
      const roughnessOffsets = [
        { x: seededRandom(seed + 2) * 2 - 1, y: seededRandom(seed + 3) * 2 - 1, alpha: 0.4 },
        { x: seededRandom(seed + 4) * 1.5 - 0.75, y: seededRandom(seed + 5) * 1.5 - 0.75, alpha: 0.3 }
      ];
      
      roughnessOffsets.forEach((offset) => {
        ctx.globalAlpha = opacity * offset.alpha;
        ctx.lineWidth = currentWidth * 0.6;
        ctx.beginPath();
        ctx.moveTo(point.x + offset.x, point.y + offset.y);
        ctx.lineTo(nextPoint.x + offset.x, nextPoint.y + offset.y);
        ctx.stroke();
      });
    }
    
    // Add chalk dust particles around the stroke
    if (i % 2 === 0) { // Every other point to avoid overdoing it
      const dustCount = Math.floor(currentWidth / 3);
      for (let d = 0; d < dustCount; d++) {
        const dustSeed = seed + d * 10;
        const angle = seededRandom(dustSeed) * Math.PI * 2;
        const distance = seededRandom(dustSeed + 1) * currentWidth * 1.2;
        const dustX = point.x + Math.cos(angle) * distance;
        const dustY = point.y + Math.sin(angle) * distance;
        const dustSize = seededRandom(dustSeed + 2) * (currentWidth * 0.2) + 0.8;
        
        ctx.globalAlpha = opacity * 0.3 * (1 - distance / (currentWidth * 1.2));
        ctx.beginPath();
        ctx.arc(dustX, dustY, dustSize, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  }
  
  ctx.restore();
};

/**
 * Renders a crayon stroke with waxy buildup and streaky texture
 */
export const renderCrayon = (
  ctx: CanvasRenderingContext2D,
  path: string,
  strokeColor: string,
  strokeWidth: number,
  opacity: number
) => {
  ctx.save();
  
  // Parse path to get points for custom rendering
  const points = parsePathToPoints(path);
  if (points.length < 2) {
    ctx.restore();
    return;
  }

  // Interpolate points for smoother texture application
  const interpolatedPoints = interpolatePoints(points, 2);
  
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Create color variations for waxy effect
  const baseColor = hexToHsl(strokeColor);
  const colorVariations = baseColor ? [
    strokeColor, // Original color
    hslToHex(baseColor.h, baseColor.s, Math.max(0, baseColor.l - 8)), // Slightly darker
    hslToHex(baseColor.h, Math.max(0, baseColor.s - 10), baseColor.l + 5), // Less saturated, lighter
    hslToHex((baseColor.h + 15) % 360, baseColor.s, baseColor.l - 3) // Slight hue shift
  ] : [strokeColor];

  // Render multiple waxy layers
  const layers = [
    { widthMult: 1.3, alpha: 0.4, offsetRange: 2.5 },
    { widthMult: 1.0, alpha: 0.7, offsetRange: 1.5 },
    { widthMult: 0.8, alpha: 0.6, offsetRange: 1.0 },
    { widthMult: 0.6, alpha: 0.8, offsetRange: 0.5 }
  ];

  layers.forEach((layer, layerIndex) => {
    for (let i = 0; i < interpolatedPoints.length - 1; i++) {
      const point = interpolatedPoints[i];
      const nextPoint = interpolatedPoints[i + 1];
      
      // Simulate pressure variation for width
      const progress = i / interpolatedPoints.length;
      const pressureVariation = 0.6 + 0.8 * Math.sin(progress * Math.PI * 6 + point.x * 0.008);
      const currentWidth = strokeWidth * layer.widthMult * pressureVariation;
      
      // Use different colors for different layers
      const colorIndex = (layerIndex + Math.floor(i / 3)) % colorVariations.length;
      ctx.strokeStyle = colorVariations[colorIndex];
      
      const seed = point.x * 200 + point.y * 100 + i + layerIndex * 1000;
      
      // Add random offset for waxy irregularity
      const offsetX = (seededRandom(seed) - 0.5) * layer.offsetRange;
      const offsetY = (seededRandom(seed + 1) - 0.5) * layer.offsetRange;
      
      ctx.globalAlpha = opacity * layer.alpha * (0.8 + 0.4 * seededRandom(seed + 2));
      ctx.lineWidth = currentWidth;
      
      ctx.beginPath();
      ctx.moveTo(point.x + offsetX, point.y + offsetY);
      ctx.lineTo(nextPoint.x + offsetX, nextPoint.y + offsetY);
      ctx.stroke();
      
      // Add streaky texture with thinner strokes
      if (layerIndex < 2) { // Only for first two layers
        const streakCount = Math.floor(currentWidth / 4);
        for (let s = 0; s < streakCount; s++) {
          const streakSeed = seed + s * 50;
          const streakOffset = (seededRandom(streakSeed) - 0.5) * currentWidth * 0.8;
          const perpX = -(nextPoint.y - point.y) / Math.sqrt((nextPoint.x - point.x) ** 2 + (nextPoint.y - point.y) ** 2) * streakOffset;
          const perpY = (nextPoint.x - point.x) / Math.sqrt((nextPoint.x - point.x) ** 2 + (nextPoint.y - point.y) ** 2) * streakOffset;
          
          ctx.globalAlpha = opacity * layer.alpha * 0.4;
          ctx.lineWidth = currentWidth * 0.2;
          ctx.beginPath();
          ctx.moveTo(point.x + perpX, point.y + perpY);
          ctx.lineTo(nextPoint.x + perpX, nextPoint.y + perpY);
          ctx.stroke();
        }
      }
    }
  });
  
  ctx.restore();
};

/**
 * Simple seeded random number generator for consistent patterns
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * Parses SVG path string to extract coordinate points
 */
function parsePathToPoints(path: string): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const commands = path.split(/[ML]/).filter(cmd => cmd.trim());
  
  commands.forEach((cmd) => {
    const coords = cmd.trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
    for (let i = 0; i < coords.length; i += 2) {
      if (i + 1 < coords.length) {
        points.push({ x: coords[i], y: coords[i + 1] });
      }
    }
  });
  
  return points;
}

/**
 * Interpolates between points to create smoother curves
 */
function interpolatePoints(points: { x: number; y: number }[], factor: number): { x: number; y: number }[] {
  if (points.length < 2) return points;
  
  const interpolated: { x: number; y: number }[] = [points[0]];
  
  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    
    // Add interpolated points between current and next
    for (let j = 1; j <= factor; j++) {
      const t = j / (factor + 1);
      interpolated.push({
        x: current.x + (next.x - current.x) * t,
        y: current.y + (next.y - current.y) * t
      });
    }
    
    interpolated.push(next);
  }
  
  return interpolated;
}

/**
 * Renders a spray stroke with dotted pattern using deterministic positioning
 */
export const renderSpray = (
  ctx: CanvasRenderingContext2D,
  path: string,
  strokeColor: string,
  strokeWidth: number,
  opacity: number
) => {
  ctx.save();
  
  // Parse the path to get approximate points
  const pathCommands = path.split(/[ML]/).filter(cmd => cmd.trim());
  
  ctx.fillStyle = strokeColor;
  
  pathCommands.forEach((cmd, cmdIndex) => {
    if (cmdIndex === 0) return; // Skip the first empty element
    
    const coords = cmd.trim().split(' ').map(Number).filter(n => !isNaN(n));
    if (coords.length >= 2) {
      const [x, y] = coords;
      
      // Create spray pattern around each point
      const sprayRadius = strokeWidth;
      const dotCount = Math.floor(strokeWidth * 3);
      
      for (let i = 0; i < dotCount; i++) {
        // Use deterministic seed based on position and dot index
        const seed = x * 1000 + y * 100 + i * 10 + cmdIndex;
        const angle = seededRandom(seed) * Math.PI * 2;
        const distance = seededRandom(seed + 1) * sprayRadius;
        const dotX = x + Math.cos(angle) * distance;
        const dotY = y + Math.sin(angle) * distance;
        const dotSize = seededRandom(seed + 2) * (strokeWidth * 0.15) + 0.5;
        
        // Vary opacity based on distance from center
        const distanceRatio = distance / sprayRadius;
        const dotOpacity = opacity * (1 - distanceRatio * 0.7);
        
        ctx.globalAlpha = dotOpacity;
        ctx.beginPath();
        ctx.arc(dotX, dotY, dotSize, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  });
  
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
