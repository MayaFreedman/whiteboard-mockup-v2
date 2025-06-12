
import { useEffect, useCallback } from 'react';
import { useWhiteboardStore } from '../stores/whiteboardStore';
import { useToolStore } from '../stores/toolStore';
import { WhiteboardObject } from '../types/whiteboard';
import { renderPaintbrush, renderChalk, renderSpray, renderCrayon } from '../utils/brushEffects';

/**
 * Custom hook for handling canvas rendering operations
 * Manages drawing of objects, backgrounds, and selection indicators
 */
export const useCanvasRendering = (canvas: HTMLCanvasElement | null, getCurrentDrawingPreview?: () => any) => {
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
    
    // Draw selection highlight FIRST (behind the object) if selected
    if (isSelected) {
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

          // Render based on brush type
          if (brushType === 'paintbrush') {
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
    
    ctx.restore();
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

    console.log('🎨 Canvas redrawn:', {
      objectCount: Object.keys(objects).length,
      selectedCount: selectedObjectIds.length,
      canvasSize: { width: canvas.width, height: canvas.height },
      hasPreview: !!getCurrentDrawingPreview?.()
    });
  }, [canvas, objects, selectedObjectIds, settings, toolSettings, renderAllObjects, renderDrawingPreview, getCurrentDrawingPreview]);

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
