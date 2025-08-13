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
import { useCanvasOffset } from '../../hooks/useCanvasOffset';
import { CustomCursor } from './CustomCursor';
import { ResizeHandles } from './ResizeHandles';
import { measureText } from '../../utils/textMeasurement';
import { calculateOptimalFontSize } from '../../utils/stickyNoteUtils';

/**
 * Gets the appropriate cursor style based on the active tool
 * @param activeTool - The currently active tool
 * @returns CSS cursor value
 */
const getCursorStyle = (activeTool: string): string => {
  switch (activeTool) {
    case 'select':
      return 'default';
    case 'sticky-note':
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
  const { startBatch: startResizeBatch, endBatch: endResizeBatch } = useActionBatching({ batchTimeout: 0, maxBatchSize: 500 });
  const { activeWhiteboardSize, userScreenSizes } = useScreenSizeStore();
  const { canvasOffset } = useCanvasOffset();
  
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
  const {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleMouseLeave,
    isDrawing,
    isDragging,
    getCurrentDrawingPreview,
    getCurrentShapePreview,
    getCurrentSelectionBox,
    getCurrentDragDeltas,
    getLiveDragPositions,
    setRedrawCanvas,
    setDoubleClickProtection,
    setEditingState,
    setImmediateTextTrigger,
    clearTextInteractionState
  } = useCanvasInteractions();
  
  // Initialize rendering hook with both preview functions AND editing state
  const { redrawCanvas, isManualResizing } = useCanvasRendering(
    canvasRef.current, 
    getCurrentDrawingPreview,
    getCurrentShapePreview,
    getCurrentSelectionBox,
    editingTextId,
    editingText,
    getCurrentDragDeltas,
    getLiveDragPositions
  );
  
  // Update interactions hook with redraw function and double-click protection AND editing state
  setRedrawCanvas(redrawCanvas);
  setDoubleClickProtection(isHandlingDoubleClick);
  setEditingState(editingTextId !== null || isImmediateTextEditing);
  
  // Set callback for immediate text editing
  setImmediateTextTrigger((coords) => {
    console.log('📝 Immediate text editing triggered at canvas coords:', coords);
    
    // Convert canvas-relative coordinates to screen coordinates
    // for textarea positioning
    const containerElement = containerRef.current;
    if (!containerElement) {
      console.warn('Container ref not available for coordinate conversion');
      return;
    }
    
    const whiteboardDiv = containerElement.querySelector('.absolute.bg-background') as HTMLElement;
    const whiteboardRect = whiteboardDiv?.getBoundingClientRect();
    
    if (!whiteboardRect) {
      console.warn('Whiteboard div not found for coordinate conversion');
      return;
    }
    
    const screenCoords = {
      x: coords.x + whiteboardRect.left,
      y: coords.y + whiteboardRect.top - 60  // Moved down more to align with cursor
    };
    
    console.log('📝 Canvas coords:', coords);
    console.log('📝 Whiteboard rect:', whiteboardRect);
    console.log('📝 Final screen coords:', screenCoords);
    
    // Check if we're working with a sticky note tool
    if (activeTool === 'sticky-note') {
      console.log('📝 Processing sticky note immediate editing');
      console.log('📝 Current objects count:', Object.keys(objects).length);
      console.log('📝 Looking for recent sticky notes...');
      
      // For sticky notes, find the most recently created sticky note object
      const allStickyNotes = Object.entries(objects).filter(([id, obj]) => obj.type === 'sticky-note');
      console.log('📝 Found sticky notes:', allStickyNotes.length);
      
      let stickyNoteId = null;
      if (allStickyNotes.length > 0) {
        // Find the most recently created sticky note (by createdAt timestamp)
        const mostRecentNote = allStickyNotes.sort((a, b) => 
          new Date(b[1].createdAt || 0).getTime() - new Date(a[1].createdAt || 0).getTime()
        )[0];
        stickyNoteId = mostRecentNote[0];
        console.log('📝 Found most recent sticky note:', stickyNoteId.slice(0, 8));
        console.log('📝 Sticky note details:', mostRecentNote[1]);
      } else {
        console.log('📝 No sticky note found immediately, will search after delay');
        // Small delay to allow the sticky note creation to complete
        setTimeout(() => {
          console.log('📝 Delayed search for sticky notes...');
          const allStickyNotes = Object.entries(objects).filter(([id, obj]) => obj.type === 'sticky-note');
          console.log('📝 Found sticky notes after delay:', allStickyNotes.length);
          
          if (allStickyNotes.length > 0) {
            const mostRecentNote = allStickyNotes.sort((a, b) => 
              new Date(b[1].createdAt || 0).getTime() - new Date(a[1].createdAt || 0).getTime()
            )[0];
            const delayedStickyNoteId = mostRecentNote[0];
            setImmediateTextObjectId(delayedStickyNoteId);
            console.log('📝 Found sticky note after delay:', delayedStickyNoteId.slice(0, 8));
          } else {
            console.warn('📝 Still no sticky notes found after delay');
          }
        }, 50);
      }
      
      setIsImmediateTextEditing(true);
      console.log('📝 Set immediate text editing to true');
      
      if (stickyNoteId) {
        // Position the textarea in the center of the sticky note
        const stickyNote = objects[stickyNoteId];
        console.log('📝 Positioning textarea for sticky note:', stickyNote);
        
        if (stickyNote) {
          const stickyScreenCoords = {
            x: stickyNote.x + whiteboardRect.left + 16, // 16px padding
            y: stickyNote.y + whiteboardRect.top + 16 - 60 // 16px padding and adjustment
          };
          console.log('📝 Calculated sticky screen coords:', stickyScreenCoords);
          setImmediateTextPosition(stickyScreenCoords);
        } else {
          console.warn('📝 Sticky note object not found, using default coords');
          setImmediateTextPosition(screenCoords);
        }
        setImmediateTextObjectId(stickyNoteId);
        console.log('📝 Set immediate text object ID:', stickyNoteId.slice(0, 8));
      } else {
        console.log('📝 No sticky note ID, using screen coords');
        setImmediateTextPosition(screenCoords);
      }
      setImmediateTextContent('');
      console.log('📝 Immediate text editing setup complete');
    } else {
      // For regular text tool, create text object as before
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
      setImmediateTextPosition(screenCoords);
      setImmediateTextContent('');
      setImmediateTextObjectId(objectId);
    }
    
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

    if (obj && (obj.type === 'text' || obj.type === 'sticky-note') && typeof obj.width === 'number' && typeof obj.height === 'number') {
      // For text/sticky note objects, handle resizing differently
      const currentWidth = obj.width;
      const currentHeight = obj.height;
      
      if (obj.type === 'sticky-note') {
        // For sticky notes: recalculate optimal font size to fit content within new dimensions
        const padding = 32;
        const availableWidth = newBounds.width - padding;
        const availableHeight = newBounds.height - padding;
        
        const currentContent = obj.data?.content || 'Sticky Note';
        const optimalFontSize = calculateOptimalFontSize(
          currentContent,
          availableWidth,
          availableHeight,
          obj.data?.fontFamily || 'Arial',
          obj.data?.bold || false,
          obj.data?.italic || false
        );
        
        const updates = {
          ...newBounds,
          data: {
            ...(obj.data || {}),
            fontSize: optimalFontSize,
          },
        };
        
        updateObject(objectId, updates, userId);
      } else {
        // For regular text objects: scale font size AND update dimensions
        const scaleX = newBounds.width / currentWidth;
        const scaleY = newBounds.height / currentHeight;
        const scale = Math.max(0.1, Math.min(5, (scaleX + scaleY) / 2));
        
        const currentFontSize = obj.data.fontSize || 16;
        const newFontSize = Math.round(currentFontSize * scale);
        
        const changedWidth = newBounds.width !== obj.width;
        const changedHeight = newBounds.height !== obj.height;
        
        const updates = {
          ...newBounds,
          data: {
            ...(obj.data || {}),
            fontSize: newFontSize,
            ...(changedWidth ? { fixedWidth: true } : {}),
            ...(changedHeight ? { fixedHeight: true } : {}),
          },
        };
        
        updateObject(objectId, updates, userId);
      }
    } else {
      // For other objects, update position and dimensions normally
      let updates: any = { ...newBounds };
      updateObject(objectId, updates, userId);
    }

    // Don't call redrawCanvas here - let the state change trigger it naturally for smoother updates
    
    // Clear the flag after a short delay to allow the resize operation to complete
    setTimeout(() => {
      if (isManualResizing) {
        isManualResizing.current = false;
      }
    }, 50); // Reduced timeout for more responsive feel
  };

  // Auto-resize text object to fit content, but handle sticky notes differently
  const updateTextBounds = (textObject: any, content: string) => {
    if (!textObject.data) return;
    
    const textData = textObject.data;
    const isSticky = textObject.type === 'sticky-note';
    
    if (isSticky) {
      // For sticky notes: NEVER change dimensions, only adjust font size to fit content
      const padding = 32; // 16px on each side
      const availableWidth = textObject.width - padding;
      const availableHeight = textObject.height - padding;
      
      // Calculate optimal font size to fit content in FIXED dimensions
      const targetFontSize = calculateOptimalFontSize(
        content || 'Sticky Note',
        availableWidth,
        availableHeight,
        textData.fontFamily,
        textData.bold,
        textData.italic
      );
      
      if (targetFontSize !== textData.fontSize) {
        updateObject(textObject.id, {
          data: {
            ...textData,
            fontSize: targetFontSize
          }
          // NEVER update width/height for sticky notes
        }, userId);
      }
      return; // Exit early - no dimension changes for sticky notes
    }
    
    // For regular text objects: resize bounds to fit content (existing behavior)
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
      type: textObject.type,
      content: content?.slice(0, 50) + (content && content.length > 50 ? '...' : ''),
      isFixedWidth: isFixedW,
      isFixedHeight: isFixedH,
      isSticky,
      padding,
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
      const minWidth = 100; // Minimum width for text objects
      const newWidth = Math.max(measuredWidth, minWidth);
      const newHeight = measuredHeight;
      if (newWidth !== textObject.width) updates.width = newWidth;
      if (newHeight !== textObject.height) updates.height = newHeight;
    }
    
    if (Object.keys(updates).length) {
      updateObject(textObject.id, updates, userId);
    }

  };

  // Utility function to calculate exact text positioning using canvas metrics
  const calculateTextPosition = (textObject: any, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx || !textObject.data) return null;

    const textData = textObject.data;
    const isSticky = textObject.type === 'sticky-note';
    const padding = isSticky ? 16 : 4; // 16px for sticky notes, 4px for text
    
    // Set the exact same font properties as canvas rendering
    let fontStyle = '';
    if (textData.italic) fontStyle += 'italic ';
    if (textData.bold) fontStyle += 'bold ';
    ctx.font = `${fontStyle}${textData.fontSize}px ${textData.fontFamily}`;
    
    // Use the exact same line height calculation as canvas
    const lineHeight = Math.round(textData.fontSize * 1.2);
    
    // Use whiteboard container rect to be consistent with coordinate conversion
    const whiteboardContainer = canvas.closest('.absolute.bg-background') as HTMLElement;
    const rect = whiteboardContainer ? whiteboardContainer.getBoundingClientRect() : canvas.getBoundingClientRect();
    
    return {
      x: Math.round(textObject.x + padding + rect.left), // Canvas position + padding + screen offset
      y: Math.round(textObject.y + padding + rect.top - 70), // Canvas position + padding + screen offset - 70px adjustment
      width: Math.round(textObject.width - (padding * 2)), // Account for left/right padding
      height: Math.round(textObject.height - (padding * 2)), // Account for top/bottom padding
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
    clearTextInteractionState();
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    console.log('🖱️ Double-click coordinates:', { x, y });
    
    // Find text object at click position using improved hit detection
    const textObject = Object.entries(objects).find(([id, obj]) => {
      if ((obj.type !== 'text' && obj.type !== 'sticky-note') || !obj.width || !obj.height || !obj.data) return false;
      
      const textData = obj.data;
      const currentContent = textData.content || 'Double-click to edit';
      
      // Use accurate text measurement for hit detection with same available width as canvas
      const isSticky = obj.type === 'sticky-note';
      const padding = isSticky ? 32 : 8; // 32px for sticky notes (16px on each side), 8px for text
      const availableWidth = obj.width - padding; // Same calculation as canvas rendering
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
      const textStartX = obj.x + (padding / 2) + Math.max(0, alignOffset);
      const textStartY = obj.y + (padding / 2); // top padding
      const textEndX = textStartX + metrics.width;
      const textEndY = textStartY + metrics.height;
      
      // Add some tolerance for easier clicking
      const tolerance = 8;
      const isInBounds = x >= (textStartX - tolerance) && x <= (textEndX + tolerance) &&
                        y >= (textStartY - tolerance) && y <= (textEndY + tolerance);
      
      console.log('🖱️ Checking text/sticky note object with accurate bounds:', {
        id: id.slice(0, 8),
        type: obj.type,
        textAlign: textData.textAlign,
        availableWidth,
        padding,
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
      console.log('🖱️ Found text/sticky note object to edit:', objectId.slice(0, 8), 'type:', obj.type);
      
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
      console.log('🖱️ No text/sticky note object found at double-click position');
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
      const isSticky = textObject.type === 'sticky-note';
      
      // If text is empty, revert to appropriate placeholder
      const contentToSave = finalText || (isSticky ? 'Sticky Note' : 'Double-click to edit');
      
      // Update the text content
      updateObject(editingTextId, {
        data: {
          ...textObject.data,
          content: contentToSave
        }
      });
      
      // Auto-resize text bounds to fit content - but NOT for sticky notes
      if (!isSticky) {
        setTimeout(() => {
          const updatedObject = objects[editingTextId];
          if (updatedObject) {
            updateTextBounds(updatedObject, contentToSave);
          }
        }, 0);
      }
      
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
    
    if (immediateTextObjectId && objects[immediateTextObjectId]) {
      const textObject = objects[immediateTextObjectId];
      const isSticky = textObject.type === 'sticky-note';
      
      if (isSticky) {
        // For sticky notes: adjust font size as user types to maintain fit
        const padding = 32;
        const availableWidth = textObject.width - padding;
        const availableHeight = textObject.height - padding;
        
        const optimalFontSize = calculateOptimalFontSize(
          newText || 'Sticky Note',
          availableWidth,
          availableHeight,
          textObject.data.fontFamily,
          textObject.data.bold,
          textObject.data.italic
        );
        
        // Update both content and font size, but NEVER change dimensions
        updateObject(immediateTextObjectId, {
          data: {
            ...textObject.data,
            content: newText || '',
            fontSize: optimalFontSize
          }
          // Never update width/height for sticky notes
        });
        
        // Update textarea font size to match
        const textarea = e.target;
        textarea.style.fontSize = optimalFontSize + 'px';
        
      } else {
        // For regular text: expand bounds as needed (existing behavior)
        const fontSize = toolStore.toolSettings.fontSize || 16;
        const fontFamily = toolStore.toolSettings.fontFamily || 'Arial';
        const bold = toolStore.toolSettings.textBold || false;
        const italic = toolStore.toolSettings.textItalic || false;
        
        const minWidth = 100;
        const textarea = e.target;
        
        // Calculate available space from text position to screen edge
        const canvasRect = canvasRef.current?.getBoundingClientRect();
        if (canvasRect && immediateTextPosition) {
          const availableWidth = canvasRect.width - (immediateTextPosition.x - canvasRect.left) - 10;
          
          const textPadding = 8;
          const effectiveWidth = availableWidth - textPadding;
          textarea.style.width = effectiveWidth + 'px';
          textarea.style.maxWidth = effectiveWidth + 'px';
          
          const wrappedMetrics = measureText(newText || '', fontSize, fontFamily, bold, italic, effectiveWidth);
          textarea.style.height = Math.max(wrappedMetrics.height, fontSize * 1.2) + 'px';
          
          // Update canvas object - only update content, not dimensions during typing
          updateObject(immediateTextObjectId, {
            data: {
              ...textObject.data,
              content: newText || ''
            }
          });
        } else {
          // Fallback behavior for regular text
          const metrics = measureText(newText || '', fontSize, fontFamily, bold, italic);
          const newWidth = Math.max(metrics.width + 20, minWidth);
          textarea.style.width = newWidth + 'px';
          textarea.style.height = Math.max(metrics.height + 10, fontSize * 1.2) + 'px';
          
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
    }
    
    redrawCanvas();
  };

  // Handle immediate text editing completion
  const handleImmediateTextComplete = () => {
    const finalText = immediateTextContent?.trim() || '';
    
    if (immediateTextObjectId && objects[immediateTextObjectId]) {
      if (finalText) {
        const textObject = objects[immediateTextObjectId];
        const isSticky = textObject.type === 'sticky-note';
        
        // Keep the existing object with final content
        updateObject(immediateTextObjectId, {
          data: {
            ...textObject.data,
            content: finalText
          }
        });
        
        // Final resize to fit content - but NOT for sticky notes
        if (!isSticky) {
          setTimeout(() => {
            const updatedObject = objects[immediateTextObjectId];
            if (updatedObject) {
              updateTextBounds(updatedObject, finalText);
            }
          }, 0);
        }
      } else {
        // For text objects, delete if no text was entered
        // For sticky notes, keep them even if empty (they're visual notes)
        if (objects[immediateTextObjectId]?.type === 'text') {
          deleteObject(immediateTextObjectId, userId);
          console.log('🗑️ Deleted empty text object');
        } else {
          console.log('📝 Keeping empty sticky note - visual notes should persist');
        }
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
      const isSticky = textObject.type === 'sticky-note';
      
      if (isSticky) {
        // For sticky notes: adjust font size as user types to maintain fit
        const padding = 32;
        const availableWidth = textObject.width - padding;
        const availableHeight = textObject.height - padding;
        
        const optimalFontSize = calculateOptimalFontSize(
          newText || 'Sticky Note',
          availableWidth,
          availableHeight,
          textObject.data.fontFamily,
          textObject.data.bold,
          textObject.data.italic
        );
        
        // Update both content and font size, but NEVER change dimensions
        updateObject(editingTextId, {
          data: {
            ...textObject.data,
            content: newText,
            fontSize: optimalFontSize
          }
          // Never update width/height for sticky notes
        }, userId);
        
        // Update textarea font size to match
        textarea.style.fontSize = optimalFontSize + 'px';
        
      } else {
        // For regular text: expand bounds as needed (existing behavior)
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
      // Cancel immediate text editing 
      if (immediateTextObjectId && objects[immediateTextObjectId]) {
        // For text objects, delete on escape since they were just created
        // For sticky notes, keep them since they're meant to be visual elements
        if (objects[immediateTextObjectId].type === 'text') {
          deleteObject(immediateTextObjectId, userId);
          console.log('🗑️ Deleted text object on escape');
        } else {
          console.log('📝 Keeping sticky note on escape - visual notes should persist');
        }
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
      handlePointerDown(event, canvas);
    };

    const handleTouchMove = (event: TouchEvent) => {
      event.preventDefault();
      handlePointerMove(event, canvas);
    };

    const handleTouchEnd = (event: TouchEvent) => {
      event.preventDefault();
      handlePointerUp(event, canvas);
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
  }, [handlePointerDown, handlePointerMove, handlePointerUp]);

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
    // Block events during double-click protection
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
   * Handles mouse leaving the canvas area
   * @param event - Mouse event
   */
  const onMouseLeave = (event: React.MouseEvent<HTMLCanvasElement>) => {
    handleMouseLeave();
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
            cursor: isDragging ? 'grabbing' : getCursorStyle(activeTool),
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
          className="absolute border-none resize-none outline-none overflow-hidden"
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
            // Make background transparent for text, but match sticky note color for sticky notes
            backgroundColor: objects[editingTextId]?.type === 'sticky-note' 
              ? objects[editingTextId]?.data?.backgroundColor || '#FEF08A'
              : 'transparent',
            color: objects[editingTextId]?.type === 'sticky-note' ? '#333333' : 'transparent',
            caretColor: objects[editingTextId]?.type === 'sticky-note' 
              ? '#333333' 
              : (objects[editingTextId]?.stroke || '#000000'),
            zIndex: 1000,
            lineHeight: textEditorPosition.lineHeight + 'px', // Use exact canvas line height
            padding: '0', // Remove default textarea padding since we handle it with positioning
            margin: '0', // Remove default margins
            border: 'none', // Remove borders
            borderRadius: objects[editingTextId]?.type === 'sticky-note' ? '8px' : '0',
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
      {isImmediateTextEditing && immediateTextPosition && immediateTextObjectId && (
        <textarea
          data-immediate-text="true"
          className="absolute border-none resize-none outline-none overflow-hidden placeholder-opacity-70"
          style={{
            left: immediateTextPosition.x,
            top: immediateTextPosition.y,
            width: objects[immediateTextObjectId]?.type === 'sticky-note' 
              ? (objects[immediateTextObjectId]?.width || 150) - 32 // Fixed width for sticky notes minus padding
              : 200, // Dynamic width for text objects
            height: objects[immediateTextObjectId]?.type === 'sticky-note'
              ? (objects[immediateTextObjectId]?.height || 150) - 32 // Fixed height for sticky notes minus padding
              : (objects[immediateTextObjectId]?.data?.fontSize || toolStore.toolSettings.fontSize) * 1.2 || 20,
            fontSize: objects[immediateTextObjectId]?.data?.fontSize || toolStore.toolSettings.fontSize || 16,
            fontFamily: objects[immediateTextObjectId]?.data?.fontFamily || toolStore.toolSettings.fontFamily || 'Arial',
            fontWeight: objects[immediateTextObjectId]?.data?.bold || toolStore.toolSettings.textBold ? 'bold' : 'normal',
            fontStyle: objects[immediateTextObjectId]?.data?.italic || toolStore.toolSettings.textItalic ? 'italic' : 'normal',
            textDecoration: objects[immediateTextObjectId]?.data?.underline || toolStore.toolSettings.textUnderline ? 'underline' : 'none',
            textAlign: objects[immediateTextObjectId]?.data?.textAlign || toolStore.toolSettings.textAlign || 'center',
            backgroundColor: objects[immediateTextObjectId]?.type === 'sticky-note' 
              ? objects[immediateTextObjectId]?.data?.backgroundColor || '#FEF08A'
              : 'transparent',
            color: objects[immediateTextObjectId]?.type === 'sticky-note' ? '#333333' : 'transparent',
            borderRadius: objects[immediateTextObjectId]?.type === 'sticky-note' ? '8px' : '0',
            zIndex: 1001, // Higher than regular text editing
            lineHeight: (objects[immediateTextObjectId]?.data?.fontSize || toolStore.toolSettings.fontSize || 16) * 1.2 + 'px',
            padding: '0', // Remove padding to match canvas text positioning exactly
            margin: '0',
            border: 'none',
            whiteSpace: 'pre-wrap', // Enable text wrapping from the start
            overflowWrap: 'break-word',
            wordBreak: 'break-word',
            wordWrap: 'break-word',
            overflow: objects[immediateTextObjectId]?.type === 'sticky-note' ? 'hidden' : 'visible',
            textRendering: 'optimizeLegibility',
            fontSmooth: 'antialiased',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            caretColor: objects[immediateTextObjectId]?.type === 'sticky-note' 
              ? '#333333' 
              : (toolStore.toolSettings.strokeColor || '#000000'),
            WebkitTextSizeAdjust: '100%',
            boxSizing: 'border-box',
            minHeight: (objects[immediateTextObjectId]?.data?.fontSize || toolStore.toolSettings.fontSize || 16) * 1.2 + 'px'
          } as React.CSSProperties}
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
          onResizeStart={() => startResizeBatch('UPDATE_OBJECT', objectId, userId)}
          onResize={(id, bounds) => handleResize(id, bounds)}
          onResizeEnd={() => endResizeBatch()}
        />
      ))}
      
    </div>
  );
};
