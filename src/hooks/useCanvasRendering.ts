import { useCallback, useEffect } from 'react';
import { useWhiteboardStore } from '../stores/whiteboardStore';
import { useViewportStore } from '../stores/viewportStore';
import { Point, WhiteboardObject, TextData } from '../types/whiteboard';
import { measureText } from '../utils/textMeasurement';

export const useCanvasRendering = (
  canvas: HTMLCanvasElement | null,
  getCurrentDrawingPreview?: () => { points: Point[]; tool: string; color: string; size: number } | null,
  getCurrentShapePreview?: () => any,
  editingTextId?: string | null,
  editingText?: string
) => {
  const { objects, selectedObjectIds } = useWhiteboardStore();
  const { viewport } = useViewportStore();
  
  useEffect(() => {
    redrawCanvas();
  }, [objects, selectedObjectIds, viewport, redrawCanvas]);
  
  /**
   * Renders a path object on the canvas
   * @param ctx - Canvas context
   * @param obj - Path object to render
   */
  const renderPath = (ctx: CanvasRenderingContext2D, obj: WhiteboardObject) => {
    if (!obj.points || obj.points.length < 2) return;
    
    ctx.strokeStyle = obj.stroke || '#000000';
    ctx.lineWidth = obj.size || 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(obj.points[0].x, obj.points[0].y);
    
    for (let i = 1; i < obj.points.length; i++) {
      ctx.lineTo(obj.points[i].x, obj.points[i].y);
    }
    
    ctx.stroke();
  };
  
  /**
   * Renders a shape object (rectangle, circle, triangle, line, arrow) on the canvas
   * @param ctx - Canvas context
   * @param obj - Shape object to render
   */
  const renderShape = (ctx: CanvasRenderingContext2D, obj: WhiteboardObject) => {
    ctx.fillStyle = obj.fill || 'transparent';
    ctx.strokeStyle = obj.stroke || '#000000';
    ctx.lineWidth = obj.size || 2;
    
    switch (obj.type) {
      case 'rectangle':
        ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
        ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
        break;
      case 'circle': {
        const radius = Math.min(obj.width, obj.height) / 2;
        ctx.beginPath();
        ctx.arc(obj.x + radius, obj.y + radius, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'triangle': {
        ctx.beginPath();
        ctx.moveTo(obj.x + obj.width / 2, obj.y);
        ctx.lineTo(obj.x, obj.y + obj.height);
        ctx.lineTo(obj.x + obj.width, obj.y + obj.height);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'line':
        ctx.beginPath();
        ctx.moveTo(obj.x, obj.y);
        ctx.lineTo(obj.x + obj.width, obj.y + obj.height);
        ctx.stroke();
        break;
      case 'arrow': {
        const arrowHeadSize = 10;
        const angle = Math.atan2(obj.height, obj.width);
        
        ctx.beginPath();
        ctx.moveTo(obj.x, obj.y);
        ctx.lineTo(obj.x + obj.width, obj.y + obj.height);
        
        // Arrowhead
        ctx.lineTo(
          obj.x + obj.width - arrowHeadSize * Math.cos(angle - Math.PI / 6),
          obj.y + obj.height - arrowHeadSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(obj.x + obj.width, obj.y + obj.height);
        ctx.lineTo(
          obj.x + obj.width - arrowHeadSize * Math.cos(angle + Math.PI / 6),
          obj.y + obj.height - arrowHeadSize * Math.sin(angle + Math.PI / 6)
        );
        
        ctx.stroke();
        break;
      }
      default:
        console.warn('Unknown shape type:', obj.type);
    }
  };

  /**
   * Renders text objects on the canvas with proper wrapping
   */
  const renderText = (ctx: CanvasRenderingContext2D, obj: WhiteboardObject) => {
    if (!obj.data) return;
    
    const textData = obj.data as TextData;
    let content = textData.content;
    
    // Use editing text if this object is being edited
    if (editingTextId === obj.id && editingText !== undefined) {
      content = editingText;
    }
    
    // Default content for empty text
    if (!content || content.trim() === '') {
      content = 'Double-click to edit';
    }
    
    console.log('🎨 Rendering text object:', {
      id: obj.id.slice(0, 8),
      content: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
      bounds: { x: obj.x, y: obj.y, width: obj.width, height: obj.height },
      fontSize: textData.fontSize,
      fontFamily: textData.fontFamily
    });
    
    // Set font properties
    let fontStyle = '';
    if (textData.italic) fontStyle += 'italic ';
    if (textData.bold) fontStyle += 'bold ';
    ctx.font = `${fontStyle}${textData.fontSize}px ${textData.fontFamily}`;
    
    // Set text color
    ctx.fillStyle = obj.stroke || '#000000';
    ctx.textBaseline = 'top';
    
    const startX = obj.x + 4; // 4px padding
    const startY = obj.y + 4; // 4px padding
    const maxWidth = obj.width - 8; // Available width minus padding
    const lineHeight = Math.round(textData.fontSize * 1.2);
    
    console.log('🎨 Text rendering parameters:', {
      startX,
      startY,
      maxWidth,
      lineHeight,
      availableWidth: maxWidth
    });
    
    // Use measureText to get wrapped lines
    const metrics = measureText(
      content,
      textData.fontSize,
      textData.fontFamily,
      textData.bold,
      textData.italic,
      maxWidth
    );
    
    console.log('🎨 Text metrics for rendering:', {
      wrappedLines: metrics.lines,
      totalWidth: metrics.width,
      totalHeight: metrics.height
    });
    
    // Render each line
    metrics.lines.forEach((line, index) => {
      const y = startY + (index * lineHeight);
      
      let x = startX;
      if (textData.textAlign === 'center') {
        const lineWidth = ctx.measureText(line).width;
        x = startX + (maxWidth - lineWidth) / 2;
      } else if (textData.textAlign === 'right') {
        const lineWidth = ctx.measureText(line).width;
        x = startX + maxWidth - lineWidth;
      }
      
      console.log('🎨 Rendering line:', {
        lineIndex: index,
        line: line,
        position: { x, y },
        lineWidth: ctx.measureText(line).width
      });
      
      ctx.fillText(line, x, y);
      
      // Draw underline if needed
      if (textData.underline) {
        const lineWidth = ctx.measureText(line).width;
        const underlineY = y + textData.fontSize;
        ctx.beginPath();
        ctx.moveTo(x, underlineY);
        ctx.lineTo(x + lineWidth, underlineY);
        ctx.strokeStyle = obj.stroke || '#000000';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });
    
    // Debug: Draw text bounds
    if (editingTextId === obj.id) {
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
      ctx.setLineDash([]);
      
      console.log('🎨 Debug: Drew text bounds for editing text');
    }
  };
  
  /**
   * Renders the current drawing preview (for pencil, brush, eraser)
   * @param ctx - Canvas context
   */
  const renderCurrentDrawingPreview = (ctx: CanvasRenderingContext2D) => {
    if (!getCurrentDrawingPreview) return;
    
    const preview = getCurrentDrawingPreview();
    if (!preview || preview.points.length < 2) return;
    
    ctx.strokeStyle = preview.color;
    ctx.lineWidth = preview.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(preview.points[0].x, preview.points[0].y);
    
    for (let i = 1; i < preview.points.length; i++) {
      ctx.lineTo(preview.points[i].x, preview.points[i].y);
    }
    
    ctx.stroke();
  };
  
  /**
   * Renders the current shape preview (for rectangle, circle, triangle, line, arrow)
   * @param ctx - Canvas context
   */
  const renderCurrentShapePreview = (ctx: CanvasRenderingContext2D) => {
    if (!getCurrentShapePreview) return;
    
    const preview = getCurrentShapePreview();
    if (!preview) return;
    
    ctx.fillStyle = preview.fill || 'transparent';
    ctx.strokeStyle = preview.stroke || '#000000';
    ctx.lineWidth = preview.size || 2;
    
    switch (preview.type) {
      case 'rectangle':
        ctx.fillRect(preview.x, preview.y, preview.width, preview.height);
        ctx.strokeRect(preview.x, preview.y, preview.width, preview.height);
        break;
      case 'circle': {
        const radius = Math.min(preview.width, preview.height) / 2;
        ctx.beginPath();
        ctx.arc(preview.x + radius, preview.y + radius, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'triangle': {
        ctx.beginPath();
        ctx.moveTo(preview.x + preview.width / 2, preview.y);
        ctx.lineTo(preview.x, preview.y + preview.height);
        ctx.lineTo(preview.x + preview.width, preview.y + preview.height);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'line':
        ctx.beginPath();
        ctx.moveTo(preview.x, preview.y);
        ctx.lineTo(preview.x + preview.width, preview.y + preview.height);
        ctx.stroke();
        break;
      case 'arrow': {
        const arrowHeadSize = 10;
        const angle = Math.atan2(preview.height, preview.width);
        
        ctx.beginPath();
        ctx.moveTo(preview.x, preview.y);
        ctx.lineTo(preview.x + preview.width, preview.y + preview.height);
        
        // Arrowhead
        ctx.lineTo(
          preview.x + preview.width - arrowHeadSize * Math.cos(angle - Math.PI / 6),
          preview.y + preview.height - arrowHeadSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(preview.x + preview.width, preview.y + preview.height);
        ctx.lineTo(
          preview.x + preview.width - arrowHeadSize * Math.cos(angle + Math.PI / 6),
          preview.y + preview.height - arrowHeadSize * Math.sin(angle + Math.PI / 6)
        );
        
        ctx.stroke();
        break;
      }
      default:
        console.warn('Unknown shape type:', preview.type);
    }
  };
  
  /**
   * Main canvas redraw function
   */
  const redrawCanvas = useCallback(() => {
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear the entire canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Save the current transformation matrix
    ctx.save();
    
    // Apply viewport transformations (scale and translation)
    ctx.translate(viewport.x, viewport.y);
    ctx.scale(viewport.zoom, viewport.zoom);
    
    // Render a grid
    const gridSize = 50; // Adjust as needed
    const gridColor = '#f0f0f0'; // Light gray color
    
    const minX = -viewport.x / viewport.zoom;
    const minY = -viewport.y / viewport.zoom;
    const maxX = minX + canvas.width / viewport.zoom;
    const maxY = minY + canvas.height / viewport.zoom;
    
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 0.5;
    
    for (let x = Math.floor(minX / gridSize) * gridSize; x < maxX; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, minY);
      ctx.lineTo(x, maxY);
      ctx.stroke();
    }
    
    for (let y = Math.floor(minY / gridSize) * gridSize; y < maxY; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(minX, y);
      ctx.lineTo(maxX, y);
      ctx.stroke();
    }
    
    // Render all objects
    Object.values(objects).forEach(obj => {
      // Highlight selected objects
      if (selectedObjectIds.includes(obj.id)) {
        ctx.shadowColor = '#0070f3';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      } else {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }
      
      // Render based on object type
      switch (obj.type) {
        case 'path':
          renderPath(ctx, obj);
          break;
        case 'rectangle':
        case 'circle':
        case 'triangle':
        case 'line':
        case 'arrow':
          renderShape(ctx, obj);
          break;
        case 'text':
          renderText(ctx, obj);
          break;
        default:
          console.warn('Unknown object type:', obj.type);
      }
    });
    
    // Restore the transformation matrix to the default
    ctx.restore();
    
    // Render current drawing preview on top
    renderCurrentDrawingPreview(ctx);
    renderCurrentShapePreview(ctx);
  }, [canvas, objects, selectedObjectIds, viewport, getCurrentDrawingPreview, getCurrentShapePreview, editingTextId, editingText]);
  
  // Initial redraw
  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);
  
  return { redrawCanvas };
};
