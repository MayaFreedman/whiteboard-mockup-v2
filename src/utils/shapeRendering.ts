
/**
 * Utility functions for rendering different shape types on canvas
 */

/**
 * Renders a triangle on the canvas context
 */
export const renderTriangle = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  stroke: string,
  fill: string,
  strokeWidth: number,
  opacity: number
) => {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = stroke;
  ctx.fillStyle = fill;
  ctx.lineWidth = strokeWidth;
  
  ctx.beginPath();
  ctx.moveTo(x + width / 2, y); // Top center
  ctx.lineTo(x + width, y + height); // Bottom right
  ctx.lineTo(x, y + height); // Bottom left
  ctx.closePath();
  
  if (fill && fill !== 'none') {
    ctx.fill();
  }
  if (stroke && stroke !== 'none') {
    ctx.stroke();
  }
  
  ctx.restore();
};

/**
 * Renders a diamond on the canvas context
 */
export const renderDiamond = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  stroke: string,
  fill: string,
  strokeWidth: number,
  opacity: number
) => {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = stroke;
  ctx.fillStyle = fill;
  ctx.lineWidth = strokeWidth;
  
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  
  ctx.beginPath();
  ctx.moveTo(centerX, y); // Top
  ctx.lineTo(x + width, centerY); // Right
  ctx.lineTo(centerX, y + height); // Bottom
  ctx.lineTo(x, centerY); // Left
  ctx.closePath();
  
  if (fill && fill !== 'none') {
    ctx.fill();
  }
  if (stroke && stroke !== 'none') {
    ctx.stroke();
  }
  
  ctx.restore();
};

/**
 * Renders a pentagon on the canvas context
 */
export const renderPentagon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  stroke: string,
  fill: string,
  strokeWidth: number,
  opacity: number
) => {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = stroke;
  ctx.fillStyle = fill;
  ctx.lineWidth = strokeWidth;
  
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
    const px = centerX + (width / 2) * Math.cos(angle);
    const py = centerY + (height / 2) * Math.sin(angle);
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
  
  if (fill && fill !== 'none') {
    ctx.fill();
  }
  if (stroke && stroke !== 'none') {
    ctx.stroke();
  }
  
  ctx.restore();
};

/**
 * Renders a hexagon on the canvas context
 */
export const renderHexagon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  stroke: string,
  fill: string,
  strokeWidth: number,
  opacity: number
) => {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = stroke;
  ctx.fillStyle = fill;
  ctx.lineWidth = strokeWidth;
  
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (i * 2 * Math.PI) / 6;
    const px = centerX + (width / 2) * Math.cos(angle);
    const py = centerY + (height / 2) * Math.sin(angle);
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
  
  if (fill && fill !== 'none') {
    ctx.fill();
  }
  if (stroke && stroke !== 'none') {
    ctx.stroke();
  }
  
  ctx.restore();
};

/**
 * Renders a star on the canvas context
 */
export const renderStar = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  stroke: string,
  fill: string,
  strokeWidth: number,
  opacity: number
) => {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = stroke;
  ctx.fillStyle = fill;
  ctx.lineWidth = strokeWidth;
  
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const outerRadiusX = width / 2;
  const outerRadiusY = height / 2;
  const innerRadiusX = outerRadiusX * 0.4;
  const innerRadiusY = outerRadiusY * 0.4;
  
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const radiusX = i % 2 === 0 ? outerRadiusX : innerRadiusX;
    const radiusY = i % 2 === 0 ? outerRadiusY : innerRadiusY;
    const px = centerX + radiusX * Math.cos(angle);
    const py = centerY + radiusY * Math.sin(angle);
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
  
  if (fill && fill !== 'none') {
    ctx.fill();
  }
  if (stroke && stroke !== 'none') {
    ctx.stroke();
  }
  
  ctx.restore();
};

/**
 * Renders a heart on the canvas context
 */
export const renderHeart = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  stroke: string,
  fill: string,
  strokeWidth: number,
  opacity: number
) => {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = stroke;
  ctx.fillStyle = fill;
  ctx.lineWidth = strokeWidth;
  
  const heartWidth = width;
  const heartHeight = height;
  const topCurveHeight = heartHeight * 0.3;
  const centerX = x + width / 2;
  
  ctx.beginPath();
  ctx.moveTo(centerX, y + heartHeight * 0.3);
  
  // Left curve
  ctx.bezierCurveTo(
    centerX, y + topCurveHeight * 0.5,
    centerX - heartWidth * 0.2, y,
    centerX - heartWidth * 0.4, y
  );
  ctx.bezierCurveTo(
    centerX - heartWidth * 0.6, y,
    centerX - heartWidth * 0.8, y + topCurveHeight * 0.5,
    centerX - heartWidth * 0.5, y + topCurveHeight
  );
  
  // Left side to bottom
  ctx.bezierCurveTo(
    centerX - heartWidth * 0.5, y + topCurveHeight,
    centerX, y + heartHeight * 0.6,
    centerX, y + heartHeight
  );
  
  // Right side from bottom
  ctx.bezierCurveTo(
    centerX, y + heartHeight * 0.6,
    centerX + heartWidth * 0.5, y + topCurveHeight,
    centerX + heartWidth * 0.5, y + topCurveHeight
  );
  
  // Right curve
  ctx.bezierCurveTo(
    centerX + heartWidth * 0.8, y + topCurveHeight * 0.5,
    centerX + heartWidth * 0.6, y,
    centerX + heartWidth * 0.4, y
  );
  ctx.bezierCurveTo(
    centerX + heartWidth * 0.2, y,
    centerX, y + topCurveHeight * 0.5,
    centerX, y + heartHeight * 0.3
  );
  
  ctx.closePath();
  
  if (fill && fill !== 'none') {
    ctx.fill();
  }
  if (stroke && stroke !== 'none') {
    ctx.stroke();
  }
  
  ctx.restore();
};
