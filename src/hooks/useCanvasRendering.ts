import { useCallback } from 'react';
import { useWhiteboardStore } from '../stores/whiteboardStore';
import { WhiteboardObject } from '../types/whiteboard';

export const useCanvasRendering = (
  canvas: HTMLCanvasElement | null,
  getCurrentDrawingPreview?: () => any,
  getCurrentShapePreview?: () => any
) => {
  const { viewport, objects, settings } = useWhiteboardStore();

  const renderPath = useCallback((ctx: CanvasRenderingContext2D, obj: WhiteboardObject) => {
    if (!obj.data?.path) return;

    ctx.save();
    ctx.beginPath();
    const path = new Path2D(obj.data.path);
    ctx.globalAlpha = obj.opacity || 1;
    ctx.strokeStyle = obj.stroke || '#000000';
    ctx.lineWidth = obj.strokeWidth || 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke(path);
    ctx.restore();
  }, []);

  const renderRectangle = useCallback((ctx: CanvasRenderingContext2D, obj: WhiteboardObject) => {
    if (!obj.width || !obj.height) return;

    ctx.save();
    ctx.globalAlpha = obj.opacity || 1;
    ctx.fillStyle = obj.fill || 'transparent';
    ctx.strokeStyle = obj.stroke || '#000000';
    ctx.lineWidth = obj.strokeWidth || 2;
    ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
    ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
    ctx.restore();
  }, []);

  const renderCircle = useCallback((ctx: CanvasRenderingContext2D, obj: WhiteboardObject) => {
    if (!obj.width || !obj.height) return;

    const centerX = obj.x + obj.width / 2;
    const centerY = obj.y + obj.height / 2;
    const radius = Math.min(obj.width, obj.height) / 2;

    ctx.save();
    ctx.globalAlpha = obj.opacity || 1;
    ctx.fillStyle = obj.fill || 'transparent';
    ctx.strokeStyle = obj.stroke || '#000000';
    ctx.lineWidth = obj.strokeWidth || 2;

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }, []);

  const renderTriangle = useCallback((ctx: CanvasRenderingContext2D, obj: WhiteboardObject) => {
    if (!obj.width || !obj.height) return;

    ctx.save();
    ctx.globalAlpha = obj.opacity || 1;
    ctx.fillStyle = obj.fill || 'transparent';
    ctx.strokeStyle = obj.stroke || '#000000';
    ctx.lineWidth = obj.strokeWidth || 2;

    ctx.beginPath();
    ctx.moveTo(obj.x + obj.width / 2, obj.y);
    ctx.lineTo(obj.x, obj.y + obj.height);
    ctx.lineTo(obj.x + obj.width, obj.y + obj.height);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }, []);

  const renderDiamond = useCallback((ctx: CanvasRenderingContext2D, obj: WhiteboardObject) => {
    if (!obj.width || !obj.height) return;

    ctx.save();
    ctx.globalAlpha = obj.opacity || 1;
    ctx.fillStyle = obj.fill || 'transparent';
    ctx.strokeStyle = obj.stroke || '#000000';
    ctx.lineWidth = obj.strokeWidth || 2;

    ctx.beginPath();
    ctx.moveTo(obj.x + obj.width / 2, obj.y);
    ctx.lineTo(obj.x + obj.width, obj.y + obj.height / 2);
    ctx.lineTo(obj.x + obj.width / 2, obj.y + obj.height);
    ctx.lineTo(obj.x, obj.y + obj.height / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }, []);

  const renderPentagon = useCallback((ctx: CanvasRenderingContext2D, obj: WhiteboardObject) => {
    if (!obj.width || !obj.height) return;

    const centerX = obj.x + obj.width / 2;
    const centerY = obj.y + obj.height / 2;
    const radius = Math.min(obj.width, obj.height) / 2;
    const angle = Math.PI / 2; // Start from the top

    ctx.save();
    ctx.globalAlpha = obj.opacity || 1;
    ctx.fillStyle = obj.fill || 'transparent';
    ctx.strokeStyle = obj.stroke || '#000000';
    ctx.lineWidth = obj.strokeWidth || 2;

    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const x = centerX + radius * Math.cos(angle + i * 2 * Math.PI / 5);
      const y = centerY + radius * Math.sin(angle + i * 2 * Math.PI / 5);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }, []);

  const renderHexagon = useCallback((ctx: CanvasRenderingContext2D, obj: WhiteboardObject) => {
    if (!obj.width || !obj.height) return;

    const centerX = obj.x + obj.width / 2;
    const centerY = obj.y + obj.height / 2;
    const radius = Math.min(obj.width, obj.height) / 2;
    const angle = Math.PI / 2; // Start from the top

    ctx.save();
    ctx.globalAlpha = obj.opacity || 1;
    ctx.fillStyle = obj.fill || 'transparent';
    ctx.strokeStyle = obj.stroke || '#000000';
    ctx.lineWidth = obj.strokeWidth || 2;

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const x = centerX + radius * Math.cos(angle + i * 2 * Math.PI / 6);
      const y = centerY + radius * Math.sin(angle + i * 2 * Math.PI / 6);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }, []);

  const renderStar = useCallback((ctx: CanvasRenderingContext2D, obj: WhiteboardObject) => {
    if (!obj.width || !obj.height) return;

    const centerX = obj.x + obj.width / 2;
    const centerY = obj.y + obj.height / 2;
    const outerRadius = Math.min(obj.width, obj.height) / 2;
    const innerRadius = outerRadius / 2.5;
    const points = 5;
    const angleOffset = Math.PI / 2; // Rotate the star so it points upwards

    ctx.save();
    ctx.globalAlpha = obj.opacity || 1;
    ctx.fillStyle = obj.fill || 'transparent';
    ctx.strokeStyle = obj.stroke || '#000000';
    ctx.lineWidth = obj.strokeWidth || 2;

    ctx.beginPath();
    for (let i = 0; i < 2 * points; i++) {
      const radius = (i % 2 === 0) ? outerRadius : innerRadius;
      const angle = angleOffset + i * Math.PI / points;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }, []);

  const renderHeart = useCallback((ctx: CanvasRenderingContext2D, obj: WhiteboardObject) => {
    if (!obj.width || !obj.height) return;

    const centerX = obj.x + obj.width / 2;
    const centerY = obj.y + obj.height / 2;
    const radius = Math.min(obj.width, obj.height) / 2;

    ctx.save();
    ctx.globalAlpha = obj.opacity || 1;
    ctx.fillStyle = obj.fill || 'transparent';
    ctx.strokeStyle = obj.stroke || '#000000';
    ctx.lineWidth = obj.strokeWidth || 2;

    ctx.beginPath();
    ctx.moveTo(centerX, centerY + radius / 4);
    ctx.bezierCurveTo(
      centerX, centerY - radius / 2,
      centerX + radius, centerY - radius / 2,
      centerX + radius, centerY + radius / 4
    );
    ctx.bezierCurveTo(
      centerX + radius, centerY + radius / 2,
      centerX, centerY + radius * 3 / 4,
      centerX, centerY + radius
    );
    ctx.bezierCurveTo(
      centerX, centerY + radius * 3 / 4,
      centerX - radius, centerY + radius / 2,
      centerX - radius, centerY + radius / 4
    );
    ctx.bezierCurveTo(
      centerX - radius, centerY - radius / 2,
      centerX, centerY - radius / 2,
      centerX, centerY + radius / 4
    );
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }, []);

  const renderText = useCallback((ctx: CanvasRenderingContext2D, obj: WhiteboardObject) => {
    if (!obj.width || !obj.height) return;

    const content = obj.data?.content || 'Double-click to edit';
    const fontSize = obj.data?.fontSize || 16;
    const fontFamily = obj.data?.fontFamily || 'Arial';
    const bold = obj.data?.bold ? 'bold' : 'normal';
    const italic = obj.data?.italic ? 'italic' : 'normal';
    const textAlign = obj.data?.textAlign || 'left';
    
    ctx.save();
    ctx.font = `${italic} ${bold} ${fontSize}px ${fontFamily}`;
    ctx.textBaseline = 'top';
    
    // Make placeholder text much lighter (very light gray)
    if (content === 'Double-click to edit') {
      ctx.fillStyle = '#d1d5db'; // Very light gray
      ctx.globalAlpha = 0.5; // Additional transparency
    } else {
      ctx.fillStyle = obj.stroke || '#000000';
      ctx.globalAlpha = obj.opacity || 1;
    }
    
    // Handle text alignment
    let textX = obj.x;
    if (textAlign === 'center') {
      textX = obj.x + obj.width / 2;
      ctx.textAlign = 'center';
    } else if (textAlign === 'right') {
      textX = obj.x + obj.width;
      ctx.textAlign = 'right';
    } else {
      ctx.textAlign = 'left';
    }
    
    // Draw text with word wrapping
    const words = content.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > obj.width && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
    
    // Draw each line
    lines.forEach((line, index) => {
      ctx.fillText(line, textX, obj.y + index * (fontSize * 1.2));
    });
    
    ctx.restore();
  }, []);

  const redrawCanvas = useCallback(() => {
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear the entire canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply background color
    ctx.save();
    ctx.fillStyle = settings.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Apply transformations based on viewport
    ctx.save();
    ctx.translate(viewport.x, viewport.y);
    ctx.scale(viewport.zoom, viewport.zoom);

    // Render objects
    Object.values(objects).forEach((obj) => {
      switch (obj.type) {
        case 'path':
          renderPath(ctx, obj);
          break;
        case 'rectangle':
          renderRectangle(ctx, obj);
          break;
        case 'circle':
          renderCircle(ctx, obj);
          break;
        case 'triangle':
          renderTriangle(ctx, obj);
          break;
        case 'diamond':
          renderDiamond(ctx, obj);
          break;
        case 'pentagon':
          renderPentagon(ctx, obj);
          break;
        case 'hexagon':
          renderHexagon(ctx, obj);
          break;
        case 'star':
          renderStar(ctx, obj);
          break;
        case 'heart':
          renderHeart(ctx, obj);
          break;
        case 'text':
          renderText(ctx, obj);
          break;
        default:
          console.warn(`Unknown object type: ${obj.type}`);
      }
    });

    // Render drawing preview
    if (getCurrentDrawingPreview) {
      getCurrentDrawingPreview()(ctx);
    }

    // Render shape preview
    if (getCurrentShapePreview) {
      getCurrentShapePreview()(ctx);
    }

    ctx.restore();
  }, [canvas, objects, viewport, settings, renderPath, renderRectangle, renderCircle, renderTriangle, renderDiamond, renderPentagon, renderHexagon, renderStar, renderHeart, renderText, getCurrentDrawingPreview, getCurrentShapePreview]);

  return { redrawCanvas };
};
