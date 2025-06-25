import { useCallback, useEffect, useRef } from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { WhiteboardObject, TextData, ImageData } from '../../types/whiteboard';
import { useToolStore } from '../../stores/toolStore';
import { brushEffectCache } from '../../utils/brushCache';

/**
 * Custom hook for handling canvas rendering logic
 * Draws objects, previews, and editing overlays on the canvas
 */
export const useCanvasRendering = (
  canvas: HTMLCanvasElement | null,
  getCurrentDrawingPreview: () => { path: string; startX: number; startY: number; strokeColor: string; strokeWidth: number; opacity: number; brushType?: string; isEraser?: boolean; } | null,
  getCurrentShapePreview: () => { type: string; startX: number; startY: number; endX: number; endY: number; strokeColor: string; strokeWidth: number; opacity: number; } | null,
  editingTextId: string | null,
  editingText: string
) => {
  const toolStore = useToolStore();
  const { viewport } = useWhiteboardStore();
  
  // Store the previous values in refs
  const canvasRef = useRef(canvas);
  const editingTextIdRef = useRef(editingTextId);
  const editingTextRef = useRef(editingText);
  
  // Update the refs when the props change
  useEffect(() => {
    canvasRef.current = canvas;
    editingTextIdRef.current = editingTextId;
    editingTextRef.current = editingText;
  }, [canvas, editingTextId, editingText]);

  /**
   * Renders path objects (drawings)
   */
  const renderPathObject = useCallback((ctx: CanvasRenderingContext2D, obj: WhiteboardObject) => {
    if (!obj.data?.path) return;

    ctx.save();
    ctx.beginPath();
    
    // Set global alpha for the object
    ctx.globalAlpha = obj.opacity || 1;
    
    // Set stroke properties
    ctx.strokeStyle = obj.stroke || '#000000';
    ctx.lineWidth = obj.strokeWidth || 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Apply brush effects from cache
    const brushType = obj.data?.brushType;
    if (brushType && (brushType === 'spray' || brushType === 'chalk')) {
      const brushEffects = brushEffectCache.get(obj.id, brushType);
      if (brushEffects && brushEffects.length > 0) {
        brushEffects.forEach(effect => {
          ctx.globalAlpha = effect.opacity;
          ctx.strokeStyle = effect.color;
          ctx.lineWidth = effect.size;
          
          const points = effect.points;
          if (points && points.length > 0) {
            points.forEach((point, index) => {
              if (index === 0) {
                ctx.beginPath();
                ctx.moveTo(obj.x + point.x, obj.y + point.y);
              } else {
                ctx.lineTo(obj.x + point.x, obj.y + point.y);
              }
            });
            ctx.stroke();
          }
        });
        ctx.restore();
        return;
      }
    }
    
    // Draw the path
    const path = new Path2D(obj.data.path);
    ctx.stroke(path);
    
    ctx.restore();
  }, []);

  /**
   * Renders shape objects (rectangles, circles, etc.)
   */
  const renderShapeObject = useCallback((ctx: CanvasRenderingContext2D, obj: WhiteboardObject) => {
    if (!obj.width || !obj.height) return;

    ctx.save();
    ctx.globalAlpha = obj.opacity || 1;
    ctx.fillStyle = obj.fill || 'transparent';
    ctx.strokeStyle = obj.stroke || '#000000';
    ctx.lineWidth = obj.strokeWidth || 2;

    switch (obj.type) {
      case 'rectangle':
        ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
        ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
        break;
      case 'circle':
        ctx.beginPath();
        ctx.ellipse(obj.x + obj.width / 2, obj.y + obj.height / 2, obj.width / 2, obj.height / 2, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        break;
      case 'triangle':
      case 'diamond':
      case 'pentagon':
      case 'hexagon':
      case 'star':
      case 'heart':
        // All shapes are now rendered as native types
        const path = new Path2D(generateShapePath(obj.type, obj.x, obj.y, obj.width, obj.height));
        ctx.fill(path);
        ctx.stroke(path);
        break;
      default:
        console.warn('Unknown shape type:', obj.type);
    }

    ctx.restore();
  }, []);

  /**
   * Generates SVG path data for complex shapes
   */
  const generateShapePath = useCallback((shapeType: string, x: number, y: number, width: number, height: number): string => {
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
          const radiusX = i % 2 === 0 ? outerRadiusX : innerRadiusX;
          const radiusY = i % 2 === 0 ? outerRadiusY : innerRadiusY;
          const px = centerX + radiusX * Math.cos(angle);
          const py = centerY + radiusY * Math.sin(angle);
          starPoints.push(`${i === 0 ? 'M' : 'L'} ${px} ${py}`);
        }
        return starPoints.join(' ') + ' Z';
      }
      
      case 'heart': {
        const heartWidth = width;
        const heartHeight = height;
        const topCurveHeight = heartHeight * 0.3;
        const centerXHeart = x + width / 2;
        
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
   * Renders text objects
   */
  const renderTextObject = useCallback((ctx: CanvasRenderingContext2D, obj: WhiteboardObject, overrideText: string | null = null, overrideColor: string = '#000000') => {
    if (!obj.data) return;

    const textData = obj.data as TextData;
    const content = overrideText !== null ? overrideText : textData.content || '';
    
    ctx.save();
    ctx.globalAlpha = obj.opacity || 1;
    ctx.fillStyle = overrideColor !== '#000000' ? overrideColor : obj.stroke || '#000000'; // Use override color if provided
    
    // Font settings
    let fontStyle = '';
    if (textData.italic) fontStyle += 'italic ';
    if (textData.bold) fontStyle += 'bold ';
    ctx.font = `${fontStyle}${textData.fontSize}px ${textData.fontFamily}`;
    ctx.textAlign = textData.textAlign;
    ctx.textBaseline = 'top'; // Align text to the top

    // Word wrapping logic
    const lineHeight = Math.round(textData.fontSize * 1.2);
    let x = obj.x;
    let y = obj.y;
    let currentLine = '';
    
    // Split content into words and then lines
    const words = content.split(' ');
    
    for (let n = 0; n < words.length; n++) {
      let testLine = currentLine + words[n] + ' ';
      let metrics = ctx.measureText(testLine);
      let testWidth = metrics.width;
      
      if (testWidth > obj.width! && n > 0) {
        // Render the line
        ctx.fillText(currentLine, x + 4, y + 4); // Add padding
        
        // Move to the next line
        currentLine = words[n] + ' ';
        y += lineHeight;
      }
      else {
        currentLine = testLine;
      }
    }
    
    // Render the last line
    ctx.fillText(currentLine, x + 4, y + 4); // Add padding
    
    ctx.restore();
  }, []);

  /**
   * Renders image objects (including emoji stamps)
   */
  const renderImageObject = useCallback((ctx: CanvasRenderingContext2D, obj: WhiteboardObject) => {
    if (!obj.data?.src || !obj.width || !obj.height) return;
    
    const imageData = obj.data as ImageData;
    
    // Check if this is an emoji (single character or emoji sequence)
    const isEmoji = imageData.src.length <= 4 || /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(imageData.src);
    
    if (isEmoji) {
      // Render emoji as text
      ctx.save();
      ctx.globalAlpha = obj.opacity || 1;
      
      // Set font size to match the object dimensions
      const fontSize = Math.min(obj.width, obj.height);
      ctx.font = `${fontSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Draw the emoji centered in the object bounds
      const centerX = obj.x + obj.width / 2;
      const centerY = obj.y + obj.height / 2;
      
      ctx.fillText(imageData.src, centerX, centerY);
      ctx.restore();
      
      console.log('🎨 Rendered emoji stamp:', {
        emoji: imageData.src,
        position: { x: centerX, y: centerY },
        size: fontSize
      });
    } else {
      // Handle regular images (if needed in the future)
      const img = new Image();
      img.onload = () => {
        ctx.save();
        ctx.globalAlpha = obj.opacity || 1;
        ctx.drawImage(img, obj.x, obj.y, obj.width!, obj.height!);
        ctx.restore();
      };
      img.src = imageData.src;
    }
  }, []);

  /**
   * Main rendering function that draws all objects on the canvas
   */
  const renderObjects = useCallback((ctx: CanvasRenderingContext2D, objects: Record<string, WhiteboardObject>) => {
    if (!canvasRef.current) return;
    
    // Clear the canvas
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    // Apply background color
    ctx.fillStyle = toolStore.settings.backgroundColor;
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    // Render grid lines if enabled
    if (toolStore.settings.gridVisible) {
      const gridSize = 50; // Define grid size
      ctx.strokeStyle = '#e0e0e0'; // Light gray color for grid
      ctx.lineWidth = 0.5;

      for (let x = 0; x < canvasRef.current.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasRef.current.height);
        ctx.stroke();
      }

      for (let y = 0; y < canvasRef.current.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvasRef.current.width, y);
        ctx.stroke();
      }
    }

    // Render lined paper if enabled
    if (toolStore.settings.linedPaperVisible) {
      const lineHeight = 24; // Define line height
      ctx.strokeStyle = '#f0f0f0'; // Light gray color for lines
      ctx.lineWidth = 0.5;

      for (let y = lineHeight; y < canvasRef.current.height; y += lineHeight) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvasRef.current.width, y);
        ctx.stroke();
      }
    }

    // Render all objects
    Object.values(objects).forEach((obj) => {
      if (!obj) return;
      
      switch (obj.type) {
        case 'path':
          renderPathObject(ctx, obj);
          break;
        case 'text':
          renderTextObject(ctx, obj, null, '');
          break;
        case 'image':
          renderImageObject(ctx, obj);
          break;
        case 'rectangle':
        case 'circle':
        case 'triangle':
        case 'diamond':
        case 'pentagon':
        case 'hexagon':
        case 'star':
        case 'heart':
          renderShapeObject(ctx, obj);
          break;
        default:
          console.warn('Unknown object type:', obj.type);
      }
    });

    // Render drawing preview
    const drawingPreview = getCurrentDrawingPreview();
    if (drawingPreview) {
      ctx.save();
      ctx.globalAlpha = drawingPreview.opacity || 1;
      ctx.strokeStyle = drawingPreview.strokeColor || '#000000';
      ctx.lineWidth = drawingPreview.strokeWidth || 2;
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
      ctx.globalAlpha = shapePreview.opacity || 1;
      ctx.fillStyle = 'transparent';
      ctx.strokeStyle = shapePreview.strokeColor || '#000000';
      ctx.lineWidth = shapePreview.strokeWidth || 2;

      switch (shapePreview.type) {
        case 'rectangle':
          ctx.strokeRect(
            Math.min(shapePreview.startX, shapePreview.endX),
            Math.min(shapePreview.startY, shapePreview.endY),
            Math.abs(shapePreview.endX - shapePreview.startX),
            Math.abs(shapePreview.endY - shapePreview.startY)
          );
          break;
        case 'circle':
          const width = Math.abs(shapePreview.endX - shapePreview.startX);
          const height = Math.abs(shapePreview.endY - shapePreview.startY);
          ctx.beginPath();
          ctx.ellipse(
            Math.min(shapePreview.startX, shapePreview.endX) + width / 2,
            Math.min(shapePreview.startY, shapePreview.endY) + height / 2,
            width / 2,
            height / 2,
            0,
            0,
            2 * Math.PI
          );
          ctx.stroke();
          break;
          
        case 'triangle':
        case 'diamond':
        case 'pentagon':
        case 'hexagon':
        case 'star':
        case 'heart':
          // All shapes are now rendered as native types
          const x = Math.min(shapePreview.startX, shapePreview.endX);
          const y = Math.min(shapePreview.startY, shapePreview.endY);
          const width = Math.abs(shapePreview.endX - shapePreview.startX);
          const height = Math.abs(shapePreview.endY - shapePreview.startY);
          const path = new Path2D(generateShapePath(shapePreview.type, x, y, width, height));
          ctx.stroke(path);
          break;
          
        case 'text':
          // Render a rectangle for the text box
          ctx.strokeRect(
            Math.min(shapePreview.startX, shapePreview.endX),
            Math.min(shapePreview.startY, shapePreview.endY),
            Math.abs(shapePreview.endX - shapePreview.startX),
            Math.abs(shapePreview.endY - shapePreview.startY)
          );
          break;
      }

      ctx.restore();
    }

    // Render editing text overlay
    if (editingTextIdRef.current && editingTextRef.current) {
      const obj = objects[editingTextIdRef.current];
      if (obj && obj.type === 'text') {
        renderTextObject(ctx, obj, editingTextRef.current, 'rgba(0, 0, 0, 0.5)'); // Render with a transparent black color
      }
    }
  }, [renderPathObject, renderTextObject, renderImageObject, renderShapeObject, getCurrentDrawingPreview, getCurrentShapePreview, generateShapePath, toolStore.settings.gridVisible, toolStore.settings.linedPaperVisible, toolStore.settings.backgroundColor]);

  /**
   * Redraws the canvas
   */
  const redrawCanvas = useCallback(() => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Save the current transformation matrix
    ctx.save();

    // Apply viewport transformations (zoom and pan)
    ctx.translate(viewport.x, viewport.y);
    ctx.scale(viewport.zoom, viewport.zoom);

    // Render all objects
    renderObjects(ctx, whiteboardStore.objects);

    // Restore the transformation matrix to its original state
    ctx.restore();
  }, [whiteboardStore.objects, viewport, renderObjects]);

  return { redrawCanvas };
};
