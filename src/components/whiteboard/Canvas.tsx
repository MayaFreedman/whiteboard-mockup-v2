import React, { useRef, useEffect } from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useToolStore } from '../../stores/toolStore';

export const Canvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { viewport, settings } = useWhiteboardStore();
  const { activeTool, toolSettings } = useToolStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid if enabled
    if (settings.gridVisible) {
      drawGrid(ctx, canvas.width, canvas.height);
    }

    // Draw lined paper if enabled
    if (toolSettings.showLinedPaper) {
      drawLinedPaper(ctx, canvas.width, canvas.height);
    }

    // Draw dots if enabled
    if (toolSettings.showDots) {
      drawDots(ctx, canvas.width, canvas.height);
    }

  }, [viewport, settings, toolSettings]);

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const gridSize = 20;
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;

    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  };

  const drawLinedPaper = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const lineSpacing = 24;
    ctx.strokeStyle = '#ddd6fe';
    ctx.lineWidth = 1;

    for (let y = lineSpacing; y <= height; y += lineSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  };

  const drawDots = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const dotSpacing = 20;
    ctx.fillStyle = '#d1d5db';
    
    for (let x = dotSpacing; x <= width; x += dotSpacing) {
      for (let y = dotSpacing; y <= height; y += dotSpacing) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  };

  return (
    <div className="w-full h-full relative bg-white overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-crosshair"
        style={{
          cursor: activeTool === 'select' ? 'default' : 
                 activeTool === 'text' ? 'text' : 'crosshair'
        }}
      />
      
      {/* Canvas Info Overlay - Moved to right side */}
      <div className="absolute top-4 right-4 bg-black/20 text-white px-2 py-1 rounded text-xs">
        Zoom: {Math.round(viewport.zoom * 100)}% | 
        Tool: {activeTool}
      </div>
    </div>
  );
};
