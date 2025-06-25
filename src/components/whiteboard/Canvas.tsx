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
  const { viewport, selectedObjectIds, updateObject, objects } = useWhiteboardStore();
  const { activeTool } = useToolStore();
  
  // Text editing state
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [textEditorPosition, setTextEditorPosition] = useState<{ x: number, y: number, width: number, height: number, lineHeight: number } | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isImmediateEditing, setIsImmediateEditing] = useState(false); // Track if in immediate editing mode
  
  // Double-click protection flag - reduced timeout to 200ms
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
  
  // Update interactions hook with redraw function and double-click protection AND editing state
  interactions.setRedrawCanvas(redrawCanvas);
  interactions.setDoubleClickProtection(isHandlingDoubleClick);
  interactions.setEditingState(editingTextId !== null);
  
  // Set immediate text editing callback
  interactions.setImmediateTextEditingCallback((objectId: string, position: { x: number; y: number }) => {
    console.log('🚀 Starting immediate text editing for object:', objectId.slice(0, 8));
    
    const textObject = objects[objectId];
    if (!textObject) return;
    
    setEditingTextId(objectId);
    setIsImmediateEditing(true);
    
    // Calculate position for immediate editing (minimal initial size)
    const editorPosition = {
      x: position.x,
      y: position.y,
      width: 200, // Start with reasonable width that can grow
      height: 30, // Minimal height
      lineHeight: textObject.data?.fontSize || 16
    };
    
    setTextEditorPosition(editorPosition);
    setEditingText(''); // Start with empty text for immediate editing
    
    // Focus the textarea after a short delay
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 0);
  });

  // Handle resize for selected objects
  const handleResize = (objectId: string, newBounds: { x: number; y: number; width: number; height: number }) => {
    updateObject(objectId, newBounds);
    redrawCanvas();
  };

  // Auto-resize text object to fit content using the same measureText function
  const updateTextBounds = (textObject: any, content: string) => {
    if (!textObject.data) return;
    
    const textData = textObject.data;
    const availableWidth = isImmediateEditing ? 400 : (textObject.width - 8); // Larger width for immediate editing
    
    const metrics = measureText(
      content || (isImmediateEditing ? '' : 'Double-click to edit'),
      textData.fontSize,
      textData.fontFamily,
      textData.bold,
      textData.italic,
      availableWidth
    );
    
    console.log('📏 Text bounds update:', {
      content: content?.slice(0, 50) + (content && content.length > 50 ? '...' : ''),
      availableWidth,
      measuredDimensions: { width: metrics.width, height: metrics.height },
      lineCount: metrics.lines.length,
      isImmediateEditing
    });
    
    // Add padding to the measured dimensions
    const padding = 8;
    const newWidth = Math.max(metrics.width + padding, isImmediateEditing ? 100 : 100); // Minimum width
    const newHeight = Math.max(metrics.height + padding, textData.fontSize + padding);
    
    if (newWidth !== textObject.width || newHeight !== textObject.height) {
      updateObject(textObject.id, {
        width: newWidth,
        height: newHeight
      });
      
      // Update text editor position if currently editing
      if (editingTextId === textObject.id && textEditorPosition) {
        setTextEditorPosition({
          ...textEditorPosition,
          width: newWidth - 8,
          height: newHeight - 8
        });
      }
    }
  };

  // Utility function to calculate exact text positioning using canvas metrics
  const calculateTextPosition = (textObject: any, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx || !textObject.data) return null;

    const textData = textObject.data;
    
    // Set the exact same font properties as canvas rendering
    let fontStyle = '';
    if (textData.italic) fontStyle += 'italic ';
    if (textData.bold) fontStyle += 'bold ';
    ctx.font = `${fontStyle}${textData.fontSize}px ${textData.fontFamily}`;
    
    // Use the exact same line height calculation as canvas
    const lineHeight = Math.round(textData.fontSize * 1.2);
    
    return {
      x: Math.round(textObject.x + 4), // Same 4px padding as canvas
      y: Math.round(textObject.y + 4), // Same 4px padding as canvas  
      width: Math.round(textObject.width - 8), // Account for left/right padding
      height: Math.round(textObject.height - 8), // Account for top/bottom padding
      lineHeight: lineHeight
    };
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
    
    // Find text object at click position using improved hit detection
    const textObject = Object.entries(objects).find(([id, obj]) => {
      if (obj.type !== 'text' || !obj.width || !obj.height || !obj.data) return false;
      
      const textData = obj.data;
      const currentContent = textData.content || 'Double-click to edit';
      
      // Use accurate text measurement for hit detection with same available width as canvas
      const availableWidth = obj.width - 8; // Same calculation as canvas rendering
      const metrics = measureText(
        currentContent,
        textData.fontSize,
        textData.fontFamily,
        textData.bold,
        textData.italic,
        availableWidth
      );
      
      // Check if click is within the actual text bounds
      const textStartX = obj.x + 4; // Account for padding
      const textStartY = obj.y + 4; // Account for padding
      
      let textEndX = textStartX + metrics.width;
      let textEndY = textStartY + metrics.height;
      
      // Add some tolerance for easier clicking
      const tolerance = 8;
      const isInBounds = x >= (textStartX - tolerance) && x <= (textEndX + tolerance) &&
                        y >= (textStartY - tolerance) && y <= (textEndY + tolerance);
      
      console.log('🖱️ Checking text object with accurate bounds:', {
        id: id.slice(0, 8),
        textBounds: { x: textStartX, y: textStartY, width: metrics.width, height: metrics.height },
        clickPos: { x, y },
        tolerance,
        isInBounds
      });
      
      return isInBounds;
    });
    
    if (textObject) {
      const [objectId, obj] = textObject;
      console.log('🖱️ Found text object to edit:', objectId.slice(0, 8));
      
      setEditingTextId(objectId);
      setIsImmediateEditing(false); // This is traditional double-click editing
      
      // Calculate exact text position using canvas metrics
      const position = calculateTextPosition(obj, canvasRef.current);
      if (position) {
        setTextEditorPosition(position);
      }
      
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
    
    // Reset protection flag after a shorter delay - reduced to 200ms
    doubleClickTimeoutRef.current = setTimeout(() => {
      console.log('🖱️ Clearing double-click protection flag');
      setIsHandlingDoubleClick(false);
    }, 200);
  };

  // Handle text editing completion
  const handleTextEditComplete = () => {
    if (editingTextId && objects[editingTextId]) {
      const finalText = editingText?.trim() || '';
      const textObject = objects[editingTextId];
      
      // For immediate editing, delete empty text objects
      if (isImmediateEditing && finalText === '') {
        console.log('🗑️ Deleting empty immediate text object');
        // This would need to be implemented in the store
        // For now, just set placeholder text
        updateObject(editingTextId, {
          data: {
            ...textObject.data,
            content: 'Double-click to edit'
          }
        });
      } else {
        // Update the text content
        updateObject(editingTextId, {
          data: {
            ...textObject.data,
            content: finalText || (isImmediateEditing ? '' : 'Double-click to edit')
          }
        });
      }
      
      // Auto-resize text bounds to fit content
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

  // Handle text input changes with logging and dynamic resizing
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setEditingText(newText);
    
    // Dynamic resizing for immediate editing
    if (isImmediateEditing && editingTextId && objects[editingTextId]) {
      const textObject = objects[editingTextId];
      updateTextBounds(textObject, newText);
    }
    
    console.log('✏️ Text changed:', {
      length: newText.length,
      content: newText.slice(0, 50) + (newText.length > 50 ? '...' : ''),
      lines: newText.split('\n').length,
      isImmediate: isImmediateEditing
    });
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

  /**
   * Handles mouse down events on the canvas
   * @param event - Mouse event
   */
  const onMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    // Only block interactions if we're editing the specific text that was clicked
    // This allows creating new text objects while editing existing ones
    if (isHandlingDoubleClick) {
      console.log('🖱️ Mouse down blocked - double-click protection active');
      return;
    }

    if (canvasRef.current) {
      console.log('🖱️ Mouse down - protection flag:', isHandlingDoubleClick, 'editing:', !!editingTextId);
      interactions.handlePointerDown(event.nativeEvent, canvasRef.current);
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
      
      {/* Text Editor Overlay - Positioned to match canvas text exactly */}
      {editingTextId && textEditorPosition && (
        <textarea
          ref={textareaRef}
          className="absolute bg-transparent border-none resize-none outline-none overflow-hidden"
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
            color: 'transparent', // Make the text invisible
            caretColor: objects[editingTextId]?.stroke || '#000000', // Keep the cursor visible
            zIndex: 1000,
            lineHeight: textEditorPosition.lineHeight + 'px', // Use exact canvas line height
            padding: '0', // Remove default textarea padding since we handle it with positioning
            margin: '0', // Remove default margins
            border: 'none', // Remove borders
            wordWrap: 'break-word', // Enable word wrapping
            whiteSpace: 'pre-wrap', // Preserve line breaks and wrap text
            overflowWrap: 'break-word', // Break long words if necessary to match canvas behavior
            // Font rendering optimizations to match canvas
            textRendering: 'optimizeLegibility',
            fontSmooth: 'antialiased',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            // Disable browser text selection styling
            WebkitTextSizeAdjust: '100%',
            // Ensure consistent box model
            boxSizing: 'border-box'
          }}
          value={editingText}
          onChange={handleTextChange}
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
        {editingTextId && ' | Editing Text'}
        {isImmediateEditing && ' | Immediate Mode'}
      </div>
    </div>
  );
};
