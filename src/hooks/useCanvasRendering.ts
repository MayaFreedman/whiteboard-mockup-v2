
import { useEffect, useRef, useCallback } from 'react';
import { useWhiteboardStore } from '../stores/whiteboardStore';
import { useToolStore } from '../stores/toolStore';
import { WhiteboardObject } from '../types/whiteboard';

/**
 * Custom hook for handling canvas rendering operations
 * Manages the drawing of objects, backgrounds, and previews on the canvas
 */
export const useCanvasRendering = (
  canvas: HTMLCanvasElement | null,
  getCurrentDrawingPreview: () => any,
  getCurrentShapePreview: () => any,
  editingTextId: string | null,
  editingText: string
) => {
  const { objects, viewport, settings } = useWhiteboardStore();
  const { toolSettings } = useToolStore();
  const animationFrameRef = useRef<number>();

  /**
   * Draws the background pattern on the canvas
   */
  const drawBackground = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = settings.backgroundColor;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    if (settings.gridVisible) {
      const gridSize = 20;
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 0.5;

      for (let x = 0; x < ctx.canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, ctx.canvas.height);
        ctx.stroke();
      }

      for (let y = 0; y < ctx.canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(ctx.canvas.width, y);
        ctx.stroke();
      }
    }
  }, [settings.backgroundColor, settings.gridVisible]);

  /**
   * Renders text with rotation support
   */
  const renderText = useCallback((ctx: CanvasRenderingContext2D, obj: WhiteboardObject) => {
    if (!obj.width || !obj.height || !obj.data?.content) return;

    const rotation = obj.rotation || 0;
    const centerX = obj.x + obj.width / 2;
    const centerY = obj.y + obj.height / 2;

    ctx.save();
    
    // Apply rotation around the center of the text box
    if (rotation !== 0) {
      ctx.translate(centerX, centerY);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-centerX, -centerY);
    }

    // Set text properties
    const fontSize = obj.data.fontSize || 16;
    const fontFamily = obj.data.fontFamily || 'Arial';
    const bold = obj.data.bold ? 'bold' : 'normal';
    const italic = obj.data.italic ? 'italic' : 'normal';
    
    ctx.font = `${italic} ${bold} ${fontSize}px ${fontFamily}`;
    ctx.fillStyle = obj.stroke || '#000000';
    ctx.textAlign = obj.data.textAlign || 'left';
    ctx.textBaseline = 'top';

    // Calculate line height
    const lineHeight = fontSize * 1.2;
    const lines = obj.data.content.split('\n');
    
    // Draw each line with proper wrapping
    lines.forEach((line, lineIndex) => {
      const words = line.split(' ');
      let currentLine = '';
      let lineY = obj.y + 4 + (lineIndex * lineHeight);
      
      for (let i = 0; i < words.length; i++) {
        const testLine = currentLine + (currentLine ? ' ' : '') + words[i];
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > obj.width - 8 && currentLine !== '') {
          // Draw current line and start new one
          const textX = obj.data.textAlign === 'center' ? obj.x + obj.width / 2 :
                       obj.data.textAlign === 'right' ? obj.x + obj.width - 4 : obj.x + 4;
          ctx.fillText(currentLine, textX, lineY);
          currentLine = words[i];
          lineY += lineHeight;
        } else {
          currentLine = testLine;
        }
      }
      
      // Draw the last line
      if (currentLine) {
        const textX = obj.data.textAlign === 'center' ? obj.x + obj.width / 2 :
                     obj.data.textAlign === 'right' ? obj.x + obj.width - 4 : obj.x + 4;
        ctx.fillText(currentLine, textX, lineY);
      }
    });

    ctx.restore();
  }, []);

  /**
   * Renders images (stamps) with rotation support
   */
  const renderImage = useCallback((ctx: CanvasRenderingContext2D, obj: WhiteboardObject) => {
    if (!obj.width || !obj.height || !obj.data?.src) return;

    const rotation = obj.rotation || 0;
    const centerX = obj.x + obj.width / 2;
    const centerY = obj.y + obj.height / 2;

    const img = new Image();
    img.onload = () => {
      ctx.save();
      
      // Apply rotation around the center of the image
      if (rotation !== 0) {
        ctx.translate(centerX, centerY);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.translate(-centerX, -centerY);
      }

      ctx.globalAlpha = obj.opacity || 1;
      ctx.drawImage(img, obj.x, obj.y, obj.width, obj.height);
      ctx.restore();
    };
    img.src = obj.data.src;
  }, []);

  /**
   * Renders shapes with rotation support
   */
  const renderShape = useCallback((ctx: CanvasRenderingContext2D, obj: WhiteboardObject) => {
    if (!obj.width || !obj.height) return;

    const rotation = obj.rotation || 0;
    const centerX = obj.x + obj.width / 2;
    const centerY = obj.y + obj.height / 2;

    ctx.save();
    
    // Apply rotation around the center of the shape
    if (rotation !== 0) {
      ctx.translate(centerX, centerY);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-centerX, -centerY);
    }

    ctx.strokeStyle = obj.stroke || '#000000';
    ctx.fillStyle = obj.fill || 'transparent';
    ctx.lineWidth = obj.strokeWidth || 2;
    ctx.globalAlpha = obj.opacity || 1;

    ctx.beginPath();

    switch (obj.type) {
      case 'rectangle':
        ctx.rect(obj.x, obj.y, obj.width, obj.height);
        break;
      case 'circle':
        const radiusX = obj.width / 2;
        const radiusY = obj.height / 2;
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
        break;
      case 'triangle':
        ctx.moveTo(obj.x + obj.width / 2, obj.y);
        ctx.lineTo(obj.x + obj.width, obj.y + obj.height);
        ctx.lineTo(obj.x, obj.y + obj.height);
        ctx.closePath();
        break;
      case 'diamond':
        ctx.moveTo(obj.x + obj.width / 2, obj.y);
        ctx.lineTo(obj.x + obj.width, obj.y + obj.height / 2);
        ctx.lineTo(obj.x + obj.width / 2, obj.y + obj.height);
        ctx.lineTo(obj.x, obj.y + obj.height / 2);
        ctx.closePath();
        break;
      case 'pentagon':
        for (let i = 0; i < 5; i++) {
          const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
          const px = centerX + (obj.width / 2) * Math.cos(angle);
          const py = centerY + (obj.height / 2) * Math.sin(angle);
          if (i === 0) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.closePath();
        break;
      case 'hexagon':
        for (let i = 0; i < 6; i++) {
          const angle = (i * 2 * Math.PI) / 6;
          const px = centerX + (obj.width / 2) * Math.cos(angle);
          const py = centerY + (obj.height / 2) * Math.sin(angle);
          if (i === 0) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.closePath();
        break;
      case 'star':
        for (let i = 0; i < 10; i++) {
          const angle = (i * Math.PI) / 5 - Math.PI / 2;
          const outerRadiusX = obj.width / 2;
          const outerRadiusY = obj.height / 2;
          const innerRadiusX = outerRadiusX * 0.4;
          const innerRadiusY = outerRadiusY * 0.4;
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
        break;
      case 'heart':
        const heartWidth = obj.width;
        const heartHeight = obj.height;
        const topCurveHeight = heartHeight * 0.3;
        const centerXHeart = obj.x + obj.width / 2;
        
        ctx.moveTo(centerXHeart, obj.y + heartHeight * 0.3);
        // Left curve
        ctx.bezierCurveTo(
          centerXHeart, obj.y + topCurveHeight * 0.5,
          centerXHeart - heartWidth * 0.2, obj.y,
          centerXHeart - heartWidth * 0.4, obj.y
        );
        ctx.bezierCurveTo(
          centerXHeart - heartWidth * 0.6, obj.y,
          centerXHeart - heartWidth * 0.8, obj.y + topCurveHeight * 0.5,
          centerXHeart - heartWidth * 0.5, obj.y + topCurveHeight
        );
        // Left side to bottom
        ctx.bezierCurveTo(
          centerXHeart - heartWidth * 0.5, obj.y + topCurveHeight,
          centerXHeart, obj.y + heartHeight * 0.6,
          centerXHeart, obj.y + heartHeight
        );
        // Right side to bottom
        ctx.bezierCurveTo(
          centerXHeart, obj.y + heartHeight * 0.6,
          centerXHeart + heartWidth * 0.5, obj.y + topCurveHeight,
          centerXHeart + heartWidth * 0.5, obj.y + topCurveHeight
        );
        // Right curve
        ctx.bezierCurveTo(
          centerXHeart + heartWidth * 0.8, obj.y + topCurveHeight * 0.5,
          centerXHeart + heartWidth * 0.6, obj.y,
          centerXHeart + heartWidth * 0.4, obj.y
        );
        ctx.bezierCurveTo(
          centerXHeart + heartWidth * 0.2, obj.y,
          centerXHeart, obj.y + topCurveHeight * 0.5,
          centerXHeart, obj.y + heartHeight * 0.3
        );
        ctx.closePath();
        break;
    }

    if (obj.fill && obj.fill !== 'none' && obj.fill !== 'transparent') {
      ctx.fill();
    }
    ctx.stroke();
    ctx.restore();
  }, []);

  /**
   * Renders a path object on the canvas
   */
  const renderPath = useCallback((ctx: CanvasRenderingContext2D, obj: WhiteboardObject) => {
    if (!obj.data?.path) return;

    ctx.strokeStyle = obj.stroke || '#000000';
    ctx.lineWidth = obj.strokeWidth || 2;
    ctx.globalAlpha = obj.opacity || 1;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const path = new Path2D(obj.data.path);
    ctx.stroke(path);
  }, []);

  /**
   * Main rendering function that draws all objects on the canvas
   */
  const redrawCanvas = useCallback(() => {
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply viewport transformations
    ctx.save();
    ctx.translate(viewport.x, viewport.y);
    ctx.scale(viewport.zoom, viewport.zoom);

    // Draw background
    drawBackground(ctx);

    // Render all objects with rotation support
    Object.values(objects).forEach(obj => {
      if (editingTextId === obj.id) return; // Skip rendering text being edited

      ctx.save();

      switch (obj.type) {
        case 'text':
          renderText(ctx, obj);
          break;
        case 'image':
          renderImage(ctx, obj);
          break;
        case 'rectangle':
        case 'circle':
        case 'triangle':
        case 'diamond':
        case 'pentagon':
        case 'hexagon':
        case 'star':
        case 'heart':
          renderShape(ctx, obj);
          break;
        case 'path':
          renderPath(ctx, obj);
          break;
      }

      ctx.restore();
    });

    // Render drawing preview
    const drawingPreview = getCurrentDrawingPreview();
    if (drawingPreview) {
      ctx.save();
      ctx.strokeStyle = drawingPreview.strokeColor;
      ctx.lineWidth = drawingPreview.strokeWidth;
      ctx.globalAlpha = drawingPreview.opacity;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const path = new Path2D(drawingPreview.path);
      ctx.stroke(path);
      ctx.restore();
    }

    // Render shape preview
    const shapePreview = getCurrentShapePreview();
    if (shapePreview) {
      ctx.save();
      ctx.strokeStyle = shapePreview.strokeColor;
      ctx.lineWidth = shapePreview.strokeWidth;
      ctx.globalAlpha = shapePreview.opacity;

      ctx.beginPath();
      switch (shapePreview.type) {
        case 'rectangle':
          ctx.rect(
            Math.min(shapePreview.startX, shapePreview.endX),
            Math.min(shapePreview.startY, shapePreview.endY),
            Math.abs(shapePreview.endX - shapePreview.startX),
            Math.abs(shapePreview.endY - shapePreview.startY)
          );
          break;
        case 'circle':
          const centerX = shapePreview.startX + (shapePreview.endX - shapePreview.startX) / 2;
          const centerY = shapePreview.startY + (shapePreview.endY - shapePreview.startY) / 2;
          const radiusX = Math.abs(shapePreview.endX - shapePreview.startX) / 2;
          const radiusY = Math.abs(shapePreview.endY - shapePreview.startY) / 2;
          ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
          break;
      }
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }, [canvas, objects, viewport, settings, toolSettings, editingTextId, editingText, renderText, renderImage, renderShape, renderPath, drawBackground, getCurrentDrawingPreview, getCurrentShapePreview]);

  useEffect(() => {
    if (!canvas) return;

    const renderLoop = () => {
      redrawCanvas();
      animationFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animationFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [redrawCanvas, canvas]);

  return { redrawCanvas };
};
