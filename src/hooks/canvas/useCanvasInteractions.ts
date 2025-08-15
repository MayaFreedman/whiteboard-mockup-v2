import { useRef, useCallback, useEffect } from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useToolStore } from '../../stores/toolStore';
import { useUser } from '../../contexts/UserContext';
import { WhiteboardObject, TextData, ImageData, StickyNoteData } from '../../types/whiteboard';
import { calculateOptimalFontSize } from '../../utils/stickyNoteTextSizing';
import { useCanvasCoordinates } from './useCanvasCoordinates';
import { useObjectDetection } from './useObjectDetection';
import { useEraserLogic } from './useEraserLogic';
import { useActionBatching } from '../useActionBatching';
import { useScreenSizeStore } from '../../stores/screenSizeStore';
import { SimplePathBuilder, getSmoothingConfig } from '../../utils/path/simpleSmoothing';
import { useMultiplayer } from '../useMultiplayer';

/**
 * Custom hook for handling canvas mouse and touch interactions
 * Manages drawing state and coordinates tool-specific behaviors
 */
export const useCanvasInteractions = () => {
  const whiteboardStore = useWhiteboardStore();
  const toolStore = useToolStore();
  const { userId } = useUser();
  const { activeWhiteboardSize } = useScreenSizeStore();
  const { getCanvasCoordinates } = useCanvasCoordinates();
  const { findObjectAt, findObjectsInSelectionBox } = useObjectDetection();
  
  // Initialize action batching with optimized settings
  const { startBatch, endBatch, checkBatchSize } = useActionBatching({
    batchTimeout: 0, // Disable auto-end; end on pointer up so one drag = one undo
    maxBatchSize: 5000 // Large cap to avoid mid-drag splits
  });
  
  // Use eraser logic without passing arguments since it manages its own batching
  const { handleEraserStart, handleEraserMove, handleEraserEnd } = useEraserLogic();
  
  const isDrawingRef = useRef(false);
  const isDraggingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const pathStartRef = useRef<{ x: number; y: number } | null>(null);
  const redrawCanvasRef = useRef<(() => void) | null>(null);
  const doubleClickProtectionRef = useRef(false);
  const isEditingTextRef = useRef(false);
  
  // Text click detection
  const textClickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const textClickStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const isImmediateTextEditingRef = useRef(false);
  
  // Batching state refs
  const currentBatchIdRef = useRef<string | null>(null);
  const draggedObjectIdRef = useRef<string | null>(null);
  const drawingObjectIdRef = useRef<string | null>(null);
  
  // Multi-object dragging state
  const initialDragPositionsRef = useRef<Record<string, { x: number; y: number }>>({});
  
  // Refs for tracking drag optimization
  const dragDeltasRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const liveDragPositionsRef = useRef<Record<string, { x: number; y: number }>>({});

  /**
   * Checks if coordinates are within the active whiteboard boundaries
   */
  const isWithinWhiteboardBounds = useCallback((x: number, y: number): boolean => {
    return x >= 0 && y >= 0 && 
           x <= activeWhiteboardSize.width && 
           y <= activeWhiteboardSize.height;
  }, [activeWhiteboardSize]);
  
  // Simple path builder for smooth drawing
  const pathBuilderRef = useRef<SimplePathBuilder | null>(null);
  
  // Store the current drawing preview for rendering
  const currentDrawingPreviewRef = useRef<{
    path: string;
    startX: number;
    startY: number;
    strokeColor: string;
    strokeWidth: number;
    opacity: number;
    brushType?: string;
    isEraser?: boolean;
  } | null>(null);

  // Store shape preview for rendering
  const currentShapePreviewRef = useRef<{
    type: string;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    strokeColor: string;
    strokeWidth: number;
    opacity: number;
  } | null>(null);

  // Store selection box for multi-select
  const selectionBoxRef = useRef<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    isActive: boolean;
  } | null>(null);

  /**
   * Ends any active batch and cleans up batching state
   */
  const cleanupBatching = useCallback(() => {
    if (currentBatchIdRef.current) {
      endBatch();
      currentBatchIdRef.current = null;
    }
    draggedObjectIdRef.current = null;
    drawingObjectIdRef.current = null;
  }, [endBatch]);

  /**
   * Sets the redraw canvas function (called by Canvas component)
   */
  const setRedrawCanvas = useCallback((redrawFn: () => void) => {
    redrawCanvasRef.current = redrawFn;
  }, []);

  /**
   * Sets the double-click protection flag (called by Canvas component)
   */
  const setDoubleClickProtection = useCallback((isProtected: boolean) => {
    doubleClickProtectionRef.current = isProtected;
  }, []);

  /**
   * Sets the text editing state (called by Canvas component)
   */
  const setEditingState = useCallback((isEditing: boolean) => {
    isEditingTextRef.current = isEditing;
  }, []);

  /**
   * Creates text objects with proper data structure
   */
  const createTextObject = useCallback((
    x: number,
    y: number,
    width: number,
    height: number,
    strokeColor: string,
    content?: string
  ): Omit<WhiteboardObject, 'id' | 'createdAt' | 'updatedAt'> => {
    const textData: TextData = {
      content: content || 'Double-click to edit', // Use provided content or placeholder
      fontSize: toolStore.toolSettings.fontSize,
      fontFamily: toolStore.toolSettings.fontFamily,
      bold: toolStore.toolSettings.textBold,
      italic: toolStore.toolSettings.textItalic,
      underline: toolStore.toolSettings.textUnderline,
      textAlign: toolStore.toolSettings.textAlign
    };

    return {
      type: 'text',
      x,
      y,
      width: Math.max(width, 100), // Minimum width for readability
      height: Math.max(height, 30), // Minimum height for text
      stroke: strokeColor,
      fill: 'transparent',
      strokeWidth: 1,
      opacity: 1,
      data: textData
    };
  }, [toolStore.toolSettings]);

  /**
   * Callback for when immediate text editing is triggered
   */
  const onImmediateTextTriggerRef = useRef<((coords: { x: number; y: number }, existingObjectId?: string) => void) | null>(null);

  /**
   * Sets the callback for immediate text editing trigger
   */
  const setImmediateTextTrigger = useCallback((callback: (coords: { x: number; y: number }, existingObjectId?: string) => void) => {
    onImmediateTextTriggerRef.current = callback;
  }, []);

  /**
   * Triggers immediate text editing mode at the specified position
   */
  const triggerImmediateTextEditing = useCallback((coords: { x: number; y: number }) => {
    
    // Clear any existing timer
    if (textClickTimerRef.current) {
      clearTimeout(textClickTimerRef.current);
      textClickTimerRef.current = null;
    }
    
    // Trigger the callback to notify Canvas component
    if (onImmediateTextTriggerRef.current) {
      onImmediateTextTriggerRef.current(coords);
    }
  }, []);

  /**
   * Creates icon stamp objects
   */
  const createStampObject = useCallback((
    x: number,
    y: number,
    size: number
  ): Omit<WhiteboardObject, 'id' | 'createdAt' | 'updatedAt'> => {
    const selectedSticker = toolStore.toolSettings.selectedSticker || '/icons/emotions/happy.svg';
    const actualSize = size * 10; // Convert slider value to actual pixel size
    
    // Check if this is a custom stamp (base64 data URL)
    const isCustomStamp = selectedSticker.startsWith('data:');
    
    let width = actualSize;
    let height = actualSize;
    
    // For custom stamps, preserve aspect ratio by loading image synchronously
    if (isCustomStamp) {
      // Store the aspect ratio in the stamp data so it can be applied during rendering
      const stampData = {
        customStampId: selectedSticker,
        isCustomStamp: true,
        alt: 'Custom stamp',
        preserveAspectRatio: true, // Flag to indicate aspect ratio should be preserved
        fallbackSrc: '/icons/emotions/happy.svg',
        fallbackAlt: 'Fallback stamp (custom stamp not available)'
      };

      return {
        type: 'image',
        x: x - actualSize / 2, // Center using original size for now
        y: y - actualSize / 2,
        width: actualSize, // Will be adjusted during rendering based on actual image
        height: actualSize,
        stroke: 'transparent',
        fill: 'transparent',
        strokeWidth: 0,
        opacity: 1,
        data: stampData
      };
    }
    
    // For regular stamps
    const stampData = {
      src: selectedSticker,
      alt: 'Stamp icon'
    };

    return {
      type: 'image',
      x: x - actualSize / 2,
      y: y - actualSize / 2,
      width: actualSize,
      height: actualSize,
      stroke: 'transparent',
      fill: 'transparent',
      strokeWidth: 0,
      opacity: 1,
      data: stampData
    };
  }, [toolStore.toolSettings]);

  /**
   * Creates sticky note objects with proper data structure
   */
  const createStickyNoteObject = useCallback((
    x: number,
    y: number,
    size: number,
    backgroundColor: string
  ): Omit<WhiteboardObject, 'id' | 'createdAt' | 'updatedAt'> => {
    const stickyNoteData: StickyNoteData = {
      content: '', // Start with empty content - no placeholder
      fontSize: calculateOptimalFontSize('', size, size, {
        content: '',
        fontSize: 24,
        fontFamily: toolStore.toolSettings.fontFamily,
        bold: toolStore.toolSettings.textBold,
        italic: toolStore.toolSettings.textItalic,
        underline: toolStore.toolSettings.textUnderline,
        textAlign: 'center' // Force center alignment for sticky notes
      }),
      fontFamily: toolStore.toolSettings.fontFamily,
      bold: toolStore.toolSettings.textBold,
      italic: toolStore.toolSettings.textItalic,
      underline: toolStore.toolSettings.textUnderline,
      textAlign: 'center', // Force center alignment for sticky notes
      backgroundColor,
      stickySize: size,
      autoTextResize: true
    };

    return {
      type: 'sticky-note',
      x: x - size / 2, // Center the sticky note on click position
      y: y - size / 2,
      width: size,
      height: size,
      stroke: toolStore.toolSettings.strokeColor,
      fill: backgroundColor,
      strokeWidth: 1,
      opacity: 1,
      data: stickyNoteData
    };
  }, [toolStore.toolSettings]);

  /**
   * Creates shape objects - all shapes as their native types
   */
  const createShapeObject = useCallback((
    shapeType: string,
    x: number,
    y: number,
    width: number,
    height: number,
    strokeColor: string,
    strokeWidth: number,
    opacity: number
  ): Omit<WhiteboardObject, 'id' | 'createdAt' | 'updatedAt'> | null => {
    const shapeBorderWeight = toolStore.toolSettings.shapeBorderWeight || 2;
    
    // All shapes are now created as native types
    const baseShape = {
      x,
      y,
      width,
      height,
      stroke: strokeColor,
      fill: 'none',
      strokeWidth: shapeBorderWeight,
      opacity
    };
    
    switch (shapeType) {
      case 'rectangle':
        return { type: 'rectangle', ...baseShape };
      case 'circle':
        return { type: 'circle', ...baseShape };
      case 'triangle':
        return { type: 'triangle', ...baseShape };
      case 'diamond':
        return { type: 'diamond', ...baseShape };
      case 'pentagon':
        return { type: 'pentagon', ...baseShape };
      case 'hexagon':
        return { type: 'hexagon', ...baseShape };
      case 'star':
        return { type: 'star', ...baseShape };
      case 'heart':
        return { type: 'heart', ...baseShape };
      default:
        return null;
    }
  }, [toolStore.toolSettings.shapeBorderWeight]);

  /**
   * Generates SVG path data for complex shapes
   */
  const generateShapePath = useCallback((shapeType: string, x: number, y: number, width: number, height: number): string => {
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    
    switch (shapeType) {
      case 'triangle':
        return `M ${centerX} ${y} L ${x + width} ${y + height} L ${x} ${y + height} Z`;
      
      case 'diamond':
        return `M ${centerX} ${y} L ${x + width} ${centerY} L ${centerX} ${y + height} L ${x} ${centerY} Z`;
      
      case 'pentagon': {
        const pentagonPoints = [];
        for (let i = 0; i < 5; i++) {
          const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
          const px = centerX + (width / 2) * Math.cos(angle);
          const py = centerY + (height / 2) * Math.sin(angle);
          pentagonPoints.push(`${i === 0 ? 'M' : 'L'} ${px} ${py}`);
        }
        return pentagonPoints.join(' ') + ' Z';
      }
      
      case 'hexagon': {
        const hexagonPoints = [];
        for (let i = 0; i < 6; i++) {
          const angle = (i * 2 * Math.PI) / 6;
          const px = centerX + (width / 2) * Math.cos(angle);
          const py = centerY + (height / 2) * Math.sin(angle);
          hexagonPoints.push(`${i === 0 ? 'M' : 'L'} ${px} ${py}`);
        }
        return hexagonPoints.join(' ') + ' Z';
      }
      
      case 'star': {
        const starPoints = [];
        const outerRadiusX = width / 2;
        const outerRadiusY = height / 2;
        const innerRadiusX = outerRadiusX * 0.4;
        const innerRadiusY = outerRadiusY * 0.4;
        
        for (let i = 0; i < 10; i++) {
          const angle = (i * Math.PI) / 5 - Math.PI / 2;
          const radiusX = i % 2 === 0 ? outerRadiusX : innerRadiusX;
          const radiusY = i % 2 === 0 ? outerRadiusY : innerRadiusY;
          const px = centerX + radiusX * Math.cos(angle);
          const py = centerY + radiusY * Math.sin(angle);
          starPoints.push(`${i === 0 ? 'M' : 'L'} ${px} ${py}`);
        }
        return starPoints.join(' ') + ' Z';
      }
      
      case 'heart': {
        const heartWidth = width;
        const heartHeight = height;
        const topCurveHeight = heartHeight * 0.3;
        const centerXHeart = x + width / 2;
        
        return `M ${centerXHeart} ${y + heartHeight * 0.3}
                C ${centerXHeart} ${y + topCurveHeight * 0.5}, ${centerXHeart - heartWidth * 0.2} ${y}, ${centerXHeart - heartWidth * 0.4} ${y}
                C ${centerXHeart - heartWidth * 0.6} ${y}, ${centerXHeart - heartWidth * 0.8} ${y + topCurveHeight * 0.5}, ${centerXHeart - heartWidth * 0.5} ${y + topCurveHeight}
                C ${centerXHeart - heartWidth * 0.5} ${y + topCurveHeight}, ${centerXHeart} ${y + heartHeight * 0.6}, ${centerXHeart} ${y + heartHeight}
                C ${centerXHeart} ${y + heartHeight * 0.6}, ${centerXHeart + heartWidth * 0.5} ${y + topCurveHeight}, ${centerXHeart + heartWidth * 0.5} ${y + topCurveHeight}
                C ${centerXHeart + heartWidth * 0.8} ${y + topCurveHeight * 0.5}, ${centerXHeart + heartWidth * 0.6} ${y}, ${centerXHeart + heartWidth * 0.4} ${y}
                C ${centerXHeart + heartWidth * 0.2} ${y}, ${centerXHeart} ${y + topCurveHeight * 0.5}, ${centerXHeart} ${y + heartHeight * 0.3} Z`;
      }
      
      default:
        return '';
    }
  }, []);

  /**
   * Handles fill tool click - fills the clicked shape with the current stroke color
   */
  const handleFillClick = useCallback((coords: { x: number; y: number }) => {
    
    
    const objectId = findObjectAt(coords.x, coords.y);
    if (!objectId) {
      // No shape under cursor: set background color using current stroke color
      const fillColor = toolStore.toolSettings.strokeColor;
      
      whiteboardStore.updateSettings({ backgroundColor: fillColor }, userId);
      if (redrawCanvasRef.current) {
        redrawCanvasRef.current();
      }
      return;
    }
    
    const obj = whiteboardStore.objects[objectId];
    if (!obj) {
      
      return;
    }
    
    console.log('🎨 Found object to fill:', { 
      id: objectId.slice(0, 8), 
      type: obj.type, 
      currentFill: obj.fill 
    });
    
    // Use the current stroke color from toolbar as fill color
    const fillColor = toolStore.toolSettings.strokeColor;
    
    // Update the object with the fill color - NOW WITH USER ID
    whiteboardStore.updateObject(objectId, {
      fill: fillColor
    }, userId);
    
    console.log('🎨 Filled object:', { 
      objectId: objectId.slice(0, 8), 
      fillColor,
      previousFill: obj.fill,
      userId: userId.slice(0, 8)
    });
    
    // Trigger redraw
    if (redrawCanvasRef.current) {
      redrawCanvasRef.current();
    }
  }, [findObjectAt, whiteboardStore, toolStore.toolSettings.strokeColor, userId]);

  /**
   * Ends current drawing session and saves the path if valid
   */
  const endCurrentDrawing = useCallback(() => {
    const activeTool = toolStore.activeTool;
    
    if ((activeTool === 'pencil' || activeTool === 'brush') && 
        isDrawingRef.current && 
        pathBuilderRef.current && 
        pathStartRef.current &&
        pathBuilderRef.current.getPointCount() > 1) {
      
      const finalSmoothPath = pathBuilderRef.current.getCurrentPath();
      
      const drawingObject: Omit<WhiteboardObject, 'id' | 'createdAt' | 'updatedAt'> = {
        type: 'path',
        x: pathStartRef.current.x,
        y: pathStartRef.current.y,
        stroke: toolStore.toolSettings.strokeColor,
        strokeWidth: toolStore.activeTool === 'brush' ? (toolStore.toolSettings.brushSize || 8) : (toolStore.toolSettings.pencilSize || 4),
        opacity: toolStore.toolSettings.opacity,
        fill: 'none',
        data: {
          path: finalSmoothPath,
          brushType: activeTool === 'brush' ? toolStore.toolSettings.brushType : 'pencil'
        }
      };

      // NOW WITH USER ID
      const objectId = whiteboardStore.addObject(drawingObject, userId);
      
    }
    
    if (activeTool === 'eraser' && isDrawingRef.current) {
      handleEraserEnd(redrawCanvasRef.current || undefined);
      
    }

    // Handle shape completion
    if (['rectangle', 'circle'].includes(activeTool) && 
        isDrawingRef.current && 
        currentShapePreviewRef.current) {
      
      const preview = currentShapePreviewRef.current;
      const width = Math.abs(preview.endX - preview.startX);
      const height = Math.abs(preview.endY - preview.startY);
      
      if (width > 5 && height > 5) {
        const shapeObject = createShapeObject(
          activeTool,
          Math.min(preview.startX, preview.endX),
          Math.min(preview.startY, preview.endY),
          width,
          height,
          preview.strokeColor,
          preview.strokeWidth,
          preview.opacity
        );

        if (shapeObject) {
          // NOW WITH USER ID
          const objectId = whiteboardStore.addObject(shapeObject, userId);
          
        }
      }
    }

    // Handle text completion
    if (activeTool === 'text' && 
        isDrawingRef.current && 
        currentShapePreviewRef.current) {
      
      const preview = currentShapePreviewRef.current;
      const width = Math.abs(preview.endX - preview.startX);
      const height = Math.abs(preview.endY - preview.startY);
      
      if (width > 10 && height > 10) {
        const textObject = createTextObject(
          Math.min(preview.startX, preview.endX),
          Math.min(preview.startY, preview.endY),
          width,
          height,
          preview.strokeColor
        );

        const objectId = whiteboardStore.addObject(textObject, userId);
        
      }
    }
    
    // Clean up batching and reset all drawing state
    cleanupBatching();
    isDrawingRef.current = false;
    isDraggingRef.current = false;
    lastPointRef.current = null;
    pathStartRef.current = null;
    pathBuilderRef.current = null;
    dragStartRef.current = null;
    currentDrawingPreviewRef.current = null;
    currentShapePreviewRef.current = null;
    selectionBoxRef.current = null;
    
    if (redrawCanvasRef.current) {
      redrawCanvasRef.current();
    }
  }, [toolStore.activeTool, toolStore.toolSettings, whiteboardStore, handleEraserEnd, createShapeObject, createTextObject, userId, cleanupBatching]);

  // Add document-level mouseup listener to catch releases outside canvas
  useEffect(() => {
    const handleDocumentMouseUp = (event: MouseEvent) => {
      // Only handle if we're actually drawing or dragging something on the canvas
      if (isDrawingRef.current || isDraggingRef.current) {
        console.log('🖱️ Document mouse up - ending current interaction', {
          target: event.target,
          drawing: isDrawingRef.current,
          dragging: isDraggingRef.current
        });
        endCurrentDrawing();
      } else {
        console.log('🖱️ Document mouse up - ignoring (not drawing/dragging)', {
          target: event.target,
          drawing: isDrawingRef.current,
          dragging: isDraggingRef.current
        });
      }
    };

    document.addEventListener('mouseup', handleDocumentMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleDocumentMouseUp);
    };
  }, [endCurrentDrawing]);

  /**
   * Handles mouse leaving the canvas area
   */
  const handleMouseLeave = useCallback(() => {
    if (isDrawingRef.current || isDraggingRef.current) {
      
      endCurrentDrawing();
    }
  }, [endCurrentDrawing]);

  /**
   * Handles the start of a drawing/interaction session
   */
  const handlePointerDown = useCallback((event: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    event.preventDefault();
    
    console.log('🖱️ POINTER DOWN: Event triggered');
    console.log('🖱️ POINTER DOWN: Double-click protection:', doubleClickProtectionRef.current);
    console.log('🖱️ POINTER DOWN: Text editing state:', isEditingTextRef.current);
    
    // Check double-click protection OR text editing state
    if (doubleClickProtectionRef.current || isEditingTextRef.current) {
      console.log('🛡️ Pointer down blocked - protection:', doubleClickProtectionRef.current, 'editing:', isEditingTextRef.current);
      return;
    }
    
    const coords = getCanvasCoordinates(event, canvas);
    console.log('🖱️ POINTER DOWN: Canvas coords:', coords);
    
    // Check if coordinates are within whiteboard bounds for drawing tools
    const activeTool = toolStore.activeTool;
    console.log('🖱️ POINTER DOWN: Active tool:', activeTool);
    
    const isDrawingTool = ['pencil', 'brush', 'eraser', 'rectangle', 'circle', 'triangle', 'diamond', 'pentagon', 'hexagon', 'star', 'heart', 'text', 'stamp', 'fill'].includes(activeTool);
    
    if (isDrawingTool && !isWithinWhiteboardBounds(coords.x, coords.y)) {
      console.log('🚫 Interaction blocked - outside whiteboard bounds:', coords, 'bounds:', activeWhiteboardSize);
      return;
    }

    

    // BLOCK TEXT TOOL if currently editing any text
    if (activeTool === 'text' && isEditingTextRef.current) {
      console.log('📝 Text tool blocked - already editing text');
      return;
    }

    switch (activeTool) {
      case 'fill': {
        handleFillClick(coords);
        return;
      }

      case 'stamp': {
        // Validate that a stamp is selected before proceeding
        if (!toolStore.toolSettings.selectedSticker) {
          console.warn('🖼️ No stamp selected, ignoring click');
          return;
        }
        
        const stampSize = toolStore.toolSettings.stampSize || 10;
        const stampObject = createStampObject(coords.x, coords.y, stampSize);
        
        const objectId = whiteboardStore.addObject(stampObject, userId);
        console.log('🖼️ Created stamp:', objectId.slice(0, 8));
        
        if (redrawCanvasRef.current) {
          redrawCanvasRef.current();
        }
        return;
      }

      case 'select': {
        const isShiftPressed = 'shiftKey' in event ? event.shiftKey : false;
        const objectId = findObjectAt(coords.x, coords.y);
        
        if (objectId) {
          // Handle Shift+click for multi-select
          if (isShiftPressed) {
            const currentSelection = whiteboardStore.selectedObjectIds;
            if (currentSelection.includes(objectId)) {
              // Remove from selection
              const newSelection = currentSelection.filter(id => id !== objectId);
              whiteboardStore.selectObjects(newSelection, userId);
              console.log('🎯 Removed object from selection:', objectId.slice(0, 8), 'new count:', newSelection.length);
            } else {
              // Add to selection
              const newSelection = [...currentSelection, objectId];
              whiteboardStore.selectObjects(newSelection, userId);
              console.log('🎯 Added object to selection:', objectId.slice(0, 8), 'new count:', newSelection.length);
            }
          } else {
            // Normal click - only change selection if clicking on unselected object
            if (!whiteboardStore.selectedObjectIds.includes(objectId)) {
              // Single selection - clear existing and select only this object
              whiteboardStore.selectObjects([objectId], userId);
              console.log('🎯 Selected single object:', objectId.slice(0, 8));
            } else {
              console.log('🎯 Clicked on already selected object - maintaining selection for drag');
            }
          }
          
          // Check if we're clicking on an already selected object for dragging
          if (whiteboardStore.selectedObjectIds.includes(objectId)) {
            // Store initial positions of ALL selected objects for multi-object dragging
            const initialPositions: Record<string, { x: number; y: number }> = {};
            whiteboardStore.selectedObjectIds.forEach(id => {
              const obj = whiteboardStore.objects[id];
              if (obj) {
                initialPositions[id] = { x: obj.x, y: obj.y };
              }
            });
            initialDragPositionsRef.current = initialPositions;
            
            // START BATCH for object dragging - use appropriate action type based on selection count
            const actionType = whiteboardStore.selectedObjectIds.length > 1 ? 'MULTI_OBJECT_DRAG' : 'UPDATE_OBJECT';
            currentBatchIdRef.current = startBatch(actionType, objectId, userId);
            draggedObjectIdRef.current = objectId;
            isDraggingRef.current = true;
            dragStartRef.current = coords;
            console.log('🎯 Started dragging', whiteboardStore.selectedObjectIds.length, 'object(s):', objectId.slice(0, 8));
          }
        } else {
          // Clicked on empty area
          if (!isShiftPressed) {
            // Clear selection and start selection box
            whiteboardStore.clearSelection(userId);
            console.log('🎯 Cleared selection, starting selection box');
          }
          
          // Start selection box
          selectionBoxRef.current = {
            startX: coords.x,
            startY: coords.y,
            endX: coords.x,
            endY: coords.y,
            isActive: true
          };
          isDrawingRef.current = true;
          console.log('📦 Started selection box at:', coords);
        }
        break;
      }

      case 'text': {
        console.log('📝 TEXT TOOL: Pointer down triggered at:', coords);
        console.log('📝 TEXT TOOL: Current tool:', toolStore.activeTool);
        console.log('📝 TEXT TOOL: Checking text editing state:', isEditingTextRef.current);
        
        // Additional check to prevent text creation while editing
        if (isEditingTextRef.current) {
          console.log('📝 TEXT TOOL: Blocked - currently editing text');
          return;
        }

        // Check if we're clicking on an existing text object
        console.log('📝 TEXT TOOL: Looking for object at coords:', coords);
        const clickedObjectId = findObjectAt(coords.x, coords.y);
        console.log('📝 TEXT TOOL: Found object ID:', clickedObjectId);
        
        const clickedObject = clickedObjectId ? whiteboardStore.objects[clickedObjectId] : null;
        console.log('📝 TEXT TOOL: Found object:', clickedObject ? { id: clickedObjectId, type: clickedObject.type } : 'null');
        
        const isClickingOnExistingText = clickedObject && clickedObject.type === 'text';
        console.log('📝 TEXT TOOL: Is clicking on text object?', isClickingOnExistingText);
        
        if (isClickingOnExistingText) {
          console.log('📝 TEXT TOOL: ✅ DETECTED CLICK ON TEXT OBJECT - auto-switching to select tool:', clickedObjectId.slice(0, 8));
          console.log('📝 TEXT TOOL: Current auto-switch state before:', { 
            wasAutoSwitched: toolStore.wasAutoSwitched, 
            autoSwitchedFromTool: toolStore.autoSwitchedFromTool 
          });
          
          // Auto-switch to select tool and track the original tool
          toolStore.setAutoSwitchState('text', true);
          console.log('📝 TEXT TOOL: Set auto-switch state to text');
          
          toolStore.setActiveTool('select');
          console.log('📝 TEXT TOOL: Changed tool to select');
          
          // Select the text object
          whiteboardStore.selectObjects([clickedObjectId], userId);
          console.log('📝 TEXT TOOL: Selected object:', clickedObjectId.slice(0, 8));
          console.log('🔄 TEXT TOOL: ✅ Auto-switched from text to select tool');
          return;
        } else {
          console.log('📝 TEXT TOOL: Not clicking on text object - preparing for new text creation');
        }

        // Store click position for drag detection (only for new text creation)
        textClickStartPosRef.current = coords;
        
        // Don't set timer or drawing state - wait to see if it's a click or drag
        lastPointRef.current = coords;
        pathStartRef.current = coords;
        
        // Prepare shape preview but don't mark as drawing yet
        currentShapePreviewRef.current = {
          type: 'text',
          startX: coords.x,
          startY: coords.y,
          endX: coords.x,
          endY: coords.y,
          strokeColor: toolStore.toolSettings.strokeColor,
          strokeWidth: 1,
          opacity: 1
        };
        
        console.log('📝 TEXT TOOL: Started text interaction on empty space (waiting for click/drag decision):', coords, 'for user:', userId.slice(0, 8));
        break;
      }

      case 'sticky-note': {
        console.log('🗒️ STICKY NOTE: Pointer down triggered at:', coords);
        console.log('🗒️ STICKY NOTE: Current tool:', toolStore.activeTool);
        console.log('🗒️ STICKY NOTE: Checking text editing state:', isEditingTextRef.current);
        
        // Block if currently editing text to avoid conflicts
        if (isEditingTextRef.current) {
          console.log('🗒️ STICKY NOTE: Blocked - currently editing text');
          return;
        }

        // Check if we're clicking on an existing sticky note for auto-select
        console.log('🗒️ STICKY NOTE: Looking for object at coords:', coords);
        const clickedObjectId = findObjectAt(coords.x, coords.y);
        console.log('🗒️ STICKY NOTE: Found object ID:', clickedObjectId);
        
        const clickedObject = clickedObjectId ? whiteboardStore.objects[clickedObjectId] : null;
        console.log('🗒️ STICKY NOTE: Found object:', clickedObject ? { id: clickedObjectId, type: clickedObject.type } : 'null');
        
        const isClickingOnStickyNote = clickedObject && clickedObject.type === 'sticky-note';
        console.log('🗒️ STICKY NOTE: Is clicking on sticky note?', isClickingOnStickyNote);
        
        if (isClickingOnStickyNote) {
          console.log('🗒️ STICKY NOTE: ✅ DETECTED CLICK ON STICKY NOTE - auto-switching to select tool:', clickedObjectId.slice(0, 8));
          console.log('🗒️ STICKY NOTE: Current auto-switch state before:', { 
            wasAutoSwitched: toolStore.wasAutoSwitched, 
            autoSwitchedFromTool: toolStore.autoSwitchedFromTool 
          });
          
          // Auto-switch to select tool and track the original tool
          toolStore.setAutoSwitchState('sticky-note', true);
          console.log('🗒️ STICKY NOTE: Set auto-switch state to sticky-note');
          
          toolStore.setActiveTool('select');
          console.log('🗒️ STICKY NOTE: Changed tool to select');
          
          // Select the sticky note
          whiteboardStore.selectObjects([clickedObjectId], userId);
          console.log('🗒️ STICKY NOTE: Selected object:', clickedObjectId.slice(0, 8));
          console.log('🔄 STICKY NOTE: ✅ Auto-switched from sticky-note to select tool');
          return;
        } else {
          console.log('🗒️ STICKY NOTE: Not clicking on sticky note - creating new one');
        }

        // Create new sticky note
        const stickySize = toolStore.toolSettings.stickyNoteSize || 180;
        const backgroundColor = toolStore.toolSettings.stickyNoteBackgroundColor || '#fef3c7';
        
        const stickyNoteObject = createStickyNoteObject(coords.x, coords.y, stickySize, backgroundColor);
        
        const objectId = whiteboardStore.addObject(stickyNoteObject, userId);
        console.log('🗒️ Created sticky note:', objectId.slice(0, 8), 'for user:', userId.slice(0, 8));
        
        // Trigger immediate sticky note editing (pass the sticky note object ID)
        setTimeout(() => {
          if (onImmediateTextTriggerRef.current) {
            onImmediateTextTriggerRef.current(coords, objectId);
          }
        }, 10); // Small delay to ensure object is in store
        
        if (redrawCanvasRef.current) {
          redrawCanvasRef.current();
        }
        break;
      }

      case 'pencil':
      case 'brush': {
        console.log('🎨 DRAWING START:', {
          tool: activeTool,
          coords,
          timestamp: Date.now()
        });
        
        // START BATCH for drawing
        currentBatchIdRef.current = startBatch('ADD_OBJECT', 'drawing', userId);
        
        isDrawingRef.current = true;
        lastPointRef.current = coords;
        pathStartRef.current = coords;
        
        const config = getSmoothingConfig(activeTool);
        pathBuilderRef.current = new SimplePathBuilder(config.minDistance, config.smoothingStrength);
        
        const initialPath = pathBuilderRef.current.addPoint({ x: 0, y: 0 });
        
        currentDrawingPreviewRef.current = {
          path: initialPath,
          startX: coords.x,
          startY: coords.y,
          strokeColor: toolStore.toolSettings.strokeColor,
          strokeWidth: activeTool === 'brush' ? (toolStore.toolSettings.brushSize || 8) : (toolStore.toolSettings.pencilSize || 4),
          opacity: toolStore.toolSettings.opacity,
          brushType: activeTool === 'brush' ? toolStore.toolSettings.brushType : 'pencil'
        };
        
        console.log('🎨 PREVIEW CREATED:', {
          hasPreview: !!currentDrawingPreviewRef.current,
          batchId: currentBatchIdRef.current?.slice(0, 8),
          timestamp: Date.now()
        });
        break;
      }

      case 'rectangle':
      case 'circle':
      case 'triangle':
      case 'diamond':
      case 'pentagon':
      case 'hexagon':
      case 'star':
      case 'heart': {
        isDrawingRef.current = true;
        lastPointRef.current = coords;
        pathStartRef.current = coords;
        
        const shapeBorderWeight = toolStore.toolSettings.shapeBorderWeight || 2;
        currentShapePreviewRef.current = {
          type: activeTool,
          startX: coords.x,
          startY: coords.y,
          endX: coords.x,
          endY: coords.y,
          strokeColor: toolStore.toolSettings.strokeColor,
          strokeWidth: shapeBorderWeight,
          opacity: toolStore.toolSettings.opacity
        };
        
        console.log('🔷 Started shape:', activeTool);
        break;
      }

      case 'eraser': {
        isDrawingRef.current = true;
        lastPointRef.current = coords;
        
        handleEraserStart(coords, findObjectAt, redrawCanvasRef.current || undefined);
        
        console.log('🧹 Started erasing');
        break;
      }

      default:
        console.log('🔧 Tool not implemented yet:', activeTool);
    }
  }, [toolStore.activeTool, toolStore.toolSettings, whiteboardStore, findObjectAt, getCanvasCoordinates, handleEraserStart, handleFillClick, createTextObject, createStampObject, userId, startBatch]);

  /**
   * Handles pointer movement during interaction
   */
  const handlePointerMove = useCallback((event: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const coords = getCanvasCoordinates(event, canvas);
    const activeTool = toolStore.activeTool;
    
    // For drawing tools, constrain movement to whiteboard bounds
    const isDrawingTool = ['pencil', 'brush', 'eraser'].includes(activeTool);
    if (isDrawingTool && isDrawingRef.current && !isWithinWhiteboardBounds(coords.x, coords.y)) {
      // Stop drawing if moved outside bounds
      return;
    }

    switch (activeTool) {
      case 'select': {
        if (isDraggingRef.current && dragStartRef.current && whiteboardStore.selectedObjectIds.length > 0) {
          // Multi-object dragging with absolute positioning to prevent drift
          const deltaX = coords.x - dragStartRef.current.x;
          const deltaY = coords.y - dragStartRef.current.y;
          
          console.log('🔄 Dragging movement:', {
            selectedCount: whiteboardStore.selectedObjectIds.length,
            delta: { x: deltaX, y: deltaY },
            initialPositions: Object.keys(initialDragPositionsRef.current).length
          });
          
          // Store current drag deltas for live rendering without creating actions
          dragDeltasRef.current = { x: deltaX, y: deltaY };
          
          // Apply visual updates without persisting to store during drag
          whiteboardStore.selectedObjectIds.forEach(objectId => {
            const initialPos = initialDragPositionsRef.current[objectId];
            if (initialPos) {
              const newPos = {
                x: initialPos.x + deltaX,
                y: initialPos.y + deltaY
              };
              console.log('🔄 Live dragging object:', objectId.slice(0, 8), 'from', initialPos, 'to', newPos);
              // Store the live position for rendering but don't create UPDATE_OBJECT actions yet
              liveDragPositionsRef.current[objectId] = newPos;
            } else {
              console.warn('❌ No initial position stored for object:', objectId.slice(0, 8));
            }
          });
          
          // Check if batch is getting too large
          if (currentBatchIdRef.current) {
            checkBatchSize();
          }
          
          if (redrawCanvasRef.current) {
            redrawCanvasRef.current();
          }
        } else if (isDrawingRef.current && selectionBoxRef.current) {
          // Updating selection box
          selectionBoxRef.current.endX = coords.x;
          selectionBoxRef.current.endY = coords.y;
          
          if (redrawCanvasRef.current) {
            redrawCanvasRef.current();
          }
        }
        break;
      }

      case 'text': {
        // Check for drag intent: if significant movement is detected, enter drag mode
        if (textClickStartPosRef.current && !isDrawingRef.current) {
          const deltaX = Math.abs(coords.x - textClickStartPosRef.current.x);
          const deltaY = Math.abs(coords.y - textClickStartPosRef.current.y);
          
          if (deltaX > 5 || deltaY > 5) {
            console.log('📝 Drag detected - entering drag mode');
            isDrawingRef.current = true; // Now mark as drawing since it's a drag
          }
        }
        
        // Update shape preview for drag mode only if we're actually drawing
        if (isDrawingRef.current && pathStartRef.current && currentShapePreviewRef.current) {
          currentShapePreviewRef.current.endX = coords.x;
          currentShapePreviewRef.current.endY = coords.y;
          
          if (redrawCanvasRef.current) {
            requestAnimationFrame(() => {
              if (redrawCanvasRef.current && isDrawingRef.current) {
                redrawCanvasRef.current();
              }
            });
          }
        }
        break;
      }
      
      case 'rectangle':
      case 'circle':
      case 'triangle':
      case 'diamond':
      case 'pentagon':
      case 'hexagon':
      case 'star':
      case 'heart': {
        if (isDrawingRef.current && pathStartRef.current && currentShapePreviewRef.current) {
          currentShapePreviewRef.current.endX = coords.x;
          currentShapePreviewRef.current.endY = coords.y;
          
          if (redrawCanvasRef.current) {
            requestAnimationFrame(() => {
              if (redrawCanvasRef.current && isDrawingRef.current) {
                redrawCanvasRef.current();
              }
            });
          }
        }
        break;
      }

      case 'pencil':
      case 'brush': {
        if (isDrawingRef.current && lastPointRef.current && pathStartRef.current && pathBuilderRef.current) {
          const relativeX = coords.x - pathStartRef.current.x;
          const relativeY = coords.y - pathStartRef.current.y;
          
          const smoothPath = pathBuilderRef.current.addPoint({ x: relativeX, y: relativeY });
          
          lastPointRef.current = coords;
          
          if (currentDrawingPreviewRef.current) {
            currentDrawingPreviewRef.current.path = smoothPath;
          }
          
          // Check if batch is getting too large
          if (currentBatchIdRef.current) {
            checkBatchSize();
          }
          
          if (redrawCanvasRef.current) {
            console.log('🎨 PREVIEW REDRAW:', {
              tool: activeTool,
              hasPreview: !!currentDrawingPreviewRef.current,
              pathLength: currentDrawingPreviewRef.current?.path.length || 0,
              timestamp: Date.now()
            });
            requestAnimationFrame(() => {
              if (redrawCanvasRef.current && isDrawingRef.current) {
                redrawCanvasRef.current();
              }
            });
          }
        }
        break;
      }

      case 'eraser': {
        if (isDrawingRef.current && lastPointRef.current) {
          handleEraserMove(coords, lastPointRef.current, findObjectAt, redrawCanvasRef.current || undefined);
          lastPointRef.current = coords;
        }
        break;
      }
    }
  }, [toolStore.activeTool, toolStore.toolSettings, whiteboardStore, getCanvasCoordinates, handleEraserMove, findObjectAt, userId, checkBatchSize]);

  /**
   * Handles the end of a drawing/interaction session
   */
  const handlePointerUp = useCallback((event: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const activeTool = toolStore.activeTool;

    

    switch (activeTool) {
      case 'select': {
        if (isDraggingRef.current) {
          console.log('🔄 Finished dragging', whiteboardStore.selectedObjectIds.length, 'object(s), applying final positions');
          
          // Create optimized drag completion batch with only final positions
          const finalBatchId = whiteboardStore.startActionBatch('DRAG_COMPLETE', 'multi-object', userId);
          
          // Apply final positions for all dragged objects in a single batch
          whiteboardStore.selectedObjectIds.forEach(objectId => {
            const finalPos = liveDragPositionsRef.current[objectId];
            if (finalPos) {
              console.log('🎯 Final position for object:', objectId.slice(0, 8), finalPos);
              whiteboardStore.updateObject(objectId, finalPos, userId);
            }
          });
          
          // End the optimized batch
          whiteboardStore.endActionBatch();
          
          // Clean up drag state
          currentBatchIdRef.current = null;
          draggedObjectIdRef.current = null;
          initialDragPositionsRef.current = {};
          liveDragPositionsRef.current = {};
          dragDeltasRef.current = { x: 0, y: 0 };
        } else if (isDrawingRef.current && selectionBoxRef.current && selectionBoxRef.current.isActive) {
          // Complete selection box
          const objectIds = findObjectsInSelectionBox(selectionBoxRef.current);
          
          if (objectIds.length > 0) {
            const currentSelection = whiteboardStore.selectedObjectIds;
            const isShiftPressed = 'shiftKey' in event ? event.shiftKey : false;
            
            let newSelection: string[];
            if (isShiftPressed) {
              // Add to existing selection
              newSelection = [...new Set([...currentSelection, ...objectIds])];
            } else {
              // Replace selection
              newSelection = objectIds;
            }
            
            whiteboardStore.selectObjects(newSelection, userId);
            console.log('📦 Selection box completed, selected:', newSelection.length, 'objects');
          }
          
          // Clear selection box
          selectionBoxRef.current = null;
          
          if (redrawCanvasRef.current) {
            redrawCanvasRef.current();
          }
        }
        
        isDraggingRef.current = false;
        dragStartRef.current = null;
        break;
      }

      case 'text': {
        console.log('📝 Text pointer up - checking mode:', {
          wasDrawing: isDrawingRef.current,
          hasClickStartPos: !!textClickStartPosRef.current,
          clickStartPos: textClickStartPosRef.current
        });
        
        // Additional check to prevent text creation while editing
        if (isEditingTextRef.current) {
          console.log('📝 Text creation blocked in pointer up - currently editing text');
          isDrawingRef.current = false;
          currentShapePreviewRef.current = null;
          textClickStartPosRef.current = null;
          return;
        }

        // Decide: was this a click or a drag?
        if (!isDrawingRef.current && textClickStartPosRef.current) {
          // This was a click (no drag detected) - trigger immediate text editing
          console.log('📝 Single click detected - triggering immediate text editing');
          triggerImmediateTextEditing(textClickStartPosRef.current);
        } else if (isDrawingRef.current && pathStartRef.current && currentShapePreviewRef.current) {
          // This was a drag - create text box
          const preview = currentShapePreviewRef.current;
          const width = Math.abs(preview.endX - preview.startX);
          const height = Math.abs(preview.endY - preview.startY);
          
          // Clear preview IMMEDIATELY before creating final object
          currentShapePreviewRef.current = null;
          
          if (width > 10 && height > 10) {
            const textObject = createTextObject(
              Math.min(preview.startX, preview.endX),
              Math.min(preview.startY, preview.endY),
              width,
              height,
              preview.strokeColor
            );

            const objectId = whiteboardStore.addObject(textObject, userId);
            console.log('📝 Created text object via drag:', objectId.slice(0, 8), { width, height, userId: userId.slice(0, 8) });
          }
          
          // Force immediate redraw after object creation
          if (redrawCanvasRef.current) {
            redrawCanvasRef.current();
          }
        }
        
        // Reset all states
        textClickStartPosRef.current = null;
        isDrawingRef.current = false;
        break;
      }

      case 'pencil':
      case 'brush': {
        if (isDrawingRef.current && pathBuilderRef.current && pathStartRef.current) {
          console.log('🎨 DRAWING COMPLETION START:', {
            tool: activeTool,
            hasPreview: !!currentDrawingPreviewRef.current,
            pathLength: pathBuilderRef.current.getCurrentPath().length,
            timestamp: Date.now()
          });
          
          const finalSmoothPath = pathBuilderRef.current.getCurrentPath();
          
          // Clear preview IMMEDIATELY before creating final object to prevent flickering
          console.log('🎨 CLEARING PREVIEW:', {
            hadPreview: !!currentDrawingPreviewRef.current,
            timestamp: Date.now()
          });
          currentDrawingPreviewRef.current = null;
          pathBuilderRef.current = null;
          
          console.log('🎨 CREATING FINAL OBJECT:', {
            pathLength: finalSmoothPath.length,
            startCoords: pathStartRef.current,
            timestamp: Date.now()
          });
          
          const drawingObject: Omit<WhiteboardObject, 'id' | 'createdAt' | 'updatedAt'> = {
            type: 'path',
            x: pathStartRef.current.x,
            y: pathStartRef.current.y,
            stroke: toolStore.toolSettings.strokeColor,
            strokeWidth: activeTool === 'brush' ? (toolStore.toolSettings.brushSize || 8) : (toolStore.toolSettings.pencilSize || 4),
            opacity: toolStore.toolSettings.opacity,
            fill: 'none',
            data: {
              path: finalSmoothPath,
              brushType: activeTool === 'brush' ? toolStore.toolSettings.brushType : 'pencil'
            }
          };

          // END BATCH before adding final object to prevent batch interference
          console.log('🎨 ENDING BATCH:', {
            hadBatch: !!currentBatchIdRef.current,
            batchId: currentBatchIdRef.current?.slice(0, 8),
            timestamp: Date.now()
          });
          if (currentBatchIdRef.current) {
            endBatch();
            currentBatchIdRef.current = null;
            drawingObjectIdRef.current = null;
          }

          console.log('🎨 ADDING OBJECT TO STORE:', {
            timestamp: Date.now()
          });
          const objectId = whiteboardStore.addObject(drawingObject, userId);
          console.log('🎨 OBJECT ADDED TO STORE:', {
            objectId: objectId.slice(0, 8),
            timestamp: Date.now()
          });
          
          // Force immediate redraw after object creation with small delay to ensure store state is updated
          console.log('🎨 TRIGGERING REDRAW:', {
            hasRedrawFn: !!redrawCanvasRef.current,
            timestamp: Date.now()
          });
          if (redrawCanvasRef.current) {
            // Use setTimeout to ensure Zustand state is fully updated before redraw
            setTimeout(() => {
              if (redrawCanvasRef.current) {
                redrawCanvasRef.current();
              }
            }, 0);
          }
          console.log('🎨 DRAWING COMPLETION END:', {
            objectId: objectId.slice(0, 8),
            timestamp: Date.now()
          });
        }
        break;
      }

      case 'rectangle':
      case 'circle':
      case 'triangle':
      case 'diamond':
      case 'pentagon':
      case 'hexagon':
      case 'star':
      case 'heart': {
        if (isDrawingRef.current && pathStartRef.current && currentShapePreviewRef.current) {
          const preview = currentShapePreviewRef.current;
          const width = Math.abs(preview.endX - preview.startX);
          const height = Math.abs(preview.endY - preview.startY);
          
          // Clear preview IMMEDIATELY before creating final object
          currentShapePreviewRef.current = null;
          
          if (width > 5 && height > 5) {
            const shapeObject = createShapeObject(
              activeTool,
              Math.min(preview.startX, preview.endX),
              Math.min(preview.startY, preview.endY),
              width,
              height,
              preview.strokeColor,
              preview.strokeWidth,
              preview.opacity
            );

            if (shapeObject) {
              const objectId = whiteboardStore.addObject(shapeObject, userId);
              console.log('🔷 Created shape object:', activeTool, objectId.slice(0, 8), { width, height, userId: userId.slice(0, 8) });
            }
          }
          
          // Force immediate redraw after object creation
          if (redrawCanvasRef.current) {
            redrawCanvasRef.current();
          }
        }
        break;
      }

      case 'eraser': {
        if (isDrawingRef.current) {
          handleEraserEnd(redrawCanvasRef.current || undefined);
          console.log('🧹 Finished erasing:', { mode: toolStore.toolSettings.eraserMode, userId: userId.slice(0, 8) });
        }
        break;
      }
    }

    console.log('🎨 POINTER UP CLEANUP:', {
      tool: activeTool,
      wasDrawing: isDrawingRef.current,
      timestamp: Date.now()
    });
    isDrawingRef.current = false;
    lastPointRef.current = null;
    pathStartRef.current = null;
    pathBuilderRef.current = null;
  }, [toolStore.activeTool, toolStore.toolSettings, whiteboardStore, handleEraserEnd, createShapeObject, createTextObject, userId, endBatch]);

  /**
   * Gets the current drawing preview for rendering
   */
  const getCurrentDrawingPreview = useCallback(() => {
    return currentDrawingPreviewRef.current;
  }, []);

  /**
   * Gets the current shape preview for rendering
   */
  const getCurrentShapePreview = useCallback(() => {
    return currentShapePreviewRef.current;
  }, []);

  /**
   * Gets the current selection box for rendering
   */
  const getCurrentSelectionBox = useCallback(() => {
    return selectionBoxRef.current;
  }, []);

  /**
   * Clears all text interaction state to prevent phantom text editor
   */
  const clearTextInteractionState = useCallback(() => {
    
    
    // Clear text click timer
    if (textClickTimerRef.current) {
      clearTimeout(textClickTimerRef.current);
      textClickTimerRef.current = null;
    }
    
    // Clear text click position
    textClickStartPosRef.current = null;
    
    // Clear shape preview if it's a text preview
    if (currentShapePreviewRef.current?.type === 'text') {
      currentShapePreviewRef.current = null;
    }
    
    // Reset any drawing state that might be related to text
    if (toolStore.activeTool === 'text') {
      isDrawingRef.current = false;
      lastPointRef.current = null;
      pathStartRef.current = null;
    }
    
    
  }, [toolStore.activeTool]);

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleMouseLeave,
    isDrawing: isDrawingRef.current,
    isDragging: isDraggingRef.current,
    getCurrentDrawingPreview,
    getCurrentShapePreview,
    getCurrentSelectionBox,
    getCurrentDragDeltas: () => dragDeltasRef.current,
    getLiveDragPositions: () => liveDragPositionsRef.current,
    setRedrawCanvas,
    setDoubleClickProtection,
    setEditingState,
    setImmediateTextTrigger,
    clearTextInteractionState
  };
};
