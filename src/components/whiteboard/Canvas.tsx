
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
    case 'fill':
      return 'url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'m9 7 5 5v7a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v4a2 2 0 0 1-2 2 2 2 0 0 1-2-2V9Z\'/%3E%3Cpath d=\'m8 11 2-2a2 2 0 0 1 2 2 2 2 0 0 1 2 2l6 6\'/%3E%3Cpath d=\'m9 7-6-6\'/%3E%3C/svg%3E") 12 12, auto';
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
 * Handles rendering of background patterns, objects, and user interactions
 */
export const Canvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { viewport, selectedObjectIds, updateObject, objects } = useWhiteboardStore();
  const { activeTool } = useToolStore();
  
  // Text editing state
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [textEditorPosition, setTextEditorPosition] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const [editingText, setEditingText] = useState('');
  
  // Double-click protection flag
  const [isHandlingDoubleClick, setIsHandlingDoubleClick] = useState(false);
  const doubleClickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Handle tool selection logic (clearing selection when switching tools)
  useToolSelection();
  
  // Initialize interactions hook first to get the preview functions
  const interactions = useCanvasInteractions();
  
  // Initialize rendering hook with both preview functions AND editing state
  const { redrawCanvas } = useCanvasRendering(
    canvasRef.current, 
    interactions.getCurrentDrawingPreview,
    interactions.getCurrentShapePreview,
    editingTextId,
    editingText
  );
  
  // Update interactions hook with redraw function and double-click protection
  interactions.setRedrawCanvas(redrawCanvas);
  interactions.setDoubleClickProtection(isHandlingDoubleClick);

  // Handle resize for selected objects
  const handleResize = (objectId: string, newBounds: { x: number; y: number; width: number; height: number }) => {
    updateObject(objectId, newBounds);
    redrawCanvas();
  };

  // Handle double-click on text objects
  const handleDoubleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    console.log('🖱️ Double-click detected - setting protection flag');
    setIsHandlingDoubleClick(true);
    
    // Clear any existing timeout
    if (doubleClickTimeoutRef.current) {
      clearTimeout(doubleClickTimeoutRef.current);
    }
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    console.log('🖱️ Double-click coordinates:', { x, y });
    
    // Find text object at click position - use same coordinate system as interactions
    const textObject = Object.entries(objects).find(([id, obj]) => {
      if (obj.type !== 'text' || !obj.width || !obj.height) return false;
      
      const isInBounds = x >= obj.x && x <= obj.x + obj.width &&
                        y >= obj.y && y <= obj.y + obj.height;
      
      console.log('🖱️ Checking text object:', {
        id: id.slice(0, 8),
        objBounds: { x: obj.x, y: obj.y, width: obj.width, height: obj.height },
        clickPos: { x, y },
        isInBounds
      });
      
      return isInBounds;
    });
    
    if (textObject) {
      const [objectId, obj] = textObject;
      console.log('🖱️ Found text object to edit:', objectId.slice(0, 8));
      
      setEditingTextId(objectId);
      // Position textarea to match canvas text positioning exactly with 4px padding
      setTextEditorPosition({
        x: obj.x + 4, // Match the 4px left padding
        y: obj.y + 4, // Match the 4px top padding
        width: obj.width! - 8, // Account for left and right padding
        height: obj.height! - 8 // Account for top and bottom padding
      });
      
      // Only clear text if it's the placeholder text, otherwise keep the existing text
      const currentContent = obj.data?.content || '';
      const isPlaceholderText = currentContent === 'Double-click to edit' || currentContent.trim() === '';
      setEditingText(isPlaceholderText ? '' : currentContent);
      
      // Set cursor to end of text after a short delay to ensure textarea is rendered
      if (!isPlaceholderText) {
        setTimeout(() => {
          if (textareaRef.current) {
            const textLength = currentContent.length;
            textareaRef.current.setSelectionRange(textLength, textLength);
            textareaRef.current.focus();
          }
        }, 0);
      }
    } else {
      console.log('🖱️ No text object found at double-click position');
    }
    
    // Reset protection flag after a short delay
    doubleClickTimeoutRef.current = setTimeout(() => {
      console.log('🖱️ Clearing double-click protection flag');
      setIsHandlingDoubleClick(false);
    }, 300); // 300ms should be enough to prevent interference
  };

  // Handle text editing completion
  const handleTextEditComplete = () => {
    if (editingTextId) {
      const finalText = editingText?.trim() || '';
      updateObject(editingTextId, {
        data: {
          ...objects[editingTextId]?.data,
          content: finalText // Store empty string if no content
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

    // Add touch event listeners with { passive: false } to allow preventDefault
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [interactions]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (doubleClickTimeoutRef.current) {
        clearTimeout(doubleClickTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Handles mouse down events on the canvas
   * @param event - Mouse event
   */
  const onMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (canvasRef.current && !isHandlingDoubleClick) {
      console.log('🖱️ Mouse down - protection flag:', isHandlingDoubleClick);
      interactions.handlePointerDown(event.nativeEvent, canvasRef.current);
    } else if (isHandlingDoubleClick) {
      console.log('🖱️ Mouse down blocked due to double-click protection');
    }
  };

  /**
   * Handles mouse move events on the canvas
   * @param event - Mouse event
   */
  const onMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (canvasRef.current) {
      interactions.handlePointerMove(event.nativeEvent, canvasRef.current);
    }
  };

  /**
   * Handles mouse up events on the canvas
   * @param event - Mouse event
   */
  const onMouseUp = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (canvasRef.current) {
      interactions.handlePointerUp(event.nativeEvent, canvasRef.current);
    }
  };

  /**
   * Handles mouse leaving the canvas area
   * @param event - Mouse event
   */
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
          touchAction: 'none' // Prevent default touch behaviors
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onDoubleClick={handleDoubleClick}
      />
      
      {/* Text Editor Overlay - Positioned to match canvas text exactly with padding */}
      {editingTextId && textEditorPosition && (
        <textarea
          ref={textareaRef}
          className="absolute bg-transparent border-none resize-none outline-none"
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
            color: 'transparent', // Make the text invisible
            caretColor: objects[editingTextId]?.stroke || '#000000', // Keep the cursor visible
            zIndex: 1000,
            lineHeight: (objects[editingTextId]?.data?.fontSize || 16) * 1.2 + 'px', // Match canvas line height
            padding: '0' // Remove default textarea padding since we handle it with positioning
          }}
          value={editingText}
          onChange={(e) => setEditingText(e.target.value)}
          onBlur={handleTextEditComplete}
          onKeyDown={handleTextKeyDown}
          autoFocus
        />
      )}
      
      {/* Custom Cursor */}
      <CustomCursor canvas={canvasRef.current} />
      
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
        {isHandlingDoubleClick && ' | Double-click Protection Active'}
      </div>
    </div>
  );
};
