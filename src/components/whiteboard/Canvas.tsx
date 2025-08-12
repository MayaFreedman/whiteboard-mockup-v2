import React, { useRef, useEffect, useState } from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useToolStore } from '../../stores/toolStore';
import { useCanvasInteractions } from '../../hooks/canvas/useCanvasInteractions';
import { useCanvasRendering } from '../../hooks/useCanvasRendering';
import { useToolSelection } from '../../hooks/useToolSelection';
import { useUser } from '../../contexts/UserContext';
import { useActionBatching } from '../../hooks/useActionBatching';
import { useScreenSizeStore } from '../../stores/screenSizeStore';
import { useScreenSizeSync } from '../../hooks/useScreenSizeSync';
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
  const { activeWhiteboardSize, userScreenSizes } = useScreenSizeStore();
  
  // Only show grey overlay when there are multiple users
  const hasMultipleUsers = Object.keys(userScreenSizes).length > 1;
  
  // Initialize screen size sync
  useScreenSizeSync();
  
  // Text editing state
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [textEditorPosition, setTextEditorPosition] = useState<{ x: number, y: number, width: number, height: number, lineHeight: number } | null>(null);
  const [editingText, setEditingText] = useState('');
  
  // Immediate text editing state
  const [isImmediateTextEditing, setIsImmediateTextEditing] = useState(false);
  const [immediateTextPosition, setImmediateTextPosition] = useState<{ x: number, y: number } | null>(null);
  const [immediateTextContent, setImmediateTextContent] = useState('');
  const [immediateTextObjectId, setImmediateTextObjectId] = useState<string | null>(null);
  
  // Double-click protection flag - reduced timeout to 200ms
  const [isHandlingDoubleClick, setIsHandlingDoubleClick] = useState(false);
  const doubleClickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Handle tool selection logic (clearing selection when switching tools)
  useToolSelection();
  
  // Initialize interactions hook first to get the preview functions
  const interactions = useCanvasInteractions();
  
  // Initialize rendering hook with both preview functions AND editing state
  const { redrawCanvas, isManualResizing } = useCanvasRendering(
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
    
    // Create canvas text object immediately with empty content
    const fontSize = toolStore.toolSettings.fontSize || 16;
    const fontFamily = toolStore.toolSettings.fontFamily || 'Arial';
    const bold = toolStore.toolSettings.textBold || false;
    const italic = toolStore.toolSettings.textItalic || false;
    
    // Create initial text object with placeholder content
    const textData = {
      content: '',
      fontSize,
      fontFamily,
      bold,
      italic,
      underline: toolStore.toolSettings.textUnderline || false,
      textAlign: 'left'
    };

    const textObject = {
      type: 'text' as const,
      x: coords.x - 4, // Account for canvas text 4px left padding
      y: coords.y,
      width: 200, // Initial width
      height: fontSize + 8, // Initial height with padding
      stroke: toolStore.toolSettings.strokeColor,
      fill: 'transparent',
      strokeWidth: 1,
      opacity: 1,
      data: textData
    };

    const objectId = addObject(textObject, userId);
    console.log('📝 Created immediate text object:', objectId.slice(0, 8));
    
    setIsImmediateTextEditing(true);
    setImmediateTextPosition(coords);
    setImmediateTextContent('');
    setImmediateTextObjectId(objectId);
    
    redrawCanvas();
    
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
    console.log('🎯 Canvas handleResize called:', { objectId, newBounds, objectType: objects[objectId]?.type });
    
    // Set manual resizing flag to prevent ResizeObserver from triggering additional redraws
    if (isManualResizing) {
      isManualResizing.current = true;
    }
    
    const obj = objects[objectId];
    let updates: any = { ...newBounds };

    if (obj && obj.type === 'text' && typeof obj.width === 'number' && typeof obj.height === 'number') {
      const changedWidth = newBounds.width !== obj.width;
      const changedHeight = newBounds.height !== obj.height;
      if (changedWidth || changedHeight) {
        updates = {
          ...updates,
          data: {
            ...(obj.data || {}),
            ...(changedWidth ? { fixedWidth: true } : {}),
            ...(changedHeight ? { fixedHeight: true } : {}),
          },
        };
      }
    }

    updateObject(objectId, updates);
    // Don't call redrawCanvas here - let the state change trigger it naturally for smoother updates
    
    // Clear the flag after a short delay to allow the resize operation to complete
    setTimeout(() => {
      if (isManualResizing) {
        isManualResizing.current = false;
      }
    }, 50); // Reduced timeout for more responsive feel
  };

  // Auto-resize text object to fit content using the same measureText function
  const updateTextBounds = (textObject: any, content: string) => {
    if (!textObject.data) return;
    
    const textData = textObject.data;
    const isFixedW = !!textData.fixedWidth;
    const isFixedH = !!textData.fixedHeight;
    const padding = 8;
    const isPlaceholder = !content || content.trim() === '' || content === 'Double-click to edit';

    const maxWidth = isFixedW ? Math.max((textObject.width || 0) - padding, 0) : undefined;
    const metrics = measureText(
      content || 'Double-click to edit',
      textData.fontSize,
      textData.fontFamily,
      textData.bold,
      textData.italic,
      maxWidth
    );
    
    console.log('📏 Text bounds update:', {
      content: content?.slice(0, 50) + (content && content.length > 50 ? '...' : ''),
      isFixedWidth: isFixedW,
      isFixedHeight: isFixedH,
      availableWidth: maxWidth,
      measuredDimensions: { width: metrics.width, height: metrics.height },
      lineCount: metrics.lines.length
    });
    
    const measuredWidth = metrics.width + padding;
    const measuredHeight = Math.max(metrics.height + padding, textData.fontSize + padding);

    const updates: any = {};

    if (isFixedW && isFixedH) {
      // Preserve both dimensions when both are fixed
    } else if (isFixedW) {
      // Preserve manual width; update height only. Avoid shrinking due to placeholder.
      const currentHeight = textObject.height || 0;
      const newHeight = isPlaceholder ? Math.max(currentHeight, measuredHeight) : measuredHeight;
      if (newHeight !== textObject.height) updates.height = newHeight;
    } else if (isFixedH) {
      // Preserve manual height; update width only
      const newWidth = Math.max(measuredWidth, 100);
      if (newWidth !== textObject.width) updates.width = newWidth;
    } else {
      // Neither fixed - update both
      const newWidth = Math.max(measuredWidth, 100);
      const newHeight = measuredHeight;
      if (newWidth !== textObject.width) updates.width = newWidth;
      if (newHeight !== textObject.height) updates.height = newHeight;
    }
    
    if (Object.keys(updates).length) {
      updateObject(textObject.id, updates);
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
    
    console.log('🖱️ Double-click detected - setting protection flag and clearing text interaction state');
    setIsHandlingDoubleClick(true);
    
    // Clear any existing timeout
    if (doubleClickTimeoutRef.current) {
      clearTimeout(doubleClickTimeoutRef.current);
    }
    
    // CRITICAL: Clear any residual text interaction state from previous single clicks
    // This prevents phantom text editor from appearing when clicking on empty space
    interactions.clearTextInteractionState();
    
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
      
      // Horizontal offset based on text alignment within available area
      let alignOffset = 0;
      switch (textData.textAlign || 'left') {
        case 'center':
          alignOffset = (availableWidth - metrics.width) / 2;
          break;
        case 'right':
          alignOffset = (availableWidth - metrics.width);
          break;
        default:
          alignOffset = 0;
      }
      
      // Clamp offset to avoid negative shift if metrics exceed available width (safety)
      if (!isFinite(alignOffset)) alignOffset = 0;
      
      // Actual text bounds inside the textbox considering padding and alignment
      const textStartX = obj.x + 4 + Math.max(0, alignOffset);
      const textStartY = obj.y + 4; // top padding
      const textEndX = textStartX + metrics.width;
      const textEndY = textStartY + metrics.height;
      
      // Add some tolerance for easier clicking
      const tolerance = 8;
      const isInBounds = x >= (textStartX - tolerance) && x <= (textEndX + tolerance) &&
                        y >= (textStartY - tolerance) && y <= (textEndY + tolerance);
      
      console.log('🖱️ Checking text object with accurate bounds:', {
        id: id.slice(0, 8),
        textAlign: textData.textAlign,
        availableWidth,
        alignOffset,
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

  // Handle immediate text input changes - update canvas text in real-time
  const handleImmediateTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setImmediateTextContent(newText);
    
    const fontSize = toolStore.toolSettings.fontSize || 16;
    const fontFamily = toolStore.toolSettings.fontFamily || 'Arial';
    const bold = toolStore.toolSettings.textBold || false;
    const italic = toolStore.toolSettings.textItalic || false;
    
    const minWidth = 100;
    const textarea = e.target;
    
    // Calculate available space from text position to screen edge
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (canvasRect && immediateTextPosition) {
      const availableWidth = canvasRect.width - (immediateTextPosition.x - canvasRect.left) - 10; // 10px padding from edge
      
      // Set both width and maxWidth to ensure consistent line wrapping, accounting for text padding
      const textPadding = 8; // Same as canvas rendering (4px left + 4px right)
      const effectiveWidth = availableWidth - textPadding;
      textarea.style.width = effectiveWidth + 'px';
      textarea.style.maxWidth = effectiveWidth + 'px';
      
      // Measure text with the same width for consistent wrapping
      const wrappedMetrics = measureText(newText || '', fontSize, fontFamily, bold, italic, effectiveWidth);
      
      // Update textarea height to match wrapped text height so cursor moves correctly
      textarea.style.height = Math.max(wrappedMetrics.height, fontSize * 1.2) + 'px';
      
      // Update canvas object - use same width as textarea for consistent wrapping
      if (immediateTextObjectId && objects[immediateTextObjectId]) {
        const textObject = objects[immediateTextObjectId];
        updateObject(immediateTextObjectId, {
          data: {
            ...textObject.data,
            content: newText || ''
          },
          width: availableWidth, // Canvas object width (includes padding)
          height: Math.max(wrappedMetrics.height, fontSize * 1.2)
        });
      }
    } else {
      // Fallback to original behavior if we can't calculate boundaries
      const metrics = measureText(newText || '', fontSize, fontFamily, bold, italic);
      const newWidth = Math.max(metrics.width + 20, minWidth);
      textarea.style.width = newWidth + 'px';
      textarea.style.height = Math.max(metrics.height + 10, fontSize * 1.2) + 'px';
      
      if (immediateTextObjectId && objects[immediateTextObjectId]) {
        const textObject = objects[immediateTextObjectId];
        updateObject(immediateTextObjectId, {
          data: {
            ...textObject.data,
            content: newText || ''
          },
          width: newWidth,
          height: Math.max(metrics.height, fontSize * 1.2)
        });
      }
    }
    
    redrawCanvas();
  };

  // Handle immediate text editing completion
  const handleImmediateTextComplete = () => {
    const finalText = immediateTextContent?.trim() || '';
    
    if (immediateTextObjectId && objects[immediateTextObjectId]) {
      if (finalText) {
        // Keep the existing object with final content
        updateObject(immediateTextObjectId, {
          data: {
            ...objects[immediateTextObjectId].data,
            content: finalText
          }
        });
        
        // Final resize to fit content
        setTimeout(() => {
          const updatedObject = objects[immediateTextObjectId];
          if (updatedObject) {
            updateTextBounds(updatedObject, finalText);
          }
        }, 0);
      } else {
        // Delete the object if no text was entered
        deleteObject(immediateTextObjectId, userId);
      }
      
      redrawCanvas();
    }
    
    // Reset immediate editing state
    setIsImmediateTextEditing(false);
    setImmediateTextPosition(null);
    setImmediateTextContent('');
    setImmediateTextObjectId(null);
  };

  // Handle text input changes with logging
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setEditingText(newText);
    
    // Update textarea height dynamically for proper cursor positioning
    const textarea = e.target;
    if (editingTextId && objects[editingTextId] && textEditorPosition) {
      const textObject = objects[editingTextId];
      const fontSize = textObject.data?.fontSize || 16;
      const fontFamily = textObject.data?.fontFamily || 'Arial';
      const bold = textObject.data?.bold || false;
      const italic = textObject.data?.italic || false;
      
      // Measure text to get proper height
      const wrappedMetrics = measureText(newText || '', fontSize, fontFamily, bold, italic, textEditorPosition.width);
      
      // Update textarea height so it expands downward and cursor moves correctly
      const newHeight = Math.max(wrappedMetrics.height, fontSize * 1.2);
      textarea.style.height = newHeight + 'px';
      
      // Also update the canvas object bounds to match
      const isFixedH = !!textObject.data?.fixedHeight;
      updateObject(editingTextId, {
        data: {
          ...textObject.data,
          content: newText
        },
        ...(isFixedH ? {} : { height: newHeight })
      }, userId);
    }
    
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
      // Cancel immediate text editing and clean up the canvas object
      if (immediateTextObjectId && objects[immediateTextObjectId]) {
        deleteObject(immediateTextObjectId, userId);
        redrawCanvas();
      }
      setIsImmediateTextEditing(false);
      setImmediateTextPosition(null);
      setImmediateTextContent('');
      setImmediateTextObjectId(null);
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

  // Watch for batch updates and trigger canvas redraw
  useEffect(() => {
    if (whiteboardStore.lastBatchUpdateTime) {
      console.log('🎨 Triggering redraw after batch update:', whiteboardStore.lastBatchUpdateTime);
      redrawCanvas(true); // immediate redraw
    }
  }, [whiteboardStore.lastBatchUpdateTime, redrawCanvas]);

  // Reset viewport when screen size changes to recenter canvas
  useEffect(() => {
    whiteboardStore.resetViewport();
    redrawCanvas();
  }, [activeWhiteboardSize]); // Only depend on activeWhiteboardSize

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
      className="w-full h-full relative bg-muted/20 overflow-hidden"
      tabIndex={0}
      style={{ outline: 'none' }}
    >
      {/* Whiteboard area with elegant styling - centered only when smaller than container */}
      <div 
        className="absolute bg-background"
        style={{
          width: activeWhiteboardSize.width,
          height: activeWhiteboardSize.height,
          // Only center if whiteboard is smaller than container
          left: containerRef.current && activeWhiteboardSize.width < containerRef.current.offsetWidth 
            ? `calc(50% - ${activeWhiteboardSize.width / 2}px)` 
            : 0,
          top: containerRef.current && activeWhiteboardSize.height < containerRef.current.offsetHeight 
            ? `calc(50% - ${activeWhiteboardSize.height / 2}px)` 
            : 0,
          boxShadow: '0 8px 32px -4px hsl(var(--foreground) / 0.08), 0 2px 8px -2px hsl(var(--foreground) / 0.04), 0 0 0 1px hsl(var(--border) / 0.1)',
          borderRadius: hasMultipleUsers ? '12px' : '4px'
        }}
      >
        <canvas
          id="whiteboard-canvas"
          ref={canvasRef}
          className="absolute inset-0"
          style={{
            width: activeWhiteboardSize.width,
            height: activeWhiteboardSize.height,
            cursor: interactions.isDragging ? 'grabbing' : getCursorStyle(activeTool),
            touchAction: 'none', // Prevent default touch behaviors
            backgroundColor: 'hsl(var(--background))',
            borderRadius: hasMultipleUsers ? '12px' : '4px'
          }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
          onDoubleClick={handleDoubleClick}
        />
      </div>
      
      {/* Enhanced non-whiteboard areas - only show in multiplayer */}
      {hasMultipleUsers && (
        <>
          {/* Left side overlay */}
          <div 
            className="absolute top-0 bottom-0 pointer-events-none"
            style={{
              left: 0,
              right: `calc(50% + ${activeWhiteboardSize.width / 2}px)`,
              background: 'linear-gradient(90deg, hsl(var(--muted) / 0.5) 0%, hsl(var(--muted) / 0.3) 100%)',
              backgroundImage: `
                repeating-linear-gradient(
                  45deg,
                  transparent,
                  transparent 30px,
                  hsl(var(--border) / 0.05) 30px,
                  hsl(var(--border) / 0.05) 32px
                )
              `
            }}
          />
          
          {/* Right side overlay */}
          <div 
            className="absolute top-0 bottom-0 pointer-events-none"
            style={{
              left: `calc(50% + ${activeWhiteboardSize.width / 2}px)`,
              right: 0,
              background: 'linear-gradient(90deg, hsl(var(--muted) / 0.3) 0%, hsl(var(--muted) / 0.5) 100%)',
              backgroundImage: `
                repeating-linear-gradient(
                  45deg,
                  transparent,
                  transparent 30px,
                  hsl(var(--border) / 0.05) 30px,
                  hsl(var(--border) / 0.05) 32px
                )
              `
            }}
          />
          
          {/* Top overlay */}
          <div 
            className="absolute left-0 right-0 pointer-events-none"
            style={{
              top: 0,
              bottom: `calc(50% + ${activeWhiteboardSize.height / 2}px)`,
              background: 'linear-gradient(180deg, hsl(var(--muted) / 0.5) 0%, hsl(var(--muted) / 0.3) 100%)',
              backgroundImage: `
                repeating-linear-gradient(
                  45deg,
                  transparent,
                  transparent 30px,
                  hsl(var(--border) / 0.05) 30px,
                  hsl(var(--border) / 0.05) 32px
                )
              `
            }}
          />
          
          {/* Bottom overlay */}
          <div 
            className="absolute left-0 right-0 pointer-events-none"
            style={{
              top: `calc(50% + ${activeWhiteboardSize.height / 2}px)`,
              bottom: 0,
              background: 'linear-gradient(180deg, hsl(var(--muted) / 0.3) 0%, hsl(var(--muted) / 0.5) 100%)',
              backgroundImage: `
                repeating-linear-gradient(
                  45deg,
                  transparent,
                  transparent 30px,
                  hsl(var(--border) / 0.05) 30px,
                  hsl(var(--border) / 0.05) 32px
                )
              `
            }}
          />
        </>
      )}
      
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
          className="absolute bg-transparent border-none resize-none outline-none overflow-hidden placeholder-opacity-70"
          style={{
            left: immediateTextPosition.x,
            top: immediateTextPosition.y,
            width: 200, // Initial width that allows natural wrapping
            height: toolStore.toolSettings.fontSize * 1.2 || 20, // Height based on font size
            fontSize: toolStore.toolSettings.fontSize || 16,
            fontFamily: toolStore.toolSettings.fontFamily || 'Arial',
            fontWeight: toolStore.toolSettings.textBold ? 'bold' : 'normal',
            fontStyle: toolStore.toolSettings.textItalic ? 'italic' : 'normal',
            textDecoration: toolStore.toolSettings.textUnderline ? 'underline' : 'none',
            textAlign: 'left',
            color: 'transparent', // Make text invisible like double-click editing
            zIndex: 1001, // Higher than regular text editing
            lineHeight: (toolStore.toolSettings.fontSize * 1.2 || 20) + 'px',
            padding: '0', // Remove padding to match canvas text positioning exactly
            margin: '0',
            border: 'none',
            whiteSpace: 'pre-wrap', // Enable text wrapping from the start
            overflowWrap: 'break-word',
            wordBreak: 'break-word',
            wordWrap: 'break-word',
            overflow: 'visible', // Allow content to extend beyond bounds
            textRendering: 'optimizeLegibility',
            fontSmooth: 'antialiased',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            caretColor: toolStore.toolSettings.strokeColor || '#000000', // Ensure cursor is visible and matches text color
            WebkitTextSizeAdjust: '100%',
            boxSizing: 'border-box',
            background: 'transparent', // Match canvas text - no background
            minHeight: (toolStore.toolSettings.fontSize || 16) * 1.2 + 'px',
            // Set placeholder color to match stroke color with reduced opacity
            '--placeholder-color': `${toolStore.toolSettings.strokeColor || '#000000'}B3`
          } as React.CSSProperties & { '--placeholder-color': string }}
          value={immediateTextContent}
          onChange={handleImmediateTextChange}
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
      
    </div>
  );
};
