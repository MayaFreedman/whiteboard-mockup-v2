/**
 * Utility functions for rendering complex shapes
 */

import { WhiteboardObject } from '../types/whiteboard';

/**
 * Main shape rendering function that delegates to specific shape renderers
 */
export const renderShape = (ctx: CanvasRenderingContext2D, obj: WhiteboardObject) => {
  if (!obj.width || !obj.height) return;

  ctx.save();
  ctx.globalAlpha = obj.opacity || 1;

  switch (obj.type) {
    case 'rectangle':
      renderRectangle(ctx, obj.x, obj.y, obj.width, obj.height, obj.fill, obj.stroke, obj.strokeWidth);
      break;
    case 'circle':
      renderCircle(ctx, obj.x, obj.y, obj.width, obj.height, obj.fill, obj.stroke, obj.strokeWidth);
      break;
    case 'triangle':
      renderTriangle(ctx, obj.x, obj.y, obj.width, obj.height, obj.fill, obj.stroke, obj.strokeWidth);
      break;
    case 'diamond':
      renderDiamond(ctx, obj.x, obj.y, obj.width, obj.height, obj.fill, obj.stroke, obj.strokeWidth);
      break;
    case 'pentagon':
      renderPentagon(ctx, obj.x, obj.y, obj.width, obj.height, obj.fill, obj.stroke, obj.strokeWidth);
      break;
    case 'hexagon':
      renderHexagon(ctx, obj.x, obj.y, obj.width, obj.height, obj.fill, obj.stroke, obj.strokeWidth);
      break;
    case 'star':
      renderStar(ctx, obj.x, obj.y, obj.width, obj.height, obj.fill, obj.stroke, obj.strokeWidth);
      break;
    case 'heart':
      renderHeart(ctx, obj.x, obj.y, obj.width, obj.height, obj.fill, obj.stroke, obj.strokeWidth);
      break;
  }

  ctx.restore();
};

/**
 * Renders a rectangle shape
 */
export const renderRectangle = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  fill?: string,
  stroke?: string,
  strokeWidth?: number
) => {
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  
  if (fill && fill !== 'none') {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth || 2;
    ctx.stroke();
  }
};

/**
 * Renders a circle shape
 */
export const renderCircle = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  fill?: string,
  stroke?: string,
  strokeWidth?: number
) => {
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const radiusX = width / 2;
  const radiusY = height / 2;
  
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
  
  if (fill && fill !== 'none') {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth || 2;
    ctx.stroke();
  }
};

/**
 * Renders a triangle shape
 */
export const renderTriangle = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  fill?: string,
  stroke?: string,
  strokeWidth?: number
) => {
  const centerX = x + width / 2;
  
  ctx.beginPath();
  ctx.moveTo(centerX, y);
  ctx.lineTo(x + width, y + height);
  ctx.lineTo(x, y + height);
  ctx.closePath();
  
  if (fill && fill !== 'none') {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth || 2;
    ctx.stroke();
  }
};

/**
 * Renders a diamond shape
 */
export const renderDiamond = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  fill?: string,
  stroke?: string,
  strokeWidth?: number
) => {
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  
  ctx.beginPath();
  ctx.moveTo(centerX, y);
  ctx.lineTo(x + width, centerY);
  ctx.lineTo(centerX, y + height);
  ctx.lineTo(x, centerY);
  ctx.closePath();
  
  if (fill && fill !== 'none') {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth || 2;
    ctx.stroke();
  }
};

/**
 * Renders a pentagon shape
 */
export const renderPentagon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  fill?: string,
  stroke?: string,
  strokeWidth?: number
) => {
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
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth || 2;
    ctx.stroke();
  }
};

/**
 * Renders a hexagon shape
 */
export const renderHexagon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  fill?: string,
  stroke?: string,
  strokeWidth?: number
) => {
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
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth || 2;
    ctx.stroke();
  }
};

/**
 * Renders a star shape
 */
export const renderStar = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  fill?: string,
  stroke?: string,
  strokeWidth?: number
) => {
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
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth || 2;
    ctx.stroke();
  }
};

/**
 * Renders a heart shape
 */
export const renderHeart = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  fill?: string,
  stroke?: string,
  strokeWidth?: number
) => {
  const centerX = x + width / 2;
  const topCurveHeight = height * 0.3;
  
  ctx.beginPath();
  ctx.moveTo(centerX, y + height * 0.3);
  // Left curve
  ctx.bezierCurveTo(
    centerX, y + topCurveHeight * 0.5,
    centerX - width * 0.2, y,
    centerX - width * 0.4, y
  );
  ctx.bezierCurveTo(
    centerX - width * 0.6, y,
    centerX - width * 0.8, y + topCurveHeight * 0.5,
    centerX - width * 0.5, y + topCurveHeight
  );
  // Left side to bottom
  ctx.bezierCurveTo(
    centerX - width * 0.5, y + topCurveHeight,
    centerX, y + height * 0.6,
    centerX, y + height
  );
  // Right side to bottom
  ctx.bezierCurveTo(
    centerX, y + height * 0.6,
    centerX + width * 0.5, y + topCurveHeight,
    centerX + width * 0.5, y + topCurveHeight
  );
  // Right curve
  ctx.bezierCurveTo(
    centerX + width * 0.8, y + topCurveHeight * 0.5,
    centerX + width * 0.6, y,
    centerX + width * 0.4, y
  );
  ctx.bezierCurveTo(
    centerX + width * 0.2, y,
    centerX, y + topCurveHeight * 0.5,
    centerX, y + height * 0.3
  );
  ctx.closePath();
  
  if (fill && fill !== 'none') {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth || 2;
    ctx.stroke();
  }
};

/**
 * Checks if a point is inside a triangle
 */
export const isPointInTriangle = (
  x: number,
  y: number,
  shapeX: number,
  shapeY: number,
  width: number,
  height: number
): boolean => {
  const centerX = shapeX + width / 2;
  const x1 = centerX, y1 = shapeY;
  const x2 = shapeX + width, y2 = shapeY + height;
  const x3 = shapeX, y3 = shapeY + height;
  
  const denominator = ((y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3));
  if (denominator === 0) return false;
  
  const a = ((y2 - y3) * (x - x3) + (x3 - x2) * (y - y3)) / denominator;
  const b = ((y3 - y1) * (x - x3) + (x1 - x3) * (y - y3)) / denominator;
  const c = 1 - a - b;
  
  return a >= 0 && b >= 0 && c >= 0;
};

/**
 * Checks if a point is inside a diamond
 */
export const isPointInDiamond = (
  x: number,
  y: number,
  shapeX: number,
  shapeY: number,
  width: number,
  height: number
): boolean => {
  const centerX = shapeX + width / 2;
  const centerY = shapeY + height / 2;
  
  // Transform to diamond coordinate system
  const dx = Math.abs(x - centerX) / (width / 2);
  const dy = Math.abs(y - centerY) / (height / 2);
  
  return dx + dy <= 1;
};

/**
 * Checks if a point is inside a polygon (for pentagon, hexagon, star)
 */
export const isPointInPolygon = (
  x: number,
  y: number,
  vertices: Array<{ x: number; y: number }>
): boolean => {
  let inside = false;
  
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].x, yi = vertices[i].y;
    const xj = vertices[j].x, yj = vertices[j].y;
    
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
};

/**
 * Gets vertices for a pentagon
 */
export const getPentagonVertices = (
  x: number,
  y: number,
  width: number,
  height: number
): Array<{ x: number; y: number }> => {
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const vertices = [];
  
  for (let i = 0; i < 5; i++) {
    const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
    vertices.push({
      x: centerX + (width / 2) * Math.cos(angle),
      y: centerY + (height / 2) * Math.sin(angle)
    });
  }
  
  return vertices;
};

/**
 * Gets vertices for a hexagon
 */
export const getHexagonVertices = (
  x: number,
  y: number,
  width: number,
  height: number
): Array<{ x: number; y: number }> => {
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const vertices = [];
  
  for (let i = 0; i < 6; i++) {
    const angle = (i * 2 * Math.PI) / 6;
    vertices.push({
      x: centerX + (width / 2) * Math.cos(angle),
      y: centerY + (height / 2) * Math.sin(angle)
    });
  }
  
  return vertices;
};

/**
 * Gets vertices for a star
 */
export const getStarVertices = (
  x: number,
  y: number,
  width: number,
  height: number
): Array<{ x: number; y: number }> => {
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const outerRadiusX = width / 2;
  const outerRadiusY = height / 2;
  const innerRadiusX = outerRadiusX * 0.4;
  const innerRadiusY = outerRadiusY * 0.4;
  const vertices = [];
  
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const radiusX = i % 2 === 0 ? outerRadiusX : innerRadiusX;
    const radiusY = i % 2 === 0 ? outerRadiusY : innerRadiusY;
    vertices.push({
      x: centerX + radiusX * Math.cos(angle),
      y: centerY + radiusY * Math.sin(angle)
    });
  }
  
  return vertices;
};
