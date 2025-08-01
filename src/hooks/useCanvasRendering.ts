import { useEffect, useCallback, useRef } from 'react';
import { useWhiteboardStore } from '../stores/whiteboardStore';
import { useToolStore } from '../stores/toolStore';
import { useScreenSizeStore } from '../stores/screenSizeStore';
import { WhiteboardObject, TextData, ImageData } from '../types/whiteboard';
import { getCachedImage, loadImage } from '../utils/sharedImageCache';

// Import optimized brush effects
import { 
  renderPaintbrushOptimized, 
  renderChalkOptimized, 
  renderSprayOptimized, 
  renderCrayonOptimized 
} from '../utils/brushEffectsOptimized';
import { 
  renderTriangle, 
  renderDiamond, 
  renderPentagon, 
  renderHexagon, 
  renderStar, 
  renderHeart 
} from '../utils/shapeRendering';
import { measureText } from '../utils/textMeasurement';

/**
 * Wraps text to fit within the specified width
 */
const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
  if (!text || maxWidth <= 0) return [''];
  
  // Handle manual line breaks first
  const paragraphs = text.split('\n');
  const wrappedLines: string[] = [];
  
  paragraphs.forEach((paragraph, paragraphIndex) => {
    if (paragraph.trim() === '') {
      wrappedLines.push('');
      return;
    }
    
    const words = paragraph.split(' ');
    let currentLine = '';
    
    words.forEach((word, wordIndex) => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = ctx.measureText(testLine).width;
      
      if (testWidth <= maxWidth || currentLine === '') {
        currentLine = testLine;
      } else {
        if (currentLine) {
          wrappedLines.push(currentLine);
        }
        currentLine = word;
      }
    });
    
    if (currentLine) {
      wrappedLines.push(currentLine);
    }
  });
  
  return wrappedLines.length > 0 ? wrappedLines : [''];
};

/**
 * Custom hook for handling canvas rendering operations using central image cache
 */
const useCanvasRendering = (
  canvas: HTMLCanvasElement | null,
  getCurrentDrawingPreview: () => any,
  getCurrentShapePreview: () => any,
  getCurrentSelectionBox: () => any,
  editingTextId?: string | null,
  editingText?: string
) => {
  const { objects, selectedObjectIds } = useWhiteboardStore();
  const { activeTool } = useToolStore();
  
  // Circuit breaker for infinite redraws
  const redrawCount = useRef(0);
  const lastRedrawTime = useRef(0);
  const throttleTimeout = useRef<NodeJS.Timeout | null>(null);

  /**
   * Normalizes image paths for consistent handling
   */
  const normalizeImagePath = useCallback((path: string): string => {
    try {
      return decodeURIComponent(path);
    } catch (error) {
      console.warn(`⚠️ Failed to decode path "${path}":`, error);
      return path;
    }
  }, []);

  /**
   * Renders a single whiteboard object on the canvas
   */
  const renderObject = useCallback((ctx: CanvasRenderingContext2D, obj: WhiteboardObject, isSelected: boolean = false) => {
    ctx.save();
    
    // Apply object transformations
    ctx.globalAlpha = obj.opacity || 1;
    
    // Check if this is an eraser object
    const isEraser = obj.data?.isEraser;
    if (isEraser) {
      ctx.globalCompositeOperation = 'destination-out';
    }
    
    // Draw selection highlight if selected and not eraser and not text
    if (isSelected && !isEraser && obj.type !== 'text') {
      ctx.save();
      ctx.strokeStyle = '#007AFF';
      ctx.globalAlpha = 0.6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      switch (obj.type) {
        case 'path': {
          ctx.translate(Math.round(obj.x), Math.round(obj.y));
          const path = new Path2D(obj.data.path);
          ctx.lineWidth = (obj.strokeWidth || 2) + 6;
          ctx.stroke(path);
          break;
        }
        case 'rectangle': {
          ctx.lineWidth = (obj.strokeWidth || 2) + 6;
          ctx.strokeRect(Math.round(obj.x), Math.round(obj.y), Math.round(obj.width), Math.round(obj.height));
          break;
        }
        case 'circle': {
          const radiusX = Math.round(obj.width / 2);
          const radiusY = Math.round(obj.height / 2);
          const centerX = Math.round(obj.x + radiusX);
          const centerY = Math.round(obj.y + radiusY);
          ctx.beginPath();
          ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
          ctx.lineWidth = (obj.strokeWidth || 2) + 6;
          ctx.stroke();
          break;
        }
        case 'image': {
          ctx.lineWidth = 6;
          ctx.strokeRect(Math.round(obj.x), Math.round(obj.y), Math.round(obj.width), Math.round(obj.height));
          break;
        }
      }
      ctx.restore();
    }
    
    // Render the actual object
    switch (obj.type) {
      case 'path': {
        ctx.translate(obj.x, obj.y);
        
        const brushType = obj.data?.brushType;
        const strokeColor = obj.stroke || '#000000';
        const strokeWidth = obj.strokeWidth || 2;
        const opacity = obj.opacity || 1;
        
        const objectId = Object.keys(objects).find(id => objects[id] === obj);
        
        if (isEraser) {
          const path = new Path2D(obj.data.path);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = strokeWidth;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke(path);
        } else if (brushType === 'paintbrush') {
          renderPaintbrushOptimized(ctx, obj.data.path, strokeColor, strokeWidth, opacity);
        } else if (brushType === 'chalk') {
          renderChalkOptimized(ctx, obj.data.path, strokeColor, strokeWidth, opacity, objectId);
        } else if (brushType === 'spray') {
          renderSprayOptimized(ctx, obj.data.path, strokeColor, strokeWidth, opacity, objectId);
        } else if (brushType === 'crayon') {
          renderCrayonOptimized(ctx, obj.data.path, strokeColor, strokeWidth, opacity);
        } else {
          const path = new Path2D(obj.data.path);
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = strokeWidth;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke(path);
        }
        break;
      }

      case 'rectangle': {
        if (obj.width && obj.height) {
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

      case 'image': {
        const imageData = obj.data as any;
        let imageSrc: string | null = null;
        let fallbackSrc: string | null = null;
        
        if (imageData?.isCustomStamp && imageData?.customStampId) {
          imageSrc = imageData.customStampId;
          fallbackSrc = imageData?.fallbackSrc || '/icons/emotions/happy.svg';
        } else if (imageData?.src) {
          imageSrc = imageData.src;
        }
        
        if (imageSrc && obj.width && obj.height) {
          const normalizedSrc = normalizeImagePath(imageSrc);
          const cached = getCachedImage(normalizedSrc);
          
          if (cached.image) {
            // Image is ready, render it
            ctx.drawImage(
              cached.image, 
              Math.round(obj.x), 
              Math.round(obj.y), 
              Math.round(obj.width), 
              Math.round(obj.height)
            );
          } else if (!cached.isLoading && !cached.hasFailed) {
            // Start loading the image asynchronously
            loadImage(normalizedSrc).then(img => {
              if (img && canvas) {
                redrawCanvas(false, `image-loaded:${normalizedSrc.slice(-20)}`);
              }
            }).catch(error => {
              console.warn('Failed to load image:', error);
              
              // Try fallback if available
              if (fallbackSrc) {
                const normalizedFallbackSrc = normalizeImagePath(fallbackSrc);
                loadImage(normalizedFallbackSrc).then(fallbackImg => {
                  if (fallbackImg && canvas) {
                    redrawCanvas(false, `fallback-loaded:${normalizedFallbackSrc.slice(-20)}`);
                  }
                }).catch(() => {
                  // Fallback also failed, nothing more to do
                });
              }
            });
          } else if (fallbackSrc) {
            // Try rendering fallback
            const normalizedFallbackSrc = normalizeImagePath(fallbackSrc);
            const fallbackCached = getCachedImage(normalizedFallbackSrc);
            
            if (fallbackCached.image) {
              ctx.globalAlpha = 0.7;
              ctx.drawImage(
                fallbackCached.image, 
                Math.round(obj.x), 
                Math.round(obj.y), 
                Math.round(obj.width), 
                Math.round(obj.height)
              );
              ctx.globalAlpha = 1;
            }
          }
        }
        break;
      }

      case 'text': {
        if (obj.data?.content && obj.width && obj.height) {
          const textData = obj.data as TextData;
          
          const isBeingEdited = editingTextId === Object.keys(objects).find(id => objects[id] === obj);
          let contentToRender = isBeingEdited && editingText !== undefined ? editingText : textData.content;
          
          if (!contentToRender || contentToRender.trim() === '') {
            contentToRender = 'Double-click to edit';
          }
          
          let fontStyle = '';
          if (textData.italic) fontStyle += 'italic ';
          if (textData.bold && contentToRender !== 'Double-click to edit') fontStyle += 'bold ';
          
          ctx.font = `${fontStyle}${textData.fontSize}px ${textData.fontFamily}`;
          
          if (contentToRender === 'Double-click to edit') {
            ctx.fillStyle = obj.stroke ? `${obj.stroke}B3` : '#000000B3';
          } else {
            ctx.fillStyle = obj.stroke || '#000000';
          }
          ctx.textBaseline = 'top';
          
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
          
          const textXBase = Math.round(obj.x + 4);
          const textYBase = Math.round(obj.y + 4);
          const availableWidth = Math.max(obj.width - 8, 50);
          
          const textMetrics = measureText(
            contentToRender,
            textData.fontSize,
            textData.fontFamily,
            textData.bold,
            textData.italic,
            availableWidth
          );
          
          // Render each line
          for (let i = 0; i < textMetrics.lines.length; i++) {
            const line = textMetrics.lines[i];
            const lineY = Math.round(textYBase + (i * textMetrics.lineHeight));
            
            let textX = textXBase;
            if (textData.textAlign === 'center') {
              textX = Math.round(obj.x + obj.width / 2);
            } else if (textData.textAlign === 'right') {
              textX = Math.round(obj.x + obj.width - 4);
            }
            
            ctx.fillText(line, textX, lineY);
          }
          
          // Draw underline if enabled
          if (textData.underline && contentToRender !== 'Double-click to edit') {
            ctx.save();
            ctx.strokeStyle = obj.stroke || '#000000';
            ctx.lineWidth = 1;
            
            for (let i = 0; i < textMetrics.lines.length; i++) {
              const lineText = textMetrics.lines[i];
              if (lineText.length === 0) continue;
              
              const textMeasurement = ctx.measureText(lineText);
              const textWidth = textMeasurement.width;
              
              let underlineStartX = textXBase;
              if (textData.textAlign === 'center') {
                underlineStartX = Math.round((obj.x + obj.width / 2) - textWidth / 2);
              } else if (textData.textAlign === 'right') {
                underlineStartX = Math.round((obj.x + obj.width - 4) - textWidth);
              }
              
              const underlineEndX = Math.round(underlineStartX + textWidth);
              const underlineY = Math.round(textYBase + (i * textMetrics.lineHeight) + textData.fontSize - 2);
              
              ctx.beginPath();
              ctx.moveTo(underlineStartX, underlineY);
              ctx.lineTo(underlineEndX, underlineY);
              ctx.stroke();
            }
            ctx.restore();
          }
          
          // Draw text box border
          if ((isSelected && !isBeingEdited) || contentToRender === 'Double-click to edit') {
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
      
      default: {
        console.warn('Unknown object type:', obj.type);
        break;
      }
    }

    ctx.restore();
  }, [editingTextId, editingText, objects, canvas, normalizeImagePath]);

  /**
   * Renders the current drawing preview
   */
  const renderDrawingPreview = useCallback((ctx: CanvasRenderingContext2D, preview: any) => {
    if (!preview) return;
    
    ctx.save();
    ctx.translate(preview.startX, preview.startY);
    
    if (preview.isEraser) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = preview.strokeColor;
      ctx.lineWidth = preview.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = preview.opacity;
      
      const path = new Path2D(preview.path);
      ctx.stroke(path);
    } else {
      const brushType = preview.brushType;
      
      if (brushType === 'paintbrush') {
        renderPaintbrushOptimized(ctx, preview.path, preview.strokeColor, preview.strokeWidth, preview.opacity);
      } else if (brushType === 'chalk') {
        renderChalkOptimized(ctx, preview.path, preview.strokeColor, preview.strokeWidth, preview.opacity);
      } else if (brushType === 'spray') {
        renderSprayOptimized(ctx, preview.path, preview.strokeColor, preview.strokeWidth, preview.opacity);
      } else if (brushType === 'crayon') {
        renderCrayonOptimized(ctx, preview.path, preview.strokeColor, preview.strokeWidth, preview.opacity);
      } else {
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
   * Renders the current shape preview
   */
  const renderShapePreview = useCallback((ctx: CanvasRenderingContext2D, preview: any) => {
    if (!preview) return;
    
    ctx.save();
    ctx.globalAlpha = preview.opacity * 0.7;
    
    const width = Math.abs(preview.endX - preview.startX);
    const height = Math.abs(preview.endY - preview.startY);
    const x = Math.min(preview.startX, preview.endX);
    const y = Math.min(preview.startY, preview.endY);
    
    if (preview.strokeColor) {
      ctx.strokeStyle = preview.strokeColor;
      ctx.lineWidth = preview.strokeWidth;
    }
    if (preview.fillColor && preview.fillColor !== 'transparent') {
      ctx.fillStyle = preview.fillColor;
    }
    
    switch (preview.type) {
      case 'text': {
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
    }
    
    ctx.restore();
  }, []);

  /**
   * Renders all whiteboard objects
   */
  const renderAllObjects = useCallback((ctx: CanvasRenderingContext2D) => {
    const objectEntries = Object.entries(objects);
    
    objectEntries.sort(([, a], [, b]) => a.createdAt - b.createdAt);
    
    objectEntries.forEach(([id, obj]) => {
      const isSelected = selectedObjectIds.includes(id);
      renderObject(ctx, obj, isSelected);
    });
  }, [objects, selectedObjectIds, renderObject]);

  const redrawCanvas = useCallback((immediate = false, source = 'unknown') => {
    if (!canvas) return;

    // Circuit breaker
    redrawCount.current++;
    const now = Date.now();
    const elapsed = now - lastRedrawTime.current;
    
    if (redrawCount.current > 100 && elapsed < 5000) {
      console.error('🚨 INFINITE REDRAW LOOP DETECTED - CIRCUIT BREAKER ACTIVATED', {
        source,
        count: redrawCount.current,
        objectCount: objects.length,
        elapsed: `${elapsed}ms`
      });
      return;
    }
    
    // Reset counter periodically
    if (elapsed > 5000) {
      redrawCount.current = 0;
      lastRedrawTime.current = now;
    }

    console.log(`🔍 REDRAW #${redrawCount.current} TRIGGERED BY: ${source}`);
    
    if (throttleTimeout.current) {
      clearTimeout(throttleTimeout.current);
    }
    
    if (immediate) {
      performRedraw();
    } else {
      throttleTimeout.current = setTimeout(performRedraw, 16); // 60fps
    }
  }, [canvas, objects]);

  const performRedraw = useCallback(() => {
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    // Set up canvas
    const displayWidth = Math.floor(canvas.offsetWidth);
    const displayHeight = Math.floor(canvas.offsetHeight);
    
    canvas.width = displayWidth * devicePixelRatio;
    canvas.height = displayHeight * devicePixelRatio;
    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';
    
    ctx.scale(devicePixelRatio, devicePixelRatio);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Clear canvas
    ctx.clearRect(0, 0, displayWidth, displayHeight);

    // Draw all objects
    renderAllObjects(ctx);

    // Draw previews
    const drawingPreview = getCurrentDrawingPreview?.();
    if (drawingPreview) {
      renderDrawingPreview(ctx, drawingPreview);
    }

    const shapePreview = getCurrentShapePreview?.();
    if (shapePreview) {
      renderShapePreview(ctx, shapePreview);
    }

    // Draw selection box
    const selectionBox = getCurrentSelectionBox?.();
    if (selectionBox && selectionBox.isActive) {
      ctx.save();
      
      const width = selectionBox.endX - selectionBox.startX;
      const height = selectionBox.endY - selectionBox.startY;
      const left = Math.min(selectionBox.startX, selectionBox.endX);
      const top = Math.min(selectionBox.startY, selectionBox.endY);
      
      ctx.strokeStyle = '#007AFF';
      ctx.fillStyle = 'rgba(0, 122, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      
      ctx.fillRect(left, top, Math.abs(width), Math.abs(height));
      ctx.strokeRect(left, top, Math.abs(width), Math.abs(height));
      
      ctx.restore();
    }

    console.log('🎨 Canvas redrawn:', {
      objectCount: Object.keys(objects).length,
      selectedCount: selectedObjectIds.length,
      canvasSize: { width: canvas.width, height: canvas.height }
    });
  }, [canvas, objects, selectedObjectIds, renderAllObjects, renderDrawingPreview, renderShapePreview, getCurrentDrawingPreview, getCurrentShapePreview, getCurrentSelectionBox]);

  // Auto-redraw when state changes
  useEffect(() => {
    redrawCanvas(false, 'state-change');
  }, [redrawCanvas]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (throttleTimeout.current) {
        clearTimeout(throttleTimeout.current);
      }
    };
  }, []);

  return {
    redrawCanvas,
    renderObject,
    renderAllObjects
  };
};

export { useCanvasRendering };