import { useEffect, useCallback } from 'react';
import { useWhiteboardStore } from '../stores/whiteboardStore';
import { useToolStore } from '../stores/toolStore';
import { renderTriangle, renderDiamond, renderPentagon, renderHexagon, renderStar, renderHeart } from '../utils/shapeRendering';

interface UseCanvasRenderingProps {
  canvas: HTMLCanvasElement | null;
  getCurrentDrawingPreview?: () => Array<{ x: number; y: number }> | null;
  getCurrentShapePreview?: () => { x: number; y: number; width: number; height: number } | null;
  editingTextId?: string | null;
  editingText?: string;
}

export const useCanvasRendering = (
  canvas: HTMLCanvasElement | null,
  getCurrentDrawingPreview?: () => Array<{ x: number; y: number }> | null,
  getCurrentShapePreview?: () => { x: number; y: number; width: number; height: number } | null,
  editingTextId?: string | null,
  editingText?: string
) => {
  const { objects, viewport, selectedObjectIds } = useWhiteboardStore();
  const { toolSettings, activeTool } = useToolStore();

  const redrawCanvas = useCallback(() => {
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match container
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    ctx.scale(dpr, dpr);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Apply viewport transform
    ctx.save();
    ctx.translate(viewport.x, viewport.y);
    ctx.scale(viewport.zoom, viewport.zoom);

    // Set rendering quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw background patterns if enabled
    if (toolSettings.showGrid) {
      drawGrid(ctx, rect.width, rect.height);
    }
    if (toolSettings.showLinedPaper) {
      drawLinedPaper(ctx, rect.width, rect.height);
    }
    if (toolSettings.showDots) {
      drawDots(ctx, rect.width, rect.height);
    }

    // Draw all objects
    Object.entries(objects).forEach(([id, obj]) => {
      // Skip rendering text if it's being edited
      if (editingTextId === id) return;

      drawObject(ctx, obj);

      // Draw selection indicator
      if (selectedObjectIds.includes(id)) {
        drawSelectionIndicator(ctx, obj);
      }
    });

    // Draw drawing preview
    const drawingPreview = getCurrentDrawingPreview?.();
    if (drawingPreview && drawingPreview.length > 1) {
      drawPath(ctx, drawingPreview, toolSettings.strokeColor, toolSettings.strokeWidth);
    }

    // Draw shape preview
    const shapePreview = getCurrentShapePreview?.();
    if (shapePreview && activeTool !== 'select') {
      drawShapePreview(ctx, shapePreview, activeTool);
    }

    ctx.restore();
  }, [canvas, objects, viewport, selectedObjectIds, toolSettings, activeTool, getCurrentDrawingPreview, getCurrentShapePreview, editingTextId]);

  const drawObject = (ctx: CanvasRenderingContext2D, obj: any) => {
    ctx.save();
    
    if (obj.opacity !== undefined) {
      ctx.globalAlpha = obj.opacity;
    }

    switch (obj.type) {
      case 'rectangle':
        // For rectangles, draw fill first, then stroke outside
        if (obj.fill && obj.fill !== 'none') {
          ctx.fillStyle = obj.fill;
          ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
        }
        if (obj.stroke && obj.stroke !== 'none') {
          ctx.strokeStyle = obj.stroke;
          ctx.lineWidth = obj.strokeWidth || 2;
          // Position stroke to not overlap with fill
          const strokeOffset = (obj.strokeWidth || 2) / 2;
          ctx.strokeRect(
            obj.x - strokeOffset, 
            obj.y - strokeOffset, 
            obj.width + (strokeOffset * 2), 
            obj.height + (strokeOffset * 2)
          );
        }
        break;

      case 'circle':
        const centerX = obj.x + obj.width / 2;
        const centerY = obj.y + obj.height / 2;
        const radius = Math.min(obj.width, obj.height) / 2;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        
        if (obj.fill && obj.fill !== 'none') {
          ctx.fillStyle = obj.fill;
          ctx.fill();
        }
        if (obj.stroke && obj.stroke !== 'none') {
          ctx.strokeStyle = obj.stroke;
          ctx.lineWidth = obj.strokeWidth || 2;
          // For circles, draw stroke with larger radius to avoid overlap
          const strokeOffset = (obj.strokeWidth || 2) / 2;
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius + strokeOffset, 0, Math.PI * 2);
          ctx.stroke();
        }
        break;

      case 'ellipse':
        const ellipseCenterX = obj.x + obj.width / 2;
        const ellipseCenterY = obj.y + obj.height / 2;
        const radiusX = obj.width / 2;
        const radiusY = obj.height / 2;
        
        ctx.beginPath();
        ctx.ellipse(ellipseCenterX, ellipseCenterY, radiusX, radiusY, 0, 0, Math.PI * 2);
        
        if (obj.fill && obj.fill !== 'none') {
          ctx.fillStyle = obj.fill;
          ctx.fill();
        }
        if (obj.stroke && obj.stroke !== 'none') {
          ctx.strokeStyle = obj.stroke;
          ctx.lineWidth = obj.strokeWidth || 2;
          // For ellipses, draw stroke with larger radii to avoid overlap
          const strokeOffset = (obj.strokeWidth || 2) / 2;
          ctx.beginPath();
          ctx.ellipse(
            ellipseCenterX, 
            ellipseCenterY, 
            radiusX + strokeOffset, 
            radiusY + strokeOffset, 
            0, 0, Math.PI * 2
          );
          ctx.stroke();
        }
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

      case 'line':
        if (obj.data?.points && obj.data.points.length > 1) {
          ctx.beginPath();
          ctx.moveTo(obj.x, obj.y);
          obj.data.points.forEach((point: { x: number; y: number }) => {
            ctx.lineTo(obj.x + point.x, obj.y + point.y);
          });
          ctx.strokeStyle = obj.stroke || toolSettings.strokeColor;
          ctx.lineWidth = obj.strokeWidth || toolSettings.strokeWidth;
          ctx.stroke();
        }
        break;

      case 'path':
        if (obj.data?.path) {
          ctx.beginPath();
          const path = new Path2D(obj.data.path);
          ctx.fillStyle = obj.fill || 'black';
          ctx.fill(path);
          if (obj.stroke && obj.stroke !== 'none') {
            ctx.strokeStyle = obj.stroke;
            ctx.lineWidth = obj.strokeWidth || 2;
            ctx.stroke(path);
          }
        }
        break;

      case 'text':
        ctx.font = `${obj.data?.fontSize || 16}px ${obj.data?.fontFamily || 'Arial'}`;
        ctx.fillStyle = obj.stroke || toolSettings.strokeColor;
        ctx.textAlign = obj.data?.textAlign || 'left';
        
        // Apply bold, italic, and underline styles
        let fontStyle = '';
        if (obj.data?.italic) fontStyle += 'italic ';
        if (obj.data?.bold) fontStyle += 'bold ';
        ctx.font = `${fontStyle}${obj.data?.fontSize || 16}px ${obj.data?.fontFamily || 'Arial'}`;
        
        // Calculate text baseline offset
        const textBaselineOffset = (obj.data?.fontSize || 16) / 4; // Adjust as needed
        
        // Get text content and split into lines
        const textContent = obj.data?.content || '';
        const lines = textContent.split('\n');
        
        // Render each line of text
        lines.forEach((line, index) => {
          const x = obj.x;
          const y = obj.y + (index * (obj.data?.fontSize || 16)) + textBaselineOffset;
          ctx.fillText(line, x, y);
          
          // Underline implementation
          if (obj.data?.underline) {
            const textWidth = ctx.measureText(line).width;
            const underlineOffset = 2; // Distance from the baseline
            const underlineY = y + underlineOffset;
            
            ctx.beginPath();
            ctx.strokeStyle = obj.stroke || toolSettings.strokeColor;
            ctx.lineWidth = 1; // Underline thickness
            ctx.moveTo(x, underlineY);
            ctx.lineTo(x + textWidth, underlineY);
            ctx.stroke();
          }
        });
        break;

      case 'stamp':
        if (obj.data?.url) {
          const img = new Image();
          img.src = obj.data.url;
          img.onload = () => {
            ctx.drawImage(img, obj.x, obj.y, obj.width, obj.height);
          };
          // If the image is already loaded, draw it immediately
          if (img.complete) {
            ctx.drawImage(img, obj.x, obj.y, obj.width, obj.height);
          }
        }
        break;
    }

    ctx.restore();
  };

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 0.5;
    const gridSize = 20;

    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  };

  const drawLinedPaper = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = '#eeeeee';
    ctx.lineWidth = 1;
    const lineSpacing = 24;

    for (let y = lineSpacing; y < height; y += lineSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  };

  const drawDots = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.fillStyle = '#cccccc';
    const dotSpacing = 20;
    const dotSize = 2;

    for (let x = dotSpacing; x < width; x += dotSpacing) {
      for (let y = dotSpacing; y < height; y += dotSpacing) {
        ctx.beginPath();
        ctx.arc(x, y, dotSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  const drawSelectionIndicator = (ctx: CanvasRenderingContext2D, obj: any) => {
    ctx.save();
    ctx.strokeStyle = '#007bff';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.lineDashOffset = Date.now() / 10; // Animate the dashed line

    // Expand selection area for stroked objects
    const expandStroke = obj.stroke && obj.stroke !== 'none' ? (obj.strokeWidth || 2) / 2 : 0;

    ctx.strokeRect(
      obj.x - 4 - expandStroke,
      obj.y - 4 - expandStroke,
      obj.width + 8 + (expandStroke * 2),
      obj.height + 8 + (expandStroke * 2)
    );
    ctx.restore();
  };

  const drawPath = (
    ctx: CanvasRenderingContext2D,
    points: Array<{ x: number; y: number }>,
    strokeColor: string,
    strokeWidth: number
  ) => {
    if (!points || points.length < 2) return;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();
  };

  const drawShapePreview = (ctx: CanvasRenderingContext2D, shapePreview: any, activeTool: string) => {
    ctx.save();
    ctx.globalAlpha = 0.5; // Make the preview semi-transparent

    switch (activeTool) {
      case 'rectangle':
        ctx.fillStyle = toolSettings.strokeColor;
        ctx.fillRect(shapePreview.x, shapePreview.y, shapePreview.width, shapePreview.height);
        break;
      case 'circle':
        const centerX = shapePreview.x + shapePreview.width / 2;
        const centerY = shapePreview.y + shapePreview.height / 2;
        const radius = Math.min(shapePreview.width, shapePreview.height) / 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fillStyle = toolSettings.strokeColor;
        ctx.fill();
        break;
      case 'ellipse':
        const ellipseCenterX = shapePreview.x + shapePreview.width / 2;
        const ellipseCenterY = shapePreview.y + shapePreview.height / 2;
        const radiusX = shapePreview.width / 2;
        const radiusY = shapePreview.height / 2;
        ctx.beginPath();
        ctx.ellipse(ellipseCenterX, ellipseCenterY, radiusX, radiusY, 0, 0, Math.PI * 2);
        ctx.fillStyle = toolSettings.strokeColor;
        ctx.fill();
        break;
      case 'triangle':
        renderTriangle(ctx, shapePreview.x, shapePreview.y, shapePreview.width, shapePreview.height, toolSettings.strokeColor);
        break;
      case 'diamond':
        renderDiamond(ctx, shapePreview.x, shapePreview.y, shapePreview.width, shapePreview.height, toolSettings.strokeColor);
        break;
      case 'pentagon':
        renderPentagon(ctx, shapePreview.x, shapePreview.y, shapePreview.width, shapePreview.height, toolSettings.strokeColor);
        break;
      case 'hexagon':
        renderHexagon(ctx, shapePreview.x, shapePreview.y, shapePreview.width, shapePreview.height, toolSettings.strokeColor);
        break;
      case 'star':
        renderStar(ctx, shapePreview.x, shapePreview.y, shapePreview.width, shapePreview.height, toolSettings.strokeColor);
        break;
      case 'heart':
        renderHeart(ctx, shapePreview.x, shapePreview.y, shapePreview.width, shapePreview.height, toolSettings.strokeColor);
        break;
      case 'line':
        // For line preview, we can't use shapePreview directly as it represents a rectangle
        // We need to access the last known mouse position from useCanvasInteractions
        break;
      default:
        break;
    }

    ctx.restore();
  };

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  return { redrawCanvas };
};
