
import React, { useRef, useEffect } from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useToolStore } from '../../stores/toolStore';
import { useCanvasInteractions } from '../../hooks/canvas/useCanvasInteractions';
import { useCanvasRendering } from '../../hooks/useCanvasRendering';
import { useToolSelection } from '../../hooks/useToolSelection';
import { useTextTool } from '../../hooks/canvas/useTextTool';
import { CustomCursor } from './CustomCursor';
import { ResizeHandles } from './ResizeHandles';
import { TextEditor } from './TextEditor';

/**
 * Gets the appropriate cursor style based on the active tool
 */
const getCursorStyle = (activeTool: string): string => {
  switch (activeTool) {
    case 'select':
      return 'default';
    case 'text':
      return 'text';
    case 'hand':
      return 'grab';
    case 'fill':
      return 'url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'m9 7 5 5v7a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v4a2 2 0 0 1-2 2 2 2 0 0 1-2-2V9Z\'/%3E%3Cpath d=\'m8 11 2-2a2 2 0 0 1 2-2 2 2 0 0 1 2 2l6 6\'/%3E%3Cpath d=\'m9 7-6-6\'/%3E%3C/svg%3E") 12 12, auto';
    case 'pencil':
    case 'brush':
    case 'eraser':
      return 'none'; // Hide default cursor for tools with custom cursor
    default:
      return 'crosshair';
  }
};

/**
 * Main canvas component for the whiteboard
 */
export const Canvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { viewport, selectedObjectIds, updateObject } = useWhiteboardStore();
  const { activeTool } = useToolStore();
  
  // Handle tool selection logic
  useToolSelection();
  
  // Initialize text tool functionality
  const textTool = useTextTool();
  
  // Initialize interactions hook
  const interactions = useCanvasInteractions(textTool);
  
  // Initialize rendering hook
  const { redrawCanvas } = useCanvasRendering(
    canvasRef.current, 
    interactions.getCurrentDrawingPreview,
    interactions.getCurrentShapePreview
  );
  
  // Set redraw function for interactions
  useEffect(() => {
    interactions.setRedrawCanvas(redrawCanvas);
  }, [interactions, redrawCanvas]);

  // Handle resize for selected objects
  const handleResize = (objectId: string, newBounds: { x: number; y: number; width: number; height: number }) => {
    const obj = updateObject(objectId, newBounds);
    
    // Mark text objects as user-resized
    const objectData = useWhiteboardStore.getState().objects[objectId];
    if (objectData?.type === 'text') {
      textTool.markAsUserResized(objectId);
    }
    
    redrawCanvas();
  };

  // Set up non-passive touch event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouchStart = (event: TouchEvent) => {
      event.preventDefault();
      interactions.handlePointerDown(event, canvas);
    };

    const handleTouchMove = (event: TouchEvent) => {
      event.preventDefault();
      interactions.handlePointerMove(event, canvas);
    };

    const handleTouchEnd = (event: TouchEvent) => {
      event.preventDefault();
      interactions.handlePointerUp(event, canvas);
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [interactions]);

  return (
    <div className="w-full h-full relative bg-background overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{
          cursor: interactions.isDragging ? 'grabbing' : getCursorStyle(activeTool),
          touchAction: 'none'
        }}
        onMouseDown={interactions.onMouseDown}
        onMouseMove={interactions.onMouseMove}
        onMouseUp={interactions.onMouseUp}
        onMouseLeave={interactions.handleMouseLeave}
        onDoubleClick={interactions.onDoubleClick}
      />
      
      {/* Custom Cursor */}
      <CustomCursor canvas={canvasRef.current} />
      
      {/* Text Editor */}
      {textTool.editingTextId && (
        <TextEditor
          objectId={textTool.editingTextId}
          onComplete={(content) => textTool.endTextEditing(textTool.editingTextId!, content)}
          onCancel={textTool.cancelTextEditing}
        />
      )}
      
      {/* Resize Handles for Selected Objects */}
      {activeTool === 'select' && selectedObjectIds.map(objectId => (
        <ResizeHandles
          key={objectId}
          objectId={objectId}
          onResize={handleResize}
        />
      ))}
      
      {/* Canvas Info Overlay */}
      <div className="absolute top-4 right-4 bg-black/20 text-white px-2 py-1 rounded text-xs pointer-events-none">
        Zoom: {Math.round(viewport.zoom * 100)}% | 
        Tool: {activeTool} |
        {interactions.isDragging && ' Dragging'}
        {textTool.editingTextId && ' Editing Text'}
      </div>
    </div>
  );
};
