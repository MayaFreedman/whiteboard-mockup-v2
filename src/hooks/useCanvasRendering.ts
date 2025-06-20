
import { useRef, useEffect, useCallback } from 'react';
import { useWhiteboardStore } from '../stores/whiteboardStore';
import { WhiteboardObject } from '../types/whiteboard';
import { useToolStore } from '../stores/toolStore';

// Simple viewport context since we can't find the original
interface ViewportContextType {
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
}

// Mock viewport hook for now
const useViewport = (): ViewportContextType => ({
  viewport: { x: 0, y: 0, zoom: 1 }
});

export const useCanvasRendering = (canvasRef: React.RefObject<HTMLCanvasElement>) => {
  const whiteboardStore = useWhiteboardStore();
  const { viewport } = useViewport();
  const toolStore = useToolStore();
  
  const animationFrameRef = useRef<number>(0);

  /**
   * Renders a text object with proper formatting and cursor
   */
  const renderTextObject = useCallback((ctx: CanvasRenderingContext2D, obj: WhiteboardObject) => {
    if (!obj.data) return;
    
    const isSelected = whiteboardStore.selectedObjectIds.includes(obj.id);
    const content = obj.data.content || '';
    const isEmpty = content.length === 0;
    
    // Show placeholder text when empty and selected
    const displayText = isEmpty && isSelected ? 'Start typing...' : content;
    const isPlaceholder = isEmpty && isSelected;
    
    // Apply text styling
    let fontStyle = '';
    if (obj.data.italic) fontStyle += 'italic ';
    if (obj.data.bold) fontStyle += 'bold ';
    
    ctx.font = `${fontStyle}${obj.data.fontSize || 16}px ${obj.data.fontFamily || 'Arial'}`;
    ctx.fillStyle = isPlaceholder ? '#999999' : (obj.stroke || '#000000');
    ctx.textBaseline = 'top';
    
    // Handle text alignment
    const textAlign = obj.data.textAlign || 'left';
    ctx.textAlign = textAlign as CanvasTextAlign;
    
    // Calculate text position based on alignment
    let textX = obj.x;
    if (textAlign === 'center') {
      textX = obj.x + (obj.width || 100) / 2;
    } else if (textAlign === 'right') {
      textX = obj.x + (obj.width || 100);
    }
    
    // Handle word wrapping
    const maxWidth = obj.width || 100;
    const lineHeight = (obj.data.fontSize || 16) * 1.2;
    const lines = displayText.split('\n');
    const wrappedLines: string[] = [];
    
    lines.forEach(line => {
      if (ctx.measureText(line).width <= maxWidth) {
        wrappedLines.push(line);
      } else {
        const words = line.split(' ');
        let currentLine = '';
        
        words.forEach(word => {
          const testLine = currentLine + (currentLine ? ' ' : '') + word;
          if (ctx.measureText(testLine).width <= maxWidth) {
            currentLine = testLine;
          } else {
            if (currentLine) {
              wrappedLines.push(currentLine);
              currentLine = word;
            } else {
              wrappedLines.push(word);
            }
          }
        });
        
        if (currentLine) {
          wrappedLines.push(currentLine);
        }
      }
    });
    
    // Render each line
    wrappedLines.forEach((line, index) => {
      const y = obj.y + index * lineHeight;
      ctx.fillText(line, textX, y);
      
      // Add underline if specified
      if (obj.data.underline && !isPlaceholder) {
        const lineWidth = ctx.measureText(line).width;
        let underlineX = textX;
        
        if (textAlign === 'center') {
          underlineX = textX - lineWidth / 2;
        } else if (textAlign === 'right') {
          underlineX = textX - lineWidth;
        }
        
        ctx.beginPath();
        ctx.moveTo(underlineX, y + (obj.data.fontSize || 16));
        ctx.lineTo(underlineX + lineWidth, y + (obj.data.fontSize || 16));
        ctx.strokeStyle = obj.stroke || '#000000';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });
    
    // Draw blinking cursor for selected empty text
    if (isSelected && isEmpty) {
      const cursorX = textAlign === 'center' ? obj.x + (obj.width || 100) / 2 : 
                     textAlign === 'right' ? obj.x + (obj.width || 100) : obj.x;
      const cursorY = obj.y;
      
      // Simple blinking effect using timestamp
      const shouldShowCursor = Math.floor(Date.now() / 500) % 2 === 0;
      
      if (shouldShowCursor) {
        ctx.beginPath();
        ctx.moveTo(cursorX, cursorY);
        ctx.lineTo(cursorX, cursorY + (obj.data.fontSize || 16));
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    
    // Draw text box border when selected
    if (isSelected) {
      ctx.strokeStyle = '#007bff';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(obj.x, obj.y, obj.width || 100, obj.height || 30);
      ctx.setLineDash([]);
    }
  }, [whiteboardStore.selectedObjectIds]);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set background color
    ctx.fillStyle = whiteboardStore.settings.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply viewport transformations
    ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform
    ctx.translate(viewport.x, viewport.y);
    ctx.scale(viewport.zoom, viewport.zoom);
    
    // Render all objects
    Object.values(whiteboardStore.objects).forEach(obj => {
      ctx.save();
      
      if (obj.type === 'text') {
        renderTextObject(ctx, obj);
      } else if (obj.type === 'path') {
        ctx.strokeStyle = obj.stroke || '#000000';
        ctx.lineWidth = obj.strokeWidth || 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = obj.opacity || 1;
        
        if (obj.data && obj.data.path) {
          const path = new Path2D(obj.data.path);
          ctx.stroke(path);
        }
      } else {
        ctx.fillStyle = obj.fill || 'transparent';
        ctx.strokeStyle = obj.stroke || '#000000';
        ctx.lineWidth = obj.strokeWidth || 2;
        ctx.globalAlpha = obj.opacity || 1;
        
        if (obj.type === 'rectangle') {
          ctx.fillRect(obj.x, obj.y, obj.width || 50, obj.height || 50);
          ctx.strokeRect(obj.x, obj.y, obj.width || 50, obj.height || 50);
        } else if (obj.type === 'circle') {
          const radius = Math.max(obj.width || 25, obj.height || 25);
          ctx.beginPath();
          ctx.arc(obj.x, obj.y, radius, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
        } else if (obj.type === 'triangle' || obj.type === 'diamond' || obj.type === 'pentagon' || obj.type === 'hexagon' || obj.type === 'star' || obj.type === 'heart') {
          if (obj.data && obj.data.path) {
            const path = new Path2D(obj.data.path);
            ctx.fill(path);
            ctx.stroke(path);
          }
        }
      }
      
      ctx.restore();
    });

    // Add cursor animation for text objects
    const hasSelectedText = whiteboardStore.selectedObjectIds.some(id => 
      whiteboardStore.objects[id]?.type === 'text' && 
      (!whiteboardStore.objects[id]?.data?.content || whiteboardStore.objects[id]?.data?.content === '')
    );
    
    if (hasSelectedText) {
      // Re-render every 500ms for cursor blinking
      setTimeout(() => {
        if (canvasRef.current) {
          redrawCanvas();
        }
      }, 500);
    }
  }, [viewport, whiteboardStore, toolStore, renderTextObject]);

  useEffect(() => {
    // Initial draw
    redrawCanvas();

    // Redraw on changes
    animationFrameRef.current = requestAnimationFrame(redrawCanvas);
    
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [redrawCanvas]);

  return { redrawCanvas };
};
