
import React, { useRef, useEffect, useState } from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useToolStore } from '../../stores/toolStore';
import { useCanvasInteractions } from '../../hooks/canvas/useCanvasInteractions';
import { useCanvasRendering } from '../../hooks/useCanvasRendering';
import { useToolSelection } from '../../hooks/useToolSelection';
import { CustomCursor } from './CustomCursor';
import { ResizeHandles } from './ResizeHandles';

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
      return 'none';
    default:
      return 'crosshair';
  }
};

/**
 * Main canvas component for the whiteboard
 */
export const Canvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { viewport, selectedObjectIds, updateObject, objects } = useWhiteboardStore();
  const { activeTool } = useToolStore();
  
  // Text editing state
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [textEditorPosition, setTextEditorPosition] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const [editingText, setEditingText] = useState('');
  
  // Handle tool selection logic
  useToolSelection();
  
  // Initialize interactions hook
  const interactions = useCanvasInteractions();
  
  // Initialize rendering hook
  const { redrawCanvas } = useCanvasRendering(
    canvasRef.current, 
    interactions.getCurrentDrawingPreview,
    interactions.getCurrentShapePreview
  );
  
  // Update interactions hook with redraw function
  interactions.setRedrawCanvas(redrawCanvas);

  // Handle resize for selected objects
  const handleResize = (objectId: string, newBounds: { x: number; y: number; width: number; height: number }) => {
    updateObject(objectId, newBounds);
    redrawCanvas();
  };

  // Handle double-click on text objects
  const handleDoubleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Find text object at click position
    const textObject = Object.entries(objects).find(([id, obj]) => {
      if (obj.type !== 'text' || !obj.width || !obj.height) return false;
      
      return x >= obj.x && x <= obj.x + obj.width &&
             y >= obj.y && y <= obj.y + obj.height;
    });
    
    if (textObject) {
      const [objectId, obj] = textObject;
      setEditingTextId(objectId);
      setTextEditorPosition({
        x: obj.x,
        y: obj.y,
        width: obj.width!,
        height: obj.height!
      });
      
      // If it's a placeholder, clear it; otherwise, use existing content
      const isPlaceholder = obj.data?.isPlaceholder;
      setEditingText(isPlaceholder ? '' : (obj.data?.content || ''));
    }
  };

  // Handle text editing completion
  const handleTextEditComplete = () => {
    if (editingTextId && editingText !== undefined) {
      const finalText = editingText.trim() || 'Tap to edit';
      const isPlaceholder = !editingText.trim();
      
      updateObject(editingTextId, {
        data: {
          ...objects[editingTextId]?.data,
          content: finalText,
          isPlaceholder
        }
      });
      redrawCanvas();
    }
    
    setEditingTextId(null);
    setTextEditorPosition(null);
    setEditingText('');
  };

  // Handle text input key events
  const handleTextKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleTextEditComplete();
    } else if (event.key === 'Escape') {
      setEditingTextId(null);
      setTextEditorPosition(null);
      setEditingText('');
    }
  };

  // Set up touch event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouchStart = (event: TouchEvent) => {
      event.preventDefault();
      // Convert TouchEvent to PointerEvent-like object
      const touch = event.touches[0];
      const pointerEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        pointerId: 1,
        pointerType: 'touch' as const
      } as PointerEvent;
      interactions.handlePointerDown(pointerEvent, canvas);
    };

    const handleTouchMove = (event: TouchEvent) => {
      event.preventDefault();
      const touch = event.touches[0];
      const pointerEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        pointerId: 1,
        pointerType: 'touch' as const
      } as PointerEvent;
      interactions.handlePointerMove(pointerEvent, canvas);
    };

    const handleTouchEnd = (event: TouchEvent) => {
      event.preventDefault();
      const touch = event.changedTouches[0];
      const pointerEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        pointerId: 1,
        pointerType: 'touch' as const
      } as PointerEvent;
      interactions.handlePointerUp(pointerEvent, canvas);
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

  const onMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (canvasRef.current) {
      interactions.handlePointerDown(event.nativeEvent as PointerEvent, canvasRef.current);
    }
  };

  const onMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (canvasRef.current) {
      interactions.handlePointerMove(event.nativeEvent as PointerEvent, canvasRef.current);
    }
  };

  const onMouseUp = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (canvasRef.current) {
      interactions.handlePointerUp(event.nativeEvent as PointerEvent, canvasRef.current);
    }
  };

  const onMouseLeave = (event: React.MouseEvent<HTMLCanvasElement>) => {
    interactions.handleMouseLeave();
  };

  return (
    <div className="w-full h-full relative bg-background overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{
          cursor: interactions.isDragging ? 'grabbing' : getCursorStyle(activeTool),
          touchAction: 'none'
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onDoubleClick={handleDoubleClick}
      />
      
      {/* Text Editor Overlay */}
      {editingTextId && textEditorPosition && (
        <textarea
          className="absolute bg-transparent border-2 border-blue-500 resize-none outline-none p-1 text-base"
          style={{
            left: textEditorPosition.x,
            top: textEditorPosition.y,
            width: textEditorPosition.width,
            height: textEditorPosition.height,
            fontSize: objects[editingTextId]?.data?.fontSize || 16,
            fontFamily: objects[editingTextId]?.data?.fontFamily || 'Arial',
            fontWeight: objects[editingTextId]?.data?.bold ? 'bold' : 'normal',
            fontStyle: objects[editingTextId]?.data?.italic ? 'italic' : 'normal',
            textDecoration: objects[editingTextId]?.data?.underline ? 'underline' : 'none',
            textAlign: objects[editingTextId]?.data?.textAlign || 'left',
            color: objects[editingTextId]?.stroke || '#000000',
            zIndex: 1000
          }}
          value={editingText}
          onChange={(e) => setEditingText(e.target.value)}
          onBlur={handleTextEditComplete}
          onKeyDown={handleTextKeyDown}
          autoFocus
        />
      )}
      
      <CustomCursor canvas={canvasRef.current} />
      
      {activeTool === 'select' && selectedObjectIds.map(objectId => (
        <ResizeHandles
          key={objectId}
          objectId={objectId}
          onResize={handleResize}
        />
      ))}
      
      <div className="absolute top-4 right-4 bg-black/20 text-white px-2 py-1 rounded text-xs pointer-events-none">
        Zoom: {Math.round(viewport.zoom * 100)}% | 
        Tool: {activeTool} |
        {interactions.isDragging && ' Dragging'}
      </div>
    </div>
  );
};
