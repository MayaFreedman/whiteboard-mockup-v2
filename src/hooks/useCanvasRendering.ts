import { useEffect, useCallback, useRef } from 'react';
import { useWhiteboardStore } from '../stores/whiteboardStore';
import { useToolStore } from '../stores/toolStore';
import { WhiteboardObject } from '../types/whiteboard';
import { renderShape } from '../utils/shapeRendering';

/**
 * Renders a grid pattern on the canvas
 */
const renderGrid = (ctx: CanvasRenderingContext2D, viewport: { x: number; y: number; zoom: number }, settings: { gridVisible: boolean }) => {
  if (!settings.gridVisible) return;

  const gridSize = 50; // Adjust as needed
  const scaledGridSize = gridSize * viewport.zoom;

  ctx.save();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)'; // Adjust color and opacity as needed
  ctx.lineWidth = 1;

  const offsetX = viewport.x % scaledGridSize;
  const offsetY = viewport.y % scaledGridSize;

  // Vertical lines
  for (let x = -offsetX; x < ctx.canvas.width; x += scaledGridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, ctx.canvas.height);
    ctx.stroke();
  }

  // Horizontal lines
  for (let y = -offsetY; y < ctx.canvas.height; y += scaledGridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(ctx.canvas.width, y);
    ctx.stroke();
  }

  ctx.restore();
};

/**
 * Renders a lined paper pattern on the canvas
 */
const renderLinedPaper = (ctx: CanvasRenderingContext2D, viewport: { x: number; y: number; zoom: number }, settings: { linedPaperVisible: boolean }) => {
  if (!settings.linedPaperVisible) return;

  const lineHeight = 25; // Adjust as needed
  const scaledLineHeight = lineHeight * viewport.zoom;

  ctx.save();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)'; // Adjust color and opacity as needed
  ctx.lineWidth = 1;

  const offsetY = viewport.y % scaledLineHeight;

  // Horizontal lines
  for (let y = -offsetY; y < ctx.canvas.height; y += scaledLineHeight) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(ctx.canvas.width, y);
    ctx.stroke();
  }

  ctx.restore();
};

/**
 * Renders a path object on the canvas
 */
const renderPathObject = (ctx: CanvasRenderingContext2D, obj: WhiteboardObject) => {
  if (obj.type !== 'path' || !obj.data?.path) return;

  ctx.save();
  ctx.strokeStyle = obj.stroke || '#000000';
  ctx.lineWidth = obj.strokeWidth || 2;
  ctx.globalAlpha = obj.opacity || 1;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const path = new Path2D(obj.data.path);
  ctx.stroke(path);

  ctx.restore();
};

/**
 * Renders a text object on the canvas
 */
const renderTextObject = (ctx: CanvasRenderingContext2D, obj: WhiteboardObject) => {
  if (obj.type !== 'text' || !obj.data?.content) return;

  const content = obj.data.content;
  const fontSize = obj.data.fontSize || 16;
  const fontFamily = obj.data.fontFamily || 'Arial';
  const bold = obj.data.bold || false;
  const italic = obj.data.italic || false;
  const underline = obj.data.underline || false;
  const alignment = obj.data.alignment || 'left';

  ctx.save();
  
  // Set text properties
  const fontWeight = bold ? 'bold' : 'normal';
  const fontStyle = italic ? 'italic' : 'normal';
  ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.fillStyle = obj.stroke || '#000000';
  ctx.globalAlpha = obj.opacity || 1;
  ctx.textBaseline = 'top';

  // Handle multi-line text
  const lines = content.split('\n');
  const lineHeight = fontSize * 1.2;

  lines.forEach((line, index) => {
    let textX = obj.x;
    
    // Handle text alignment
    if (alignment === 'center') {
      const textWidth = ctx.measureText(line).width;
      textX = obj.x + (obj.width || 100) / 2 - textWidth / 2;
    } else if (alignment === 'right') {
      const textWidth = ctx.measureText(line).width;
      textX = obj.x + (obj.width || 100) - textWidth;
    }
    
    const textY = obj.y + (index * lineHeight);
    
    ctx.fillText(line, textX, textY);
    
    // Handle underline
    if (underline && line.trim()) {
      const textWidth = ctx.measureText(line).width;
      const underlineY = textY + fontSize;
      ctx.beginPath();
      ctx.moveTo(textX, underlineY);
      ctx.lineTo(textX + textWidth, underlineY);
      ctx.strokeStyle = obj.stroke || '#000000';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  });

  ctx.restore();
};

/**
 * Renders all whiteboard objects on the canvas
 */
const renderObjects = (ctx: CanvasRenderingContext2D, objects: Record<string, WhiteboardObject>) => {
  Object.values(objects).forEach(obj => {
    if (obj.type === 'path') {
      renderPathObject(ctx, obj);
    } else if (obj.type === 'text') {
      renderTextObject(ctx, obj);
    } else {
      renderShape(ctx, obj);
    }
  });
};

/**
 * Custom hook for managing canvas rendering
 * Handles background patterns, object rendering, and preview rendering
 */
export const useCanvasRendering = (
  canvas: HTMLCanvasElement | null,
  getCurrentDrawingPreview?: () => { path: string; startX: number; startY: number; strokeColor: string; strokeWidth: number; opacity: number; brushType?: string; isEraser?: boolean } | null,
  getCurrentShapePreview?: () => { type: string; startX: number; startY: number; endX: number; endY: number; strokeColor: string; strokeWidth: number; opacity: number } | null
) => {
  const whiteboardStore = useWhiteboardStore();
  const toolStore = useToolStore();
  const animationFrameRef = useRef<number | null>(null);

  /**
   * Main rendering function
   */
  const redrawCanvas = useCallback(() => {
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply background color
    ctx.fillStyle = whiteboardStore.settings.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply viewport transformation
    ctx.save();
    ctx.translate(-whiteboardStore.viewport.x, -whiteboardStore.viewport.y);
    ctx.scale(whiteboardStore.viewport.zoom, whiteboardStore.viewport.zoom);

    // Render background patterns
    renderGrid(ctx, whiteboardStore.viewport, whiteboardStore.settings);
    renderLinedPaper(ctx, whiteboardStore.viewport, whiteboardStore.settings);

    // Render all objects
    renderObjects(ctx, whiteboardStore.objects);

    // Render drawing preview
    if (getCurrentDrawingPreview) {
      const preview = getCurrentDrawingPreview();
      if (preview) {
        renderPathObject(ctx, {
          id: 'preview',
          type: 'path',
          x: preview.startX,
          y: preview.startY,
          stroke: preview.strokeColor,
          strokeWidth: preview.strokeWidth,
          opacity: preview.opacity,
          data: {
            path: preview.path,
            brushType: preview.brushType,
            isEraser: preview.isEraser
          },
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }
    }

    // Render shape preview
    if (getCurrentShapePreview) {
      const preview = getCurrentShapePreview();
      if (preview) {
        renderShape(ctx, {
          id: 'shape-preview',
          type: preview.type as any,
          x: Math.min(preview.startX, preview.endX),
          y: Math.min(preview.startY, preview.endY),
          width: Math.abs(preview.endX - preview.startX),
          height: Math.abs(preview.endY - preview.startY),
          stroke: preview.strokeColor,
          strokeWidth: preview.strokeWidth,
          opacity: preview.opacity,
          fill: 'none',
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }
    }

    ctx.restore();
  }, [canvas, whiteboardStore, getCurrentDrawingPreview, getCurrentShapePreview]);

  /**
   * Handles canvas resize events
   */
  const handleResize = useCallback(() => {
    if (!canvas) return;

    // Set canvas dimensions to match parent container
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    redrawCanvas();
  }, [canvas, redrawCanvas]);

  /**
   * Initializes the canvas and sets up event listeners
   */
  useEffect(() => {
    if (!canvas) return;

    // Initial resize
    handleResize();

    // Observe container resizes
    const resizeObserver = new ResizeObserver(entries => {
      handleResize();
    });
    resizeObserver.observe(canvas.parentNode as HTMLElement);

    // Set up animation frame loop for rendering
    const renderLoop = () => {
      redrawCanvas();
      animationFrameRef.current = requestAnimationFrame(renderLoop);
    };
    animationFrameRef.current = requestAnimationFrame(renderLoop);

    // Clean up on unmount
    return () => {
      resizeObserver.disconnect();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [canvas, handleResize, redrawCanvas]);

  return { redrawCanvas };
};
