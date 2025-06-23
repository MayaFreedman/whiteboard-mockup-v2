
import { useCallback, useEffect, useRef } from 'react';
import { useWhiteboardStore } from '../stores/whiteboardStore';
import { WhiteboardObject } from '../types/whiteboard';

interface CanvasRenderingProps {
  settings: {
    gridVisible: boolean;
    linedPaperVisible: boolean;
    backgroundColor: string;
  };
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
}

export const useCanvasRendering = (
  canvas: HTMLCanvasElement | null,
  getCurrentDrawingPreview: () => any,
  getCurrentShapePreview: () => any,
  editingTextId?: string | null,
  editingText?: string
) => {
  const { objects, selectedObjectIds, viewport } = useWhiteboardStore();
  const imageCache = useRef(new Map());

  // Default settings - these should be made configurable later
  const settings = {
    gridVisible: false,
    linedPaperVisible: false,
    backgroundColor: '#ffffff'
  };

  /**
   * Loads an image into the cache
   * @param src - Image source URL
   * @returns Promise that resolves when the image is loaded
   */
  const loadImage = useCallback((src: string) => {
    return new Promise((resolve, reject) => {
      if (imageCache.current.has(src)) {
        resolve(imageCache.current.get(src));
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imageCache.current.set(src, img);
        resolve(img);
      };
      img.onerror = (error) => {
        console.error('Failed to load image:', src, error);
        reject(error);
      };
      img.src = src;
    });
  }, []);

  /**
   * Preloads all images in the whiteboard objects
   */
  const preloadImages = useCallback(async () => {
    const imageObjects = Object.values(objects).filter(obj => obj.type === 'image' && obj.data?.src);
    
    // Use Promise.all to load all images in parallel
    await Promise.all(imageObjects.map(obj => loadImage(obj.data.src)));
    
    console.log('🖼️ All images preloaded');
  }, [objects, loadImage]);

  /**
   * Clear the canvas and redraw the background
   */
  const clearCanvas = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Set background color
    ctx.fillStyle = settings.backgroundColor;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Render lined paper
    if (settings.linedPaperVisible) {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.lineWidth = 0.5;
      const lineHeight = 24;
      for (let i = lineHeight; i < ctx.canvas.height; i += lineHeight) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(ctx.canvas.width, i);
        ctx.stroke();
      }
    }

    // Render grid
    if (settings.gridVisible) {
      const gridSize = 24;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.lineWidth = 0.5;

      for (let i = gridSize; i < ctx.canvas.width; i += gridSize) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, ctx.canvas.height);
        ctx.stroke();
      }

      for (let i = gridSize; i < ctx.canvas.height; i += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(ctx.canvas.width, i);
        ctx.stroke();
      }
    }
  }, [settings]);

  /**
   * Renders a single whiteboard object on the canvas
   */
  const renderObject = useCallback((ctx: CanvasRenderingContext2D, obj: WhiteboardObject) => {
    ctx.globalAlpha = obj.opacity || 1;
    if (obj.stroke) {
      ctx.strokeStyle = obj.stroke;
    }
    if (obj.fill) {
      ctx.fillStyle = obj.fill;
    }

    ctx.save();
    
    // Apply rotation if present (for stamps and other objects)
    if (obj.rotation && obj.rotation !== 0 && obj.width && obj.height) {
      const centerX = obj.x + obj.width / 2;
      const centerY = obj.y + obj.height / 2;
      
      ctx.translate(centerX, centerY);
      ctx.rotate((obj.rotation * Math.PI) / 180); // Convert degrees to radians
      ctx.translate(-centerX, -centerY);
    }

    switch (obj.type) {
      case 'path': {
        if (obj.data?.path) {
          ctx.lineWidth = obj.strokeWidth || 1;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          if (obj.data.brushType === 'chalk') {
            ctx.shadowColor = obj.stroke || 'black';
            ctx.shadowBlur = obj.strokeWidth || 5;
          } else if (obj.data.brushType === 'spray') {
            ctx.shadowColor = obj.stroke || 'black';
            ctx.shadowBlur = obj.strokeWidth || 5;
          } else {
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
          }

          ctx.beginPath();
          const path = new Path2D(obj.data.path);
          ctx.stroke(path);
        }
        break;
      }

      case 'rectangle': {
        ctx.lineWidth = obj.strokeWidth || 1;
        ctx.fillRect(obj.x, obj.y, obj.width || 0, obj.height || 0);
        ctx.strokeRect(obj.x, obj.y, obj.width || 0, obj.height || 0);
        break;
      }

      case 'circle': {
        ctx.beginPath();
        ctx.lineWidth = obj.strokeWidth || 1;
        ctx.arc(obj.x + (obj.width || 0) / 2, obj.y + (obj.height || 0) / 2, (obj.width || 0) / 2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        break;
      }

      case 'triangle':
      case 'diamond':
      case 'pentagon':
      case 'hexagon':
      case 'star':
      case 'heart': {
        if (obj.data?.path) {
          ctx.lineWidth = obj.strokeWidth || 1;
          ctx.beginPath();
          const path = new Path2D(obj.data.path);
          ctx.fill(path);
          ctx.stroke(path);
        }
        break;
      }

      case 'text': {
        if (obj.data) {
          const textData = obj.data;
          ctx.font = `${textData.italic ? 'italic ' : ''}${textData.bold ? 'bold ' : ''}${textData.fontSize}px ${textData.fontFamily}`;
          ctx.textAlign = textData.textAlign || 'left';
          ctx.textBaseline = 'top';
          ctx.fillStyle = obj.stroke || 'black';
          
          // Use word wrapping logic from measureText
          const lineHeight = Math.round(textData.fontSize * 1.2);
          const availableWidth = obj.width - 8; // Subtract padding
          const words = textData.content.split(' ');
          let line = '';
          let y = obj.y + 4; // Add padding
          let x = obj.x + 4; // Add padding
          
          for (let n = 0; n < words.length; n++) {
            let testLine = line + words[n] + ' ';
            let metrics = ctx.measureText(testLine);
            let testWidth = metrics.width;
            
            if (testWidth > availableWidth && n > 0) {
              ctx.fillText(line, x, y);
              line = words[n] + ' ';
              y += lineHeight;
            }
            else {
              line = testLine;
            }
          }
          ctx.fillText(line, x, y);
          
          // Draw underline if needed
          if (textData.underline) {
            const textWidth = ctx.measureText(textData.content).width;
            const underlineOffset = textData.fontSize / 10;
            ctx.beginPath();
            ctx.lineWidth = 1;
            ctx.moveTo(obj.x + 4, y + textData.fontSize + underlineOffset);
            ctx.lineTo(obj.x + 4 + textWidth, y + textData.fontSize + underlineOffset);
            ctx.stroke();
          }
        }
        break;
      }

      case 'image': {
        if (obj.data?.src && obj.width && obj.height) {
          const img = imageCache.current.get(obj.data.src);
          if (img && img.complete) {
            try {
              ctx.drawImage(img, obj.x, obj.y, obj.width, obj.height);
            } catch (error) {
              console.error('Error drawing image:', error);
              // Fallback: draw a placeholder rectangle
              ctx.strokeStyle = obj.stroke || '#000000';
              ctx.lineWidth = 2;
              ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
              
              // Draw an "X" to indicate missing image
              ctx.beginPath();
              ctx.moveTo(obj.x, obj.y);
              ctx.lineTo(obj.x + obj.width, obj.y + obj.height);
              ctx.moveTo(obj.x + obj.width, obj.y);
              ctx.lineTo(obj.x, obj.y + obj.height);
              ctx.stroke();
            }
          } else if (img) {
            // Image is loading, draw placeholder
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
            ctx.strokeStyle = '#ccc';
            ctx.lineWidth = 1;
            ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
            
            // Draw loading text
            ctx.fillStyle = '#666';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Loading...', obj.x + obj.width/2, obj.y + obj.height/2);
          }
        }
        break;
      }
    }

    ctx.restore();
  }, [settings, editingTextId, editingText]);

  /**
   * Main rendering function - draws all objects on the canvas
   */
  const redrawCanvas = useCallback(() => {
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Save the current transformation matrix
    ctx.save();

    // Apply viewport transformations (pan and zoom)
    ctx.translate(viewport.x, viewport.y);
    ctx.scale(viewport.zoom, viewport.zoom);

    // Clear the canvas and redraw the background
    clearCanvas(ctx);

    // Sort objects to draw selected objects on top
    const sortedObjects = Object.entries(objects).sort(([idA, objA], [idB, objB]) => {
      const aIsSelected = selectedObjectIds.includes(idA);
      const bIsSelected = selectedObjectIds.includes(idB);
      if (aIsSelected && !bIsSelected) return 1;
      if (!aIsSelected && bIsSelected) return -1;
      return 0;
    });

    // Render each object
    sortedObjects.forEach(([, obj]) => {
      renderObject(ctx, obj);
    });

    // Draw the current drawing preview
    const drawingPreview = getCurrentDrawingPreview();
    if (drawingPreview && drawingPreview.path) {
      ctx.globalAlpha = drawingPreview.opacity;
      ctx.strokeStyle = drawingPreview.strokeColor;
      ctx.lineWidth = drawingPreview.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (drawingPreview.brushType === 'chalk') {
        ctx.shadowColor = drawingPreview.strokeColor || 'black';
        ctx.shadowBlur = drawingPreview.strokeWidth || 5;
      } else if (drawingPreview.brushType === 'spray') {
        ctx.shadowColor = drawingPreview.strokeColor || 'black';
        ctx.shadowBlur = drawingPreview.strokeWidth || 5;
      } else {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }

      ctx.beginPath();
      const path = new Path2D(drawingPreview.path);
      ctx.stroke(path);
    }

    // Draw the current shape preview
    const shapePreview = getCurrentShapePreview();
    if (shapePreview) {
      ctx.globalAlpha = shapePreview.opacity;
      ctx.strokeStyle = shapePreview.strokeColor;
      ctx.lineWidth = shapePreview.strokeWidth;
      ctx.fillStyle = 'transparent';

      switch (shapePreview.type) {
        case 'rectangle':
          ctx.strokeRect(
            Math.min(shapePreview.startX, shapePreview.endX),
            Math.min(shapePreview.startY, shapePreview.endY),
            Math.abs(shapePreview.endX - shapePreview.startX),
            Math.abs(shapePreview.endY - shapePreview.startY)
          );
          break;
        case 'circle': {
          const centerX = (shapePreview.startX + shapePreview.endX) / 2;
          const centerY = (shapePreview.startY + shapePreview.endY) / 2;
          const radius = Math.sqrt(
            Math.pow(shapePreview.endX - shapePreview.startX, 2) +
            Math.pow(shapePreview.endY - shapePreview.startY, 2)
          ) / 2;
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
          ctx.stroke();
          break;
        }
        case 'triangle':
        case 'diamond':
        case 'pentagon':
        case 'hexagon':
        case 'star':
        case 'heart': {
          // Generate and draw the shape path
          break;
        }
        case 'text': {
          ctx.font = `${'16'}px ${'Arial'}`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillStyle = shapePreview.strokeColor || 'black';
          ctx.fillText('Type something...', shapePreview.startX, shapePreview.startY);
          break;
        }
      }
    }

    // Restore the transformation matrix to its original state
    ctx.restore();
  }, [canvas, objects, selectedObjectIds, settings, viewport, clearCanvas, renderObject, getCurrentDrawingPreview, getCurrentShapePreview, editingTextId, editingText]);

  // Load initial images
  useEffect(() => {
    preloadImages();
  }, [preloadImages]);

  // Redraw the canvas when objects change
  useEffect(() => {
    redrawCanvas();
  }, [objects, selectedObjectIds, settings, viewport, redrawCanvas]);

  return { redrawCanvas };
};
