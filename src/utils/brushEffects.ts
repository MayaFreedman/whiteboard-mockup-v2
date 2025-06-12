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
 * Renders a chalk stroke with rough, grainy texture
 */
export const renderChalk = (
  ctx: CanvasRenderingContext2D,
  path: string,
  strokeColor: string,
  strokeWidth: number,
  opacity: number
) => {
  ctx.save();
  
  // Main chalk stroke with reduced opacity
  ctx.globalAlpha = opacity * 0.7;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  const pathObj = new Path2D(path);
  ctx.stroke(pathObj);
  
  // Add chalk dust effect by drawing random small circles along the path
  ctx.globalAlpha = opacity * 0.3;
  ctx.fillStyle = strokeColor;
  
  // Parse the path to get approximate points for deterministic dust placement
  const pathCommands = path.split(/[ML]/).filter(cmd => cmd.trim());
  
  pathCommands.forEach((cmd, cmdIndex) => {
    if (cmdIndex === 0) return; // Skip the first empty element
    
    const coords = cmd.trim().split(' ').map(Number).filter(n => !isNaN(n));
    if (coords.length >= 2) {
      const [x, y] = coords;
      
      // Get dust density based on stroke width
      const dustDensity = Math.max(1, Math.floor(strokeWidth / 3));
      for (let i = 0; i < dustDensity * 5; i++) {
        // Use deterministic seed based on position and dust index
        const seed = x * 1000 + y * 100 + i * 10 + cmdIndex;
        const angle = seededRandom(seed) * Math.PI * 2;
        const distance = seededRandom(seed + 1) * strokeWidth * 0.8;
        const dustX = x + Math.cos(angle) * distance;
        const dustY = y + Math.sin(angle) * distance;
        const dustSize = seededRandom(seed + 2) * (strokeWidth * 0.2) + 1;
        
        ctx.beginPath();
        ctx.arc(dustX, dustY, dustSize, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  });
  
  ctx.restore();
};

/**
 * Simple seeded random number generator for consistent spray patterns
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
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
 * Renders a crayon stroke with waxy, textured appearance
 */
export const renderCrayon = (
  ctx: CanvasRenderingContext2D,
  path: string,
  strokeColor: string,
  strokeWidth: number,
  opacity: number
) => {
  ctx.save();
  
  const pathObj = new Path2D(path);
  
  // Use the first 50 characters of the path for a more stable hash during drawing
  // This prevents the hash from changing too dramatically as the path grows
  const stablePath = path.substring(0, 50);
  const pathHash = stablePath.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Draw multiple offset strokes for texture with deterministic offsets
  const offsets = [
    { x: 0, y: 0, alpha: 0.8 },
    { x: 0.5, y: 0.3, alpha: 0.4 },
    { x: -0.3, y: 0.5, alpha: 0.4 },
    { x: 0.2, y: -0.4, alpha: 0.3 }
  ];
  
  offsets.forEach((offset, index) => {
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.globalAlpha = opacity * offset.alpha;
    ctx.strokeStyle = strokeColor;
    // Use deterministic width variation based on stable path hash and offset index
    const widthSeed = pathHash + index * 100;
    const widthVariation = seededRandom(widthSeed) * 0.4;
    ctx.lineWidth = strokeWidth * (0.8 + widthVariation);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke(pathObj);
    ctx.restore();
  });
  
  // Add slight color variations by adjusting hue (deterministic)
  ctx.globalAlpha = opacity * 0.3;
  
  // Convert hex to HSL for color variation
  const hslColor = hexToHsl(strokeColor);
  if (hslColor) {
    // Use deterministic hue variation based on stable path hash
    const hueSeed = pathHash + 999;
    const hueVariation = (seededRandom(hueSeed) - 0.5) * 20;
    const variedHue = (hslColor.h + hueVariation) % 360;
    const variedColor = hslToHex(variedHue, hslColor.s, hslColor.l);
    ctx.strokeStyle = variedColor;
    ctx.lineWidth = strokeWidth * 0.6;
    ctx.stroke(pathObj);
  }
  
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
