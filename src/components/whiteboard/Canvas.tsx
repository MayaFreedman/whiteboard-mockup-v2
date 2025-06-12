import React, { useRef, useEffect } from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useToolStore } from '../../stores/toolStore';
import { useCanvasInteractions } from '../../hooks/useCanvasInteractions';
import { useCanvasRendering } from '../../hooks/useCanvasRendering';
import { useToolSelection } from '../../hooks/useToolSelection';

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
    case 'pencil':
    case 'brush':
      return 'crosshair';
    case 'eraser':
      return 'crosshair';
    default:
      return 'crosshair';
  }
};

/**
 * Main canvas component for the whiteboard
 * Handles rendering of background patterns, objects, and user interactions
 */
export const Canvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { viewport } = useWhiteboardStore();
  const { activeTool } = useToolStore();
  
  // Custom hooks for canvas functionality
  const { redrawCanvas } = useCanvasRendering(canvasRef.current);
  
  // Handle tool selection logic (clearing selection when switching tools)
  useToolSelection();
  
  const {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    isDragging
  } = useCanvasInteractions(redrawCanvas);

  /**
   * Handles mouse down events on the canvas
   * @param event - Mouse event
   */
  const onMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (canvasRef.current) {
      handlePointerDown(event.nativeEvent, canvasRef.current);
    }
  };

  /**
   * Handles mouse move events on the canvas
   * @param event - Mouse event
   */
  const onMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (canvasRef.current) {
      handlePointerMove(event.nativeEvent, canvasRef.current);
    }
  };

  /**
   * Handles mouse up events on the canvas
   * @param event - Mouse event
   */
  const onMouseUp = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (canvasRef.current) {
      handlePointerUp(event.nativeEvent, canvasRef.current);
    }
  };

  /**
   * Handles touch start events on the canvas
   * @param event - Touch event
   */
  const onTouchStart = (event: React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    if (canvasRef.current) {
      handlePointerDown(event.nativeEvent, canvasRef.current);
    }
  };

  /**
   * Handles touch move events on the canvas
   * @param event - Touch event
   */
  const onTouchMove = (event: React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    if (canvasRef.current) {
      handlePointerMove(event.nativeEvent, canvasRef.current);
    }
  };

  /**
   * Handles touch end events on the canvas
   * @param event - Touch event
   */
  const onTouchEnd = (event: React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    if (canvasRef.current) {
      handlePointerUp(event.nativeEvent, canvasRef.current);
    }
  };

  return (
    <div className="w-full h-full relative bg-background overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{
          cursor: isDragging ? 'grabbing' : getCursorStyle(activeTool),
          touchAction: 'none' // Prevent default touch behaviors
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      />
      
      {/* Canvas Info Overlay */}
      <div className="absolute top-4 right-4 bg-black/20 text-white px-2 py-1 rounded text-xs pointer-events-none">
        Zoom: {Math.round(viewport.zoom * 100)}% | 
        Tool: {activeTool} |
        {isDragging && ' Dragging'}
      </div>
    </div>
  );
};
