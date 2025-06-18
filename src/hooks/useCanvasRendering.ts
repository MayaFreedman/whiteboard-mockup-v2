import { useEffect, useCallback } from 'react';
import { useWhiteboardStore } from '../stores/whiteboardStore';
import { useToolStore } from '../stores/toolStore';
import { WhiteboardObject } from '../types/whiteboard';
import { renderPaintbrush, renderChalk, renderSpray, renderCrayon } from '../utils/brushEffects';

/**
 * Custom hook for handling canvas rendering operations
 * Manages drawing of objects, backgrounds, and selection indicators
 */
export const useCanvasRendering = (canvas: HTMLCanvasElement | null, getCurrentDrawingPreview?: () => any, getCurrentShapePreview?: () => any) => {
  const { objects, selectedObjectIds, viewport, settings } = useWhiteboardStore();
  const { toolSettings } = useToolStore();

  /**
   * Renders a single whiteboard object on the canvas
   * @param ctx - Canvas rendering context
   * @param obj - Whiteboard object to render
   * @param isSelected - Whether the object is currently selected
   */
  const renderObject = useCallback((ctx: CanvasRenderingContext2D, obj: WhiteboardObject, isSelected: boolean = false) => {
    ctx.save();
    
    // Apply object transformations
    ctx.globalAlpha = obj.opacity || 1;
    
    // Check if this is an eraser object
    const isEraser = obj.data?.isEraser;
    if (isEraser) {
      // Set blend mode for eraser objects - this removes pixels
      ctx.globalCompositeOperation = 'destination-out';
    }
    
    // Draw selection highlight FIRST (behind the object) if selected and not an eraser
    if (isSelected && !isEraser) {
      ctx.save();
      ctx.strokeStyle = '#007AFF';
      ctx.globalAlpha = 0.6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      switch (obj.type) {
        case 'path': {
          if (obj.data?.path) {
            // Draw the exact same path but with a thicker blue stroke
            ctx.translate(obj.x, obj.y);
            const path = new Path2D(obj.data.path);
            ctx.lineWidth = (obj.strokeWidth || 2) + 6; // Add 6px to the original stroke width
            ctx.stroke(path);
          }
          break;
        }
        case 'rectangle': {
          if (obj.width && obj.height) {
            // Draw the exact same rectangle but with thicker blue stroke
            ctx.lineWidth = (obj.strokeWidth || 2) + 6;
            ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
          }
          break;
        }
        case 'circle': {
          if (obj.width) {
            // Draw the exact same circle but with thicker blue stroke
            const radius = obj.width / 2;
            const centerX = obj.x + radius;
            const centerY = obj.y + radius;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            ctx.lineWidth = (obj.strokeWidth || 2) + 6;
            ctx.stroke();
          }
          break;
        }
        case 'text': {
          if (obj.data?.content) {
            // For text, draw a bounding box with blue outline
            const fontSize = obj.data.fontSize || 16;
            const textWidth = ctx.measureText(obj.data.content).width;
            ctx.lineWidth = 3;
            const padding = 3;
            ctx.strokeRect(obj.x - padding, obj.y - fontSize - padding, textWidth + (padding * 2), fontSize + (padding * 2));
          }
          break;
        }
      }
      ctx.restore();
    }
    
    // Now draw the actual object ON TOP of the selection highlight
    switch (obj.type) {
      case 'path': {
        if (obj.data?.path) {
          // For paths, we need to apply translation and then draw the relative path
          ctx.translate(obj.x, obj.y);
          
          const brushType = obj.data?.brushType;
          const strokeColor = obj.stroke || '#000000';
          const strokeWidth = obj.strokeWidth || 2;
          const opacity = obj.opacity || 1;

          // Render based on brush type or if it's an eraser
          if (isEraser) {
            // Render eraser as a solid path with round caps for smooth erasing
            const path = new Path2D(obj.data.path);
            ctx.strokeStyle = '#000000'; // Color doesn't matter for destination-out
            ctx.lineWidth = strokeWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke(path);
          } else if (brushType === 'paintbrush') {
            renderPaintbrush(ctx, obj.data.path, strokeColor, strokeWidth, opacity);
          } else if (brushType === 'chalk') {
            renderChalk(ctx, obj.data.path, strokeColor, strokeWidth, opacity);
          } else if (brushType === 'spray') {
            renderSpray(ctx, obj.data.path, strokeColor, strokeWidth, opacity);
          } else if (brushType === 'crayon') {
            renderCrayon(ctx, obj.data.path, strokeColor, strokeWidth, opacity);
          } else {
            // Default rendering for pencil or unknown brush types
            const path = new Path2D(obj.data.path);
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = strokeWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke(path);
          }
        }
        break;
      }

      case 'rectangle': {
        if (obj.width && obj.height) {
          // Draw the original object
          if (obj.fill && obj.fill !== 'none') {
            ctx.fillStyle = obj.fill;
            ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
          }
          if (obj.stroke) {
            ctx.strokeStyle = obj.stroke;
            ctx.lineWidth = obj.strokeWidth || 2;
            ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
          }
        }
        break;
      }

      case 'circle': {
        if (obj.width) {
          const radius = obj.width / 2;
          const centerX = obj.x + radius;
          const centerY = obj.y + radius;
          
          // Draw the original object
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
          
          if (obj.fill && obj.fill !== 'none') {
            ctx.fillStyle = obj.fill;
            ctx.fill();
          }
          if (obj.stroke) {
            ctx.strokeStyle = obj.stroke;
            ctx.lineWidth = obj.strokeWidth || 2;
            ctx.stroke();
          }
        }
        break;
      }

      case 'text': {
        if (obj.data?.content) {
          ctx.fillStyle = obj.fill || '#000000';
          ctx.font = `${obj.data.fontSize || 16}px ${obj.data.fontFamily || 'Arial'}`;
          ctx.fillText(obj.data.content, obj.x, obj.y);
        }
        break;
      }
    }

    ctx.restore();
  }, []);

  /**
   * Renders the current drawing preview (work-in-progress path)
   * @param ctx - Canvas rendering context
   * @param preview - Drawing preview data
   */
  const renderDrawingPreview = useCallback((ctx: CanvasRenderingContext2D, preview: any) => {
    if (!preview) return;
    
    ctx.save();
    ctx.translate(preview.startX, preview.startY);
    
    // Check if this is an eraser preview
    if (preview.isEraser) {
      // Render eraser preview with a semi-transparent red outline to show where it will erase
      ctx.globalCompositeOperation = 'source-over'; // Normal blend for preview
      ctx.strokeStyle = preview.strokeColor;
      ctx.lineWidth = preview.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = preview.opacity;
      
      const path = new Path2D(preview.path);
      ctx.stroke(path);
    } else {
      const brushType = preview.brushType;
      
      // Render preview based on brush type
      if (brushType === 'paintbrush') {
        renderPaintbrush(ctx, preview.path, preview.strokeColor, preview.strokeWidth, preview.opacity);
      } else if (brushType === 'chalk') {
        renderChalk(ctx, preview.path, preview.strokeColor, preview.strokeWidth, preview.opacity);
      } else if (brushType === 'spray') {
        renderSpray(ctx, preview.path, preview.strokeColor, preview.strokeWidth, preview.opacity);
      } else if (brushType === 'crayon') {
        renderCrayon(ctx, preview.path, preview.strokeColor, preview.strokeWidth, preview.opacity);
      } else {
        // Default rendering for pencil
        const path = new Path2D(preview.path);
        ctx.strokeStyle = preview.strokeColor;
        ctx.lineWidth = preview.strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = preview.opacity;
        ctx.stroke(path);
      }
    }
    
    ctx.restore();
  }, []);

  /**
   * Renders the current shape preview (work-in-progress shape)
   * @param ctx - Canvas rendering context
   * @param preview - Shape preview data
   */
  const renderShapePreview = useCallback((ctx: CanvasRenderingContext2D, preview: any) => {
    if (!preview) return;
    
    ctx.save();
    ctx.globalAlpha = preview.opacity * 0.7; // Make preview slightly transparent
    
    const width = Math.abs(preview.endX - preview.startX);
    const height = Math.abs(preview.endY - preview.startY);
    const x = Math.min(preview.startX, preview.endX);
    const y = Math.min(preview.startY, preview.endY);
    
    // Set stroke and fill styles
    if (preview.strokeColor) {
      ctx.strokeStyle = preview.strokeColor;
      ctx.lineWidth = preview.strokeWidth;
    }
    if (preview.fillColor && preview.fillColor !== 'transparent') {
      ctx.fillStyle = preview.fillColor;
    }
    
    switch (preview.type) {
      case 'rectangle': {
        if (preview.fillColor && preview.fillColor !== 'transparent') {
          ctx.fillRect(x, y, width, height);
        }
        if (preview.strokeColor) {
          ctx.strokeRect(x, y, width, height);
        }
        break;
      }
      
      case 'circle': {
        const radius = Math.min(width, height) / 2;
        const centerX = x + width / 2;
        const centerY = y + height / 2;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        
        if (preview.fillColor && preview.fillColor !== 'transparent') {
          ctx.fill();
        }
        if (preview.strokeColor) {
          ctx.stroke();
        }
        break;
      }
      
      case 'triangle':
      case 'diamond':
      case 'pentagon':
      case 'hexagon':
      case 'star': {
        const shapePath = generateShapePathPreview(preview.type, x, y, width, height);
        if (shapePath) {
          const path = new Path2D(shapePath);
          
          if (preview.fillColor && preview.fillColor !== 'transparent') {
            ctx.fill(path);
          }
          if (preview.strokeColor) {
            ctx.stroke(path);
          }
        }
        break;
      }
    }
    
    ctx.restore();
  }, []);

  /**
   * Generates SVG path data for complex shape previews
   */
  const generateShapePathPreview = useCallback((shapeType: string, x: number, y: number, width: number, height: number): string => {
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    
    switch (shapeType) {
      case 'triangle':
        return `M ${centerX} ${y} L ${x + width} ${y + height} L ${x} ${y + height} Z`;
      
      case 'diamond':
        return `M ${centerX} ${y} L ${x + width} ${centerY} L ${centerX} ${y + height} L ${x} ${centerY} Z`;
      
      case 'pentagon': {
        const pentagonPoints = [];
        for (let i = 0; i < 5; i++) {
          const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
          const px = centerX + (Math.min(width, height) / 2) * Math.cos(angle);
          const py = centerY + (Math.min(width, height) / 2) * Math.sin(angle);
          pentagonPoints.push(`${i === 0 ? 'M' : 'L'} ${px} ${py}`);
        }
        return pentagonPoints.join(' ') + ' Z';
      }
      
      case 'hexagon': {
        const hexagonPoints = [];
        for (let i = 0; i < 6; i++) {
          const angle = (i * 2 * Math.PI) / 6;
          const px = centerX + (Math.min(width, height) / 2) * Math.cos(angle);
          const py = centerY + (Math.min(width, height) / 2) * Math.sin(angle);
          hexagonPoints.push(`${i === 0 ? 'M' : 'L'} ${px} ${py}`);
        }
        return hexagonPoints.join(' ') + ' Z';
      }
      
      case 'star': {
        const starPoints = [];
        const outerRadius = Math.min(width, height) / 2;
        const innerRadius = outerRadius * 0.4;
        
        for (let i = 0; i < 10; i++) {
          const angle = (i * Math.PI) / 5 - Math.PI / 2;
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const px = centerX + radius * Math.cos(angle);
          const py = centerY + radius * Math.sin(angle);
          starPoints.push(`${i === 0 ? 'M' : 'L'} ${px} ${py}`);
        }
        return starPoints.join(' ') + ' Z';
      }
      
      default:
        return '';
    }
  }, []);

  /**
   * Renders all whiteboard objects on the canvas
   * @param ctx - Canvas rendering context
   */
  const renderAllObjects = useCallback((ctx: CanvasRenderingContext2D) => {
    const objectEntries = Object.entries(objects);
    
    // Sort by creation time to maintain z-order
    objectEntries.sort(([, a], [, b]) => a.createdAt - b.createdAt);
    
    objectEntries.forEach(([id, obj]) => {
      const isSelected = selectedObjectIds.includes(id);
      renderObject(ctx, obj, isSelected);
    });
  }, [objects, selectedObjectIds, renderObject]);

  const redrawCanvas = useCallback(() => {
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match container
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Clear the entire canvas completely
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Reset any transformations
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Draw background patterns
    if (settings.gridVisible) {
      drawGrid(ctx, canvas.width, canvas.height);
    }

    if (toolSettings.showLinedPaper) {
      drawLinedPaper(ctx, canvas.width, canvas.height);
    }

    if (toolSettings.showDots) {
      drawDots(ctx, canvas.width, canvas.height);
    }

    // Draw all objects with their current positions
    renderAllObjects(ctx);

    // Draw current drawing preview if available
    if (getCurrentDrawingPreview) {
      const preview = getCurrentDrawingPreview();
      if (preview) {
        renderDrawingPreview(ctx, preview);
      }
    }

    // Draw current shape preview if available
    if (getCurrentShapePreview) {
      const shapePreview = getCurrentShapePreview();
      if (shapePreview) {
        renderShapePreview(ctx, shapePreview);
      }
    }

    console.log('🎨 Canvas redrawn:', {
      objectCount: Object.keys(objects).length,
      selectedCount: selectedObjectIds.length,
      canvasSize: { width: canvas.width, height: canvas.height },
      hasDrawingPreview: !!getCurrentDrawingPreview?.(),
      hasShapePreview: !!getCurrentShapePreview?.()
    });
  }, [canvas, objects, selectedObjectIds, settings, toolSettings, renderAllObjects, renderDrawingPreview, renderShapePreview, getCurrentDrawingPreview, getCurrentShapePreview]);

  // Auto-redraw when state changes
  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  return {
    redrawCanvas,
    renderObject,
    renderAllObjects
  };
};

/**
 * Draws a grid pattern on the canvas
 * @param ctx - Canvas rendering context
 * @param width - Canvas width
 * @param height - Canvas height
 */
const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number): void => {
  const GRID_SIZE = 20;
  const GRID_COLOR = '#e5e7eb';
  
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 1;

  // Draw vertical lines
  for (let x = 0; x <= width; x += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  // Draw horizontal lines
  for (let y = 0; y <= height; y += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
};

const drawLinedPaper = (ctx: CanvasRenderingContext2D, width: number, height: number): void => {
  const LINE_SPACING = 24;
  const LINE_COLOR = '#ddd6fe';
  
  ctx.strokeStyle = LINE_COLOR;
  ctx.lineWidth = 1;

  for (let y = LINE_SPACING; y <= height; y += LINE_SPACING) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
};

const drawDots = (ctx: CanvasRenderingContext2D, width: number, height: number): void => {
  const DOT_SPACING = 20;
  const DOT_COLOR = '#d1d5db';
  const DOT_RADIUS = 1;
  
  ctx.fillStyle = DOT_COLOR;
  
  for (let x = DOT_SPACING; x <= width; x += DOT_SPACING) {
    for (let y = DOT_SPACING; y <= height; y += DOT_SPACING) {
      ctx.beginPath();
      ctx.arc(x, y, DOT_RADIUS, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
};
