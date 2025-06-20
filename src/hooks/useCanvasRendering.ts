import { useEffect, useCallback } from 'react';
import { useWhiteboardStore } from '../stores/whiteboardStore';
import { useToolStore } from '../stores/toolStore';
import { WhiteboardObject, TextData } from '../types/whiteboard';
import { renderPaintbrush, renderChalk, renderSpray, renderCrayon } from '../utils/brushEffects';
import { 
  renderTriangle, 
  renderDiamond, 
  renderPentagon, 
  renderHexagon, 
  renderStar, 
  renderHeart 
} from '../utils/shapeRendering';

/**
 * Custom hook for handling canvas rendering operations
 * Manages drawing of objects, backgrounds, and selection indicators
 */
export const useCanvasRendering = (
  canvas: HTMLCanvasElement | null, 
  getCurrentDrawingPreview?: () => any, 
  getCurrentShapePreview?: () => any,
  editingTextId?: string | null,
  editingText?: string
) => {
  const { objects, selectedObjectIds, viewport, settings } = useWhiteboardStore();
  const { toolSettings } = useToolStore();

  /**
   * Sets up canvas for crisp rendering with proper pixel alignment
   * @param canvas - Canvas element
   * @param ctx - Canvas rendering context
   */
  const setupCanvasForCrispRendering = useCallback((canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    // Get device pixel ratio for high-DPI displays
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    // Get the display size (CSS pixels)
    const displayWidth = Math.floor(canvas.offsetWidth);
    const displayHeight = Math.floor(canvas.offsetHeight);
    
    // Set the actual size in memory (scaled up for high-DPI)
    canvas.width = displayWidth * devicePixelRatio;
    canvas.height = displayHeight * devicePixelRatio;
    
    // Scale the canvas back down using CSS
    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';
    
    // Scale the drawing context so everything draws at the correct size
    ctx.scale(devicePixelRatio, devicePixelRatio);
    
    // Configure text rendering for crisp display
    ctx.textBaseline = 'top';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Enable font smoothing
    if ('textRenderingOptimizeSpeed' in ctx) {
      (ctx as any).textRenderingOptimizeSpeed = false;
    }
  }, []);

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
          if (obj.width && obj.height) {
            // Draw the exact same ellipse but with thicker blue stroke
            const radiusX = obj.width / 2;
            const radiusY = obj.height / 2;
            const centerX = obj.x + radiusX;
            const centerY = obj.y + radiusY;
            ctx.beginPath();
            ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
            ctx.lineWidth = (obj.strokeWidth || 2) + 6;
            ctx.stroke();
          }
          break;
        }
        case 'triangle':
        case 'diamond':
        case 'pentagon':
        case 'hexagon':
        case 'star':
        case 'heart': {
          if (obj.width && obj.height) {
            // Draw selection outline for complex shapes
            ctx.lineWidth = (obj.strokeWidth || 2) + 6;
            
            // Render the shape outline with thick blue stroke
            switch (obj.type) {
              case 'triangle':
                renderTriangle(ctx, obj.x, obj.y, obj.width, obj.height, undefined, '#007AFF', ctx.lineWidth);
                break;
              case 'diamond':
                renderDiamond(ctx, obj.x, obj.y, obj.width, obj.height, undefined, '#007AFF', ctx.lineWidth);
                break;
              case 'pentagon':
                renderPentagon(ctx, obj.x, obj.y, obj.width, obj.height, undefined, '#007AFF', ctx.lineWidth);
                break;
              case 'hexagon':
                renderHexagon(ctx, obj.x, obj.y, obj.width, obj.height, undefined, '#007AFF', ctx.lineWidth);
                break;
              case 'star':
                renderStar(ctx, obj.x, obj.y, obj.width, obj.height, undefined, '#007AFF', ctx.lineWidth);
                break;
              case 'heart':
                renderHeart(ctx, obj.x, obj.y, obj.width, obj.height, undefined, '#007AFF', ctx.lineWidth);
                break;
            }
          }
          break;
        }
        case 'text': {
          if (obj.data?.content && obj.width && obj.height) {
            // For text, draw a bounding box with blue outline - align with dashed selection border
            ctx.lineWidth = 3;
            ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
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
          const radiusX = obj.width / 2;
          const radiusY = obj.height / 2;
          const centerX = obj.x + radiusX;
          const centerY = obj.y + radiusY;
          
          // Draw the original object as an ellipse
          ctx.beginPath();
          ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
          
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

      case 'triangle': {
        if (obj.width && obj.height) {
          renderTriangle(ctx, obj.x, obj.y, obj.width, obj.height, obj.fill, obj.stroke, obj.strokeWidth);
        }
        break;
      }

      case 'diamond': {
        if (obj.width && obj.height) {
          renderDiamond(ctx, obj.x, obj.y, obj.width, obj.height, obj.fill, obj.stroke, obj.strokeWidth);
        }
        break;
      }

      case 'pentagon': {
        if (obj.width && obj.height) {
          renderPentagon(ctx, obj.x, obj.y, obj.width, obj.height, obj.fill, obj.stroke, obj.strokeWidth);
        }
        break;
      }

      case 'hexagon': {
        if (obj.width && obj.height) {
          renderHexagon(ctx, obj.x, obj.y, obj.width, obj.height, obj.fill, obj.stroke, obj.strokeWidth);
        }
        break;
      }

      case 'star': {
        if (obj.width && obj.height) {
          renderStar(ctx, obj.x, obj.y, obj.width, obj.height, obj.fill, obj.stroke, obj.strokeWidth);
        }
        break;
      }

      case 'heart': {
        if (obj.width && obj.height) {
          renderHeart(ctx, obj.x, obj.y, obj.width, obj.height, obj.fill, obj.stroke, obj.strokeWidth);
        }
        break;
      }

      case 'text': {
        if (obj.data?.content && obj.width && obj.height) {
          const textData = obj.data as TextData;
          
          // Get the text content to render - use live editing text if this object is being edited
          const isBeingEdited = editingTextId === Object.keys(objects).find(id => objects[id] === obj);
          let contentToRender = isBeingEdited && editingText !== undefined ? editingText : textData.content;
          
          // Always show placeholder for empty content
          if (!contentToRender || contentToRender.trim() === '') {
            contentToRender = 'Double-click to edit';
          }
          
          // Set font properties
          let fontStyle = '';
          if (textData.italic) fontStyle += 'italic ';
          if (textData.bold) fontStyle += 'bold ';
          
          ctx.font = `${fontStyle}${textData.fontSize}px ${textData.fontFamily}`;
          ctx.fillStyle = obj.stroke || '#000000';
          ctx.textBaseline = 'top';
          
          // Handle text alignment
          switch (textData.textAlign) {
            case 'left':
              ctx.textAlign = 'left';  
              break;
            case 'center':
              ctx.textAlign = 'center';
              break;
            case 'right':
              ctx.textAlign = 'right';
              break;
            default:
              ctx.textAlign = 'left';
          }
          
          // Calculate pixel-aligned text positions - use consistent 4px top padding
          const textXBase = Math.round(obj.x + 4); // Add 4px left padding to match textarea
          const textYBase = Math.round(obj.y + 4); // 4px padding from top
          
          let textX = textXBase;
          if (textData.textAlign === 'center') {
            textX = Math.round(obj.x + obj.width / 2);
          } else if (textData.textAlign === 'right') {
            textX = Math.round(obj.x + obj.width - 4); // Subtract right padding
          }
          
          // Render text naturally without forced word wrapping
          const lineHeight = Math.round(textData.fontSize * 1.2);
          const lines = contentToRender.split('\n');
          
          for (let i = 0; i < lines.length; i++) {
            const lineY = Math.round(textYBase + (i * lineHeight));
            ctx.fillText(lines[i], textX, lineY);
          }
          
          // Draw underline if enabled - using accurate text measurements
          if (textData.underline && contentToRender !== 'Double-click to edit') {
            ctx.save();
            ctx.strokeStyle = obj.stroke || '#000000';
            ctx.lineWidth = 1;
            
            // Draw underline for each line individually
            for (let i = 0; i < lines.length; i++) {
              const lineText = lines[i];
              if (lineText.length === 0) continue; // Skip empty lines
              
              // Measure the actual text width
              const textMetrics = ctx.measureText(lineText);
              const textWidth = textMetrics.width;
              
              // Calculate underline position based on text alignment
              let underlineStartX = textXBase;
              if (textData.textAlign === 'center') {
                underlineStartX = Math.round(textX - textWidth / 2);
              } else if (textData.textAlign === 'right') {
                underlineStartX = Math.round(textX - textWidth);
              }
              
              const underlineEndX = Math.round(underlineStartX + textWidth);
              const underlineY = Math.round(textYBase + (i * lineHeight) + textData.fontSize + 2);
              
              ctx.beginPath();
              ctx.moveTo(underlineStartX, underlineY);
              ctx.lineTo(underlineEndX, underlineY);
              ctx.stroke();
            }
            ctx.restore();
          }
          
          // Draw text box border for better visibility - align with selection outline
          if (isSelected || contentToRender === 'Double-click to edit') {
            ctx.save();
            ctx.strokeStyle = isSelected ? '#007AFF' : '#cccccc';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            ctx.strokeRect(Math.round(obj.x), Math.round(obj.y), Math.round(obj.width), Math.round(obj.height));
            ctx.restore();
          }
        }
        break;
      }
    }

    ctx.restore();
  }, [editingTextId, editingText, objects]);

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
      case 'text': {
        // Draw text box preview with dashed border only - no placeholder text
        ctx.save();
        ctx.strokeStyle = preview.strokeColor || '#000000';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(x, y, width, height);
        ctx.restore();
        break;
      }
      
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
        const radiusX = width / 2;
        const radiusY = height / 2;
        const centerX = x + radiusX;
        const centerY = y + radiusY;
        
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
        
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
      case 'star':
      case 'heart': {
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
          // Use separate width and height scaling instead of circular radius
          const px = centerX + (width / 2) * Math.cos(angle);
          const py = centerY + (height / 2) * Math.sin(angle);
          pentagonPoints.push(`${i === 0 ? 'M' : 'L'} ${px} ${py}`);
        }
        return pentagonPoints.join(' ') + ' Z';
      }
      
      case 'hexagon': {
        const hexagonPoints = [];
        for (let i = 0; i < 6; i++) {
          const angle = (i * 2 * Math.PI) / 6;
          // Use separate width and height scaling instead of circular radius
          const px = centerX + (width / 2) * Math.cos(angle);
          const py = centerY + (height / 2) * Math.sin(angle);
          hexagonPoints.push(`${i === 0 ? 'M' : 'L'} ${px} ${py}`);
        }
        return hexagonPoints.join(' ') + ' Z';
      }
      
      case 'star': {
        const starPoints = [];
        const outerRadiusX = width / 2;
        const outerRadiusY = height / 2;
        const innerRadiusX = outerRadiusX * 0.4;
        const innerRadiusY = outerRadiusY * 0.4;
        
        for (let i = 0; i < 10; i++) {
          const angle = (i * Math.PI) / 5 - Math.PI / 2;
          // Use separate X and Y scaling for non-circular stars
          const radiusX = i % 2 === 0 ? outerRadiusX : innerRadiusX;
          const radiusY = i % 2 === 0 ? outerRadiusY : innerRadiusY;
          const px = centerX + radiusX * Math.cos(angle);
          const py = centerY + radiusY * Math.sin(angle);
          starPoints.push(`${i === 0 ? 'M' : 'L'} ${px} ${py}`);
        }
        return starPoints.join(' ') + ' Z';
      }
      
      case 'heart': {
        // Heart shape using cubic bezier curves
        const heartWidth = width;
        const heartHeight = height;
        const topCurveHeight = heartHeight * 0.3;
        const centerXHeart = x + width / 2;
        const centerYHeart = y + height / 2;
        
        return `M ${centerXHeart} ${y + heartHeight * 0.3}
                C ${centerXHeart} ${y + topCurveHeight * 0.5}, ${centerXHeart - heartWidth * 0.2} ${y}, ${centerXHeart - heartWidth * 0.4} ${y}
                C ${centerXHeart - heartWidth * 0.6} ${y}, ${centerXHeart - heartWidth * 0.8} ${y + topCurveHeight * 0.5}, ${centerXHeart - heartWidth * 0.5} ${y + topCurveHeight}
                C ${centerXHeart - heartWidth * 0.5} ${y + topCurveHeight}, ${centerXHeart} ${y + heartHeight * 0.6}, ${centerXHeart} ${y + heartHeight}
                C ${centerXHeart} ${y + heartHeight * 0.6}, ${centerXHeart + heartWidth * 0.5} ${y + topCurveHeight}, ${centerXHeart + heartWidth * 0.5} ${y + topCurveHeight}
                C ${centerXHeart + heartWidth * 0.8} ${y + topCurveHeight * 0.5}, ${centerXHeart + heartWidth * 0.6} ${y}, ${centerXHeart + heartWidth * 0.4} ${y}
                C ${centerXHeart + heartWidth * 0.2} ${y}, ${centerXHeart} ${y + topCurveHeight * 0.5}, ${centerXHeart} ${y + heartHeight * 0.3} Z`;
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

    // Set up canvas for crisp, pixel-aligned rendering
    setupCanvasForCrispRendering(canvas, ctx);

    // Clear the entire canvas completely
    ctx.clearRect(0, 0, canvas.width, canvas.height);

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

    console.log('🎨 Canvas redrawn with crisp rendering:', {
      objectCount: Object.keys(objects).length,
      selectedCount: selectedObjectIds.length,
      canvasSize: { width: canvas.width, height: canvas.height },
      devicePixelRatio: window.devicePixelRatio || 1,
      hasDrawingPreview: !!getCurrentDrawingPreview?.(),
      hasShapePreview: !!getCurrentShapePreview?.(),
      editingTextId: editingTextId || 'none'
    });
  }, [canvas, objects, selectedObjectIds, settings, toolSettings, renderAllObjects, renderDrawingPreview, renderShapePreview, getCurrentDrawingPreview, getCurrentShapePreview, editingTextId, editingText, setupCanvasForCrispRendering]);

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
