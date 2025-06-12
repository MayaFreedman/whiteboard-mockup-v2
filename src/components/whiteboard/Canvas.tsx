
import React, { useRef, useEffect } from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useToolStore } from '../../stores/toolStore';

/**
 * Configuration for grid appearance
 */
const GRID_CONFIG = {
  size: 20,
  color: '#e5e7eb',
  lineWidth: 1
};

/**
 * Configuration for lined paper appearance
 */
const LINED_PAPER_CONFIG = {
  spacing: 24,
  color: '#ddd6fe',
  lineWidth: 1
};

/**
 * Configuration for dot pattern appearance
 */
const DOT_CONFIG = {
  spacing: 20,
  color: '#d1d5db',
  radius: 1
};

/**
 * Draws a grid pattern on the canvas
 * @param ctx - Canvas rendering context
 * @param width - Canvas width
 * @param height - Canvas height
 */
const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number): void => {
  ctx.strokeStyle = GRID_CONFIG.color;
  ctx.lineWidth = GRID_CONFIG.lineWidth;

  // Draw vertical lines
  for (let x = 0; x <= width; x += GRID_CONFIG.size) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  // Draw horizontal lines
  for (let y = 0; y <= height; y += GRID_CONFIG.size) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
};

/**
 * Draws lined paper pattern on the canvas
 * @param ctx - Canvas rendering context
 * @param width - Canvas width
 * @param height - Canvas height
 */
const drawLinedPaper = (ctx: CanvasRenderingContext2D, width: number, height: number): void => {
  ctx.strokeStyle = LINED_PAPER_CONFIG.color;
  ctx.lineWidth = LINED_PAPER_CONFIG.lineWidth;

  for (let y = LINED_PAPER_CONFIG.spacing; y <= height; y += LINED_PAPER_CONFIG.spacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
};

/**
 * Draws a dot pattern on the canvas
 * @param ctx - Canvas rendering context
 * @param width - Canvas width
 * @param height - Canvas height
 */
const drawDots = (ctx: CanvasRenderingContext2D, width: number, height: number): void => {
  ctx.fillStyle = DOT_CONFIG.color;
  
  for (let x = DOT_CONFIG.spacing; x <= width; x += DOT_CONFIG.spacing) {
    for (let y = DOT_CONFIG.spacing; y <= height; y += DOT_CONFIG.spacing) {
      ctx.beginPath();
      ctx.arc(x, y, DOT_CONFIG.radius, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
};

/**
 * Gets the appropriate cursor style based on the active tool
 * @param activeTool - The currently active tool
 * @returns CSS cursor value
 */
const getCursorStyle = (activeTool: string): string => {
  switch (activeTool) {
    case 'select':
      return 'default';
    case 'text':
      return 'text';
    case 'hand':
      return 'grab';
    default:
      return 'crosshair';
  }
};

/**
 * Main canvas component for the whiteboard
 * Handles rendering of background patterns and provides drawing surface
 */
export const Canvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { viewport, settings } = useWhiteboardStore();
  const { activeTool, toolSettings } = useToolStore();

  /**
   * Effect to handle canvas rendering and background patterns
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match container
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Clear the entire canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background patterns based on settings
    if (settings.gridVisible) {
      drawGrid(ctx, canvas.width, canvas.height);
    }

    if (toolSettings.showLinedPaper) {
      drawLinedPaper(ctx, canvas.width, canvas.height);
    }

    if (toolSettings.showDots) {
      drawDots(ctx, canvas.width, canvas.height);
    }

  }, [viewport, settings, toolSettings]);

  return (
    <div className="w-full h-full relative bg-white overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{
          cursor: getCursorStyle(activeTool)
        }}
      />
      
      {/* Canvas Info Overlay */}
      <div className="absolute top-4 right-4 bg-black/20 text-white px-2 py-1 rounded text-xs">
        Zoom: {Math.round(viewport.zoom * 100)}% | 
        Tool: {activeTool}
      </div>
    </div>
  );
};
