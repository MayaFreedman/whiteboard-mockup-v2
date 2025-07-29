import React, { useRef, useEffect, useState } from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useToolStore } from '../../stores/toolStore';
import { useCanvasInteractions } from '../../hooks/canvas/useCanvasInteractions';
import { useCanvasRendering } from '../../hooks/useCanvasRendering';
import { useToolSelection } from '../../hooks/useToolSelection';
import { useUser } from '../../contexts/UserContext';
import { useActionBatching } from '../../hooks/useActionBatching';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const whiteboardStore = useWhiteboardStore();
  const { viewport, selectedObjectIds, updateObject, objects, deleteObject, clearSelection, addObject } = whiteboardStore;
  const toolStore = useToolStore();
  const { activeTool } = toolStore;
  const { userId } = useUser();
  const { startBatch, endBatch } = useActionBatching({ batchTimeout: 100, maxBatchSize: 50 });
  
  // Text editing state
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [textEditorPosition, setTextEditorPosition] = useState<{ x: number, y: number, width: number, height: number, lineHeight: number } | null>(null);
  const [editingText, setEditingText] = useState('');
  
  // Immediate text editing state
  const [isImmediateTextEditing, setIsImmediateTextEditing] = useState(false);
  const [immediateTextPosition, setImmediateTextPosition] = useState<{ x: number, y: number } | null>(null);
  const [immediateTextContent, setImmediateTextContent] = useState('');
  
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
    interactions.getCurrentSelectionBox,
    editingTextId,
    editingText
  );
  
  // Update interactions hook with redraw function and double-click protection AND editing state
  interactions.setRedrawCanvas(redrawCanvas);
  interactions.setDoubleClickProtection(isHandlingDoubleClick);
  interactions.setEditingState(editingTextId !== null || isImmediateTextEditing);
  
  // Set callback for immediate text editing
  interactions.setImmediateTextTrigger((coords) => {
    console.log('📝 Immediate text editing triggered by interactions hook at:', coords);
    setIsImmediateTextEditing(true);
    setImmediateTextPosition(coords);
    setImmediateTextContent('');
    
    // Focus the textarea after a short delay
    setTimeout(() => {
      const textarea = document.querySelector('[data-immediate-text]') as HTMLTextAreaElement;
      if (textarea) {
        textarea.focus();
        console.log('📝 Focused immediate text textarea');
      }
    }, 50);
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
    const metrics = measureText(
      content || 'Double-click to edit',
      textData.fontSize,
      textData.fontFamily,
      textData.bold,
      textData.italic,
      textObject.width - 8 // Use available width minus padding for wrapping
    );
    
    console.log('📏 Text bounds update:', {
      content: content?.slice(0, 50) + (content && content.length > 50 ? '...' : ''),
      availableWidth: textObject.width - 8,
      measuredDimensions: { width: metrics.width, height: metrics.height },
      lineCount: metrics.lines.length
    });
    
    // Add padding to the measured dimensions
    const padding = 8;
    const newWidth = Math.max(metrics.width + padding, 100); // Minimum 100px width
    const newHeight = Math.max(metrics.height + padding, textData.fontSize + padding);
    
    if (newWidth !== textObject.width || newHeight !== textObject.height) {
      updateObject(textObject.id, {
        width: newWidth,
        height: newHeight
      });
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

  // Handle text editing completion (for double-click editing)
  const handleTextEditComplete = () => {
    if (editingTextId && objects[editingTextId]) {
      const finalText = editingText?.trim() || '';
      const textObject = objects[editingTextId];
      
      // If text is empty, revert to placeholder text
      const contentToSave = finalText || 'Double-click to edit';
      
      // Update the text content
      updateObject(editingTextId, {
        data: {
          ...textObject.data,
          content: contentToSave
        }
      });
      
      // Auto-resize text bounds to fit content
      setTimeout(() => {
        const updatedObject = objects[editingTextId];
        if (updatedObject) {
          updateTextBounds(updatedObject, contentToSave);
        }
      }, 0);
      
      redrawCanvas();
    }
    
    setEditingTextId(null);
    setTextEditorPosition(null);
    setEditingText('');
  };

  // Handle immediate text editing completion
  const handleImmediateTextComplete = () => {
    const finalText = immediateTextContent?.trim() || '';
    
    if (finalText && immediateTextPosition) {
      // Use the exact same font settings as the textarea for consistency
      const fontSize = toolStore.toolSettings.fontSize || 16;
      const fontFamily = toolStore.toolSettings.fontFamily || 'Arial';
      const bold = toolStore.toolSettings.textBold || false;
      const italic = toolStore.toolSettings.textItalic || false;
      
      // Measure text using the same approach as canvas rendering
      const metrics = measureText(finalText, fontSize, fontFamily, bold, italic);
      
      // Add padding and ensure minimum dimensions (match canvas text rendering)
      const padding = 8;
      const width = Math.max(metrics.width + padding, 100);
      const height = Math.max(metrics.height + padding, fontSize + padding);
      
      // Create the text object with the typed content
      // Use the exact same positioning as the textarea to prevent movement
      const textData = {
        content: finalText,
        fontSize,
        fontFamily,
        bold,
        italic,
        underline: toolStore.toolSettings.textUnderline || false,
        textAlign: toolStore.toolSettings.textAlign || 'left'
      };

      const textObject = {
        type: 'text' as const,
        x: immediateTextPosition.x - 4, // Subtract textarea padding to align with canvas text
        y: immediateTextPosition.y - 4, // Subtract textarea padding to align with canvas text
        width,
        height,
        stroke: toolStore.toolSettings.strokeColor,
        fill: 'transparent',
        strokeWidth: toolStore.toolSettings.strokeWidth || 1, // Use tool settings, not hardcoded
        opacity: 1,
        data: textData
      };

      const objectId = addObject(textObject, userId);
      console.log('📝 Created immediate text object:', objectId.slice(0, 8), {
        content: finalText,
        dimensions: { width, height },
        position: immediateTextPosition,
        textareaPos: { x: immediateTextPosition.x, y: immediateTextPosition.y }
      });
      
      redrawCanvas();
    }
    
    // Reset immediate editing state
    setIsImmediateTextEditing(false);
    setImmediateTextPosition(null);
    setImmediateTextContent('');
  };

  // Handle text input changes with logging
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setEditingText(newText);
    
    console.log('✏️ Text changed:', {
      length: newText.length,
      content: newText.slice(0, 50) + (newText.length > 50 ? '...' : ''),
      lines: newText.split('\n').length,
      hasLongWords: newText.split(' ').some(word => word.length > 20)
    });
  };

  // Handle text input key events (double-click editing)
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

  // Handle immediate text input key events
  const handleImmediateTextKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleImmediateTextComplete();
    } else if (event.key === 'Escape') {
      setIsImmediateTextEditing(false);
      setImmediateTextPosition(null);
      setImmediateTextContent('');
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

  // Handle keyboard events for object deletion
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle delete when:
      // 1. Not editing text (any kind)
      // 2. Objects are selected
      // 3. Focus is on the canvas container or its children
      if (editingTextId || isImmediateTextEditing || selectedObjectIds.length === 0) {
        return;
      }

      // Check if the delete key or backspace was pressed
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        
        // Start a batch for multi-delete
        const batchId = startBatch('DELETE_OBJECT', 'multi-delete', userId);
        
        // Delete all selected objects
        selectedObjectIds.forEach(objectId => {
          deleteObject(objectId, userId);
        });
        
        // End the batch
        endBatch();
        
        // Clear selection after deletion (not part of undo/redo)
        clearSelection(userId);
        
        console.log('🗑️ Deleted selected objects in batch:', selectedObjectIds.length, 'objects');
      }
    };

    // Add event listener to document to capture keyboard events
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [editingTextId, isImmediateTextEditing, selectedObjectIds, deleteObject, clearSelection, userId, startBatch, endBatch]);

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
    // Block interactions during double-click protection
    if (isHandlingDoubleClick) {
      console.log('🖱️ Mouse down blocked - double-click protection active');
      return;
    }
    
    // Handle click outside immediate text editing area - complete the text
    // This should work regardless of which tool is active
    if (isImmediateTextEditing) {
      console.log('🖱️ Click outside immediate text editing - completing text');
      handleImmediateTextComplete();
      // Don't return here - allow the tool interaction to continue
      // This ensures we can start a new text editing session immediately
    }

    // Handle click outside regular text editing area - complete the text editing
    if (editingTextId) {
      console.log('🖱️ Click outside regular text editing - completing text edit');
      handleTextEditComplete();
      // Don't return here - allow the tool interaction to continue
    }

    if (canvasRef.current) {
      console.log('🖱️ Mouse down - protection flag:', isHandlingDoubleClick, 'editing text:', !!editingTextId, 'immediate editing:', isImmediateTextEditing);
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
    <div 
      ref={containerRef}
      className="w-full h-full relative bg-background overflow-hidden"
      tabIndex={0}
      style={{ outline: 'none' }}
    >
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

      {/* Immediate Text Editor Overlay - For click-to-type functionality */}
      {isImmediateTextEditing && immediateTextPosition && (
        <textarea
          data-immediate-text="true"
          className="absolute bg-transparent border-none resize-none outline-none overflow-hidden"
          style={{
            left: immediateTextPosition.x,
            top: immediateTextPosition.y,
            width: 300, // Wider default width to prevent early wrapping
            height: toolStore.toolSettings.fontSize * 1.2 || 20, // Height based on font size
            fontSize: toolStore.toolSettings.fontSize || 16,
            fontFamily: toolStore.toolSettings.fontFamily || 'Arial',
            fontWeight: toolStore.toolSettings.textBold ? 'bold' : 'normal',
            fontStyle: toolStore.toolSettings.textItalic ? 'italic' : 'normal',
            textDecoration: toolStore.toolSettings.textUnderline ? 'underline' : 'none',
            textAlign: toolStore.toolSettings.textAlign || 'left',
            color: toolStore.toolSettings.strokeColor || '#000000',
            caretColor: toolStore.toolSettings.strokeColor || '#000000',
            zIndex: 1001, // Higher than regular text editing
            lineHeight: (toolStore.toolSettings.fontSize * 1.2 || 20) + 'px',
            padding: '4px', // Match canvas text padding
            margin: '0',
            border: 'none',
            wordWrap: 'break-word',
            whiteSpace: 'pre-wrap',
            overflowWrap: 'break-word',
            textRendering: 'optimizeLegibility',
            fontSmooth: 'antialiased',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            WebkitTextSizeAdjust: '100%',
            boxSizing: 'border-box',
            background: 'rgba(255, 255, 255, 0.9)', // Semi-transparent background for visibility
            borderRadius: '2px',
            minHeight: (toolStore.toolSettings.fontSize || 16) * 1.2 + 'px'
          }}
          value={immediateTextContent}
          onChange={(e) => setImmediateTextContent(e.target.value)}
          onBlur={handleImmediateTextComplete}
          onKeyDown={handleImmediateTextKeyDown}
          placeholder="Type here..."
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
      </div>
    </div>
  );
};
