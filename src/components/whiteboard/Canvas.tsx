import React, { useRef, useEffect, useState } from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useToolStore } from '../../stores/toolStore';
import { useCanvasInteractions } from '../../hooks/canvas/useCanvasInteractions';
import { useCanvasRendering } from '../../hooks/useCanvasRendering';
import { useToolSelection } from '../../hooks/useToolSelection';
import { CustomCursor } from './CustomCursor';
import { ResizeHandles } from './ResizeHandles';
import { measureText } from '../../utils/textMeasurement';

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
      return 'none'; // Hide default cursor for fill tool (uses custom cursor)
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
  
  // Safe store access with fallback
  const whiteboardStore = useWhiteboardStore();
  const toolStore = useToolStore();
  
  // Guard against null stores
  if (!whiteboardStore || !toolStore) {
    console.error('Store not initialized');
    return <div className="w-full h-full bg-background">Loading...</div>;
  }
  
  const { viewport, selectedObjectIds, updateObject, objects } = whiteboardStore;
  const { activeTool } = toolStore;
  
  // Text editing state
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [textEditorPosition, setTextEditorPosition] = useState<{ x: number, y: number, width: number, height: number, lineHeight: number } | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isImmediateEditing, setIsImmediateEditing] = useState(false);
  
  // Double-click protection flag
  const [isHandlingDoubleClick, setIsHandlingDoubleClick] = useState(false);
  const doubleClickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Handle tool selection logic
  useToolSelection();
  
  // Initialize interactions hook
  const interactions = useCanvasInteractions();
  
  // Initialize rendering hook
  const { redrawCanvas } = useCanvasRendering(
    canvasRef.current, 
    interactions.getCurrentDrawingPreview,
    interactions.getCurrentShapePreview,
    editingTextId,
    editingText
  );
  
  // Update interactions hook
  interactions.setRedrawCanvas(redrawCanvas);
  interactions.setDoubleClickProtection(isHandlingDoubleClick);
  interactions.setEditingState(editingTextId !== null);
  
  // Set immediate text editing callback - FIXED to actually start editing
  interactions.setImmediateTextEditingCallback((objectId: string, position: { x: number; y: number }) => {
    console.log('🚀 Starting immediate text editing for object:', objectId.slice(0, 8));
    
    const textObject = objects[objectId];
    if (!textObject) return;
    
    setEditingTextId(objectId);
    setIsImmediateEditing(true);
    
    // Calculate position for immediate editing
    const editorPosition = {
      x: position.x,
      y: position.y,
      width: 200,
      height: 30,
      lineHeight: textObject.data?.fontSize || 16
    };
    
    setTextEditorPosition(editorPosition);
    setEditingText(''); // Start with empty text
    
    // Focus the textarea immediately
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        console.log('📝 Textarea focused for immediate editing');
      }
    }, 10);
  });

  // Handle resize for selected objects
  const handleResize = (objectId: string, newBounds: { x: number; y: number; width: number; height: number }) => {
    updateObject(objectId, newBounds);
    redrawCanvas();
  };

  // Auto-resize text object to fit content
  const updateTextBounds = (textObject: any, content: string) => {
    if (!textObject.data) return;
    
    const textData = textObject.data;
    const availableWidth = isImmediateEditing ? 400 : (textObject.width - 8);
    
    const metrics = measureText(
      content || (isImmediateEditing ? '' : 'Double-click to edit'),
      textData.fontSize,
      textData.fontFamily,
      textData.bold,
      textData.italic,
      availableWidth
    );
    
    const padding = 8;
    const newWidth = Math.max(metrics.width + padding, isImmediateEditing ? 100 : 100);
    const newHeight = Math.max(metrics.height + padding, textData.fontSize + padding);
    
    if (newWidth !== textObject.width || newHeight !== textObject.height) {
      updateObject(textObject.id, {
        width: newWidth,
        height: newHeight
      });
      
      if (editingTextId === textObject.id && textEditorPosition) {
        setTextEditorPosition({
          ...textEditorPosition,
          width: newWidth - 8,
          height: newHeight - 8
        });
      }
    }
  };

  // Calculate text position
  const calculateTextPosition = (textObject: any, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx || !textObject.data) return null;

    const textData = textObject.data;
    
    let fontStyle = '';
    if (textData.italic) fontStyle += 'italic ';
    if (textData.bold) fontStyle += 'bold ';
    ctx.font = `${fontStyle}${textData.fontSize}px ${textData.fontFamily}`;
    
    const lineHeight = Math.round(textData.fontSize * 1.2);
    
    return {
      x: Math.round(textObject.x + 4),
      y: Math.round(textObject.y + 4),
      width: Math.round(textObject.width - 8),
      height: Math.round(textObject.height - 8),
      lineHeight: lineHeight
    };
  };

  // Handle double-click on text objects
  const handleDoubleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    console.log('🖱️ Double-click detected');
    setIsHandlingDoubleClick(true);
    
    if (doubleClickTimeoutRef.current) {
      clearTimeout(doubleClickTimeoutRef.current);
    }
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Find text object at click position
    const textObject = Object.entries(objects).find(([id, obj]) => {
      if (obj.type !== 'text' || !obj.width || !obj.height || !obj.data) return false;
      
      const textData = obj.data;
      const currentContent = textData.content || 'Double-click to edit';
      
      const availableWidth = obj.width - 8;
      const metrics = measureText(
        currentContent,
        textData.fontSize,
        textData.fontFamily,
        textData.bold,
        textData.italic,
        availableWidth
      );
      
      const textStartX = obj.x + 4;
      const textStartY = obj.y + 4;
      const textEndX = textStartX + metrics.width;
      const textEndY = textStartY + metrics.height;
      
      const tolerance = 8;
      return x >= (textStartX - tolerance) && x <= (textEndX + tolerance) &&
             y >= (textStartY - tolerance) && y <= (textEndY + tolerance);
    });
    
    if (textObject) {
      const [objectId, obj] = textObject;
      console.log('🖱️ Found text object to edit:', objectId.slice(0, 8));
      
      setEditingTextId(objectId);
      setIsImmediateEditing(false);
      
      const position = calculateTextPosition(obj, canvasRef.current);
      if (position) {
        setTextEditorPosition(position);
      }
      
      const currentContent = obj.data?.content || '';
      const isPlaceholderText = currentContent === 'Double-click to edit' || currentContent.trim() === '';
      setEditingText(isPlaceholderText ? '' : currentContent);
      
      if (!isPlaceholderText) {
        setTimeout(() => {
          if (textareaRef.current) {
            const textLength = currentContent.length;
            textareaRef.current.setSelectionRange(textLength, textLength);
            textareaRef.current.focus();
          }
        }, 10);
      }
    }
    
    doubleClickTimeoutRef.current = setTimeout(() => {
      setIsHandlingDoubleClick(false);
    }, 200);
  };

  // Handle text editing completion
  const handleTextEditComplete = () => {
    if (editingTextId && objects[editingTextId]) {
      const finalText = editingText?.trim() || '';
      const textObject = objects[editingTextId];
      
      console.log('📝 Completing text edit:', { finalText, isImmediate: isImmediateEditing });
      
      if (isImmediateEditing && finalText === '') {
        console.log('🗑️ Deleting empty immediate text object');
        updateObject(editingTextId, {
          data: {
            ...textObject.data,
            content: 'Double-click to edit'
          }
        });
      } else {
        updateObject(editingTextId, {
          data: {
            ...textObject.data,
            content: finalText || (isImmediateEditing ? '' : 'Double-click to edit')
          }
        });
      }
      
      setTimeout(() => {
        const updatedObject = objects[editingTextId];
        if (updatedObject) {
          updateTextBounds(updatedObject, finalText);
        }
      }, 0);
      
      redrawCanvas();
    }
    
    setEditingTextId(null);
    setTextEditorPosition(null);
    setEditingText('');
    setIsImmediateEditing(false);
  };

  // Handle text input changes
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setEditingText(newText);
    
    if (isImmediateEditing && editingTextId && objects[editingTextId]) {
      const textObject = objects[editingTextId];
      updateTextBounds(textObject, newText);
    }
    
    console.log('✏️ Text changed:', { length: newText.length, isImmediate: isImmediateEditing });
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
      setIsImmediateEditing(false);
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

  const onMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (isHandlingDoubleClick) {
      console.log('🖱️ Mouse down blocked - double-click protection active');
      return;
    }

    if (canvasRef.current) {
      console.log('🖱️ Mouse down - protection:', isHandlingDoubleClick, 'editing:', !!editingTextId);
      interactions.handlePointerDown(event.nativeEvent, canvasRef.current);
    }
  };

  const onMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (canvasRef.current) {
      interactions.handlePointerMove(event.nativeEvent, canvasRef.current);
    }
  };

  const onMouseUp = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (canvasRef.current) {
      interactions.handlePointerUp(event.nativeEvent, canvasRef.current);
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
      
      {/* Text Editor Overlay - FIXED transparency issue */}
      {editingTextId && textEditorPosition && (
        <textarea
          ref={textareaRef}
          className="absolute bg-white/90 border border-gray-300 resize-none outline-none overflow-hidden rounded"
          style={{
            left: textEditorPosition.x,
            top: textEditorPosition.y,
            width: textEditorPosition.width,
            height: textEditorPosition.height,
            minWidth: isImmediateEditing ? '100px' : textEditorPosition.width,
            fontSize: objects[editingTextId]?.data?.fontSize || 16,
            fontFamily: objects[editingTextId]?.data?.fontFamily || 'Arial',
            fontWeight: objects[editingTextId]?.data?.bold ? 'bold' : 'normal',
            fontStyle: objects[editingTextId]?.data?.italic ? 'italic' : 'normal',
            textDecoration: objects[editingTextId]?.data?.underline ? 'underline' : 'none',
            textAlign: objects[editingTextId]?.data?.textAlign || 'left',
            color: objects[editingTextId]?.stroke || '#000000', // FIXED: Made text visible
            caretColor: objects[editingTextId]?.stroke || '#000000',
            zIndex: 1000,
            lineHeight: textEditorPosition.lineHeight + 'px',
            padding: '4px',
            margin: '0',
            wordWrap: 'break-word',
            whiteSpace: 'pre-wrap',
            overflowWrap: 'break-word',
            textRendering: 'optimizeLegibility',
            fontSmooth: 'antialiased',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            WebkitTextSizeAdjust: '100%',
            boxSizing: 'border-box'
          }}
          value={editingText}
          onChange={handleTextChange}
          onBlur={handleTextEditComplete}
          onKeyDown={handleTextKeyDown}
          autoFocus
          placeholder={isImmediateEditing ? "Type here..." : ""}
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
        {isHandlingDoubleClick && ' | Double-click Protection Active'}
        {editingTextId && ' | Editing Text'}
        {isImmediateEditing && ' | Immediate Mode'}
      </div>
    </div>
  );
};
