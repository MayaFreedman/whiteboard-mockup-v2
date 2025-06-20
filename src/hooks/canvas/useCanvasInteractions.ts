
import { useCallback, useRef, useEffect, useState } from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useToolStore } from '../../stores/toolStore';
import { useUser } from '../../contexts/UserContext';
import { useCanvasInteractionBatching } from './useCanvasInteractionBatching';
import { useObjectDetection } from './useObjectDetection';
import { useCanvasCoordinates } from './useCanvasCoordinates';
import { useEraserLogic } from './useEraserLogic';

export const useCanvasInteractions = () => {
  const whiteboardStore = useWhiteboardStore();
  const toolStore = useToolStore();
  const { userId } = useUser();
  const { startInteractionBatch, endInteractionBatch, shouldStartBatch } = useCanvasInteractionBatching(userId);
  
  // State for various interaction modes
  const [isDragging, setIsDragging] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentDrawingId, setCurrentDrawingId] = useState<string | null>(null);
  const [currentDrawingPreview, setCurrentDrawingPreview] = useState<any>(null);
  const [currentShapePreview, setCurrentShapePreview] = useState<any>(null);
  
  // Refs for interaction state
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragObjectIdRef = useRef<string | null>(null);
  const isDrawingRef = useRef(false);
  const drawingPathRef = useRef<string>('');
  const shapeStartRef = useRef<{ x: number; y: number } | null>(null);
  
  // Canvas utilities
  const { getCanvasCoordinates } = useCanvasCoordinates();
  const { findObjectAtPosition } = useObjectDetection();
  const { performErase } = useEraserLogic();
  
  // External setters (will be set by Canvas component)
  const redrawCanvasRef = useRef<(() => void) | null>(null);
  const doubleClickProtectionRef = useRef(false);
  const editingStateRef = useRef(false);

  // Handle object dragging with batching
  const handleObjectDragStart = useCallback((objectId: string, startX: number, startY: number) => {
    console.log('🎯 Object drag start:', objectId);
    isDraggingRef.current = true;
    setIsDragging(true);
    dragStartRef.current = { x: startX, y: startY };
    dragObjectIdRef.current = objectId;
    
    // Start batching for UPDATE_OBJECT actions on this object
    startInteractionBatch('UPDATE_OBJECT', objectId);
  }, [startInteractionBatch]);

  const handleObjectDragMove = useCallback((objectId: string, newX: number, newY: number) => {
    if (!isDraggingRef.current || dragObjectIdRef.current !== objectId) return;
    
    // This will now be batched automatically since we started a batch
    whiteboardStore.updateObject(objectId, { x: newX, y: newY }, userId);
    redrawCanvasRef.current?.();
  }, [whiteboardStore, userId]);

  const handleObjectDragEnd = useCallback(() => {
    if (!isDraggingRef.current) return;
    
    console.log('🎯 Object drag end');
    isDraggingRef.current = false;
    setIsDragging(false);
    dragStartRef.current = null;
    dragObjectIdRef.current = null;
    
    // End the batching - this will create a single batch action
    endInteractionBatch();
  }, [endInteractionBatch]);

  // Handle eraser interactions with batching
  const handleEraserStart = useCallback((objectId: string) => {
    console.log('🎯 Eraser start on object:', objectId);
    
    // Start batching for ERASE_PATH actions
    startInteractionBatch('ERASE_PATH', objectId);
  }, [startInteractionBatch]);

  const handleEraserEnd = useCallback(() => {
    console.log('🎯 Eraser end');
    
    // End the batching for eraser actions
    endInteractionBatch();
  }, [endInteractionBatch]);

  // Handle drawing interactions with batching
  const handleDrawingStart = useCallback((objectId: string) => {
    console.log('🎯 Drawing start:', objectId);
    setIsDrawing(true);
    setCurrentDrawingId(objectId);
    isDrawingRef.current = true;
    drawingPathRef.current = '';
    
    // Start batching for UPDATE_OBJECT actions during drawing
    startInteractionBatch('UPDATE_OBJECT', objectId);
  }, [startInteractionBatch]);

  const handleDrawingEnd = useCallback(() => {
    console.log('🎯 Drawing end');
    setIsDrawing(false);
    setCurrentDrawingId(null);
    setCurrentDrawingPreview(null);
    isDrawingRef.current = false;
    drawingPathRef.current = '';
    
    // End the batching for drawing actions
    endInteractionBatch();
  }, [endInteractionBatch]);

  // Core pointer event handlers
  const handlePointerDown = useCallback((event: PointerEvent | MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    if (doubleClickProtectionRef.current || editingStateRef.current) {
      console.log('🖱️ Pointer down blocked - double-click protection or editing state active');
      return;
    }

    const coords = getCanvasCoordinates(event, canvas);
    if (!coords) return;

    const { x, y } = coords;
    const activeTool = toolStore.activeTool;

    // Handle different tools
    switch (activeTool) {
      case 'select':
        const objectAtPosition = findObjectAtPosition(x, y);
        if (objectAtPosition) {
          whiteboardStore.selectObjects([objectAtPosition.id], userId);
          handleObjectDragStart(objectAtPosition.id, objectAtPosition.x, objectAtPosition.y);
        } else {
          whiteboardStore.clearSelection(userId);
        }
        break;

      case 'pencil':
      case 'brush':
        const drawingId = whiteboardStore.addObject({
          type: 'path',
          x: x,
          y: y,
          stroke: toolStore.strokeColor,
          strokeWidth: toolStore.strokeWidth,
          data: { path: `M ${x} ${y}`, brushType: activeTool }
        }, userId);
        handleDrawingStart(drawingId);
        drawingPathRef.current = `M ${x} ${y}`;
        break;

      case 'eraser':
        const targetObject = findObjectAtPosition(x, y);
        if (targetObject && targetObject.type === 'path') {
          handleEraserStart(targetObject.id);
        }
        break;

      case 'rectangle':
      case 'circle':
      case 'triangle':
        shapeStartRef.current = { x, y };
        setCurrentShapePreview({
          type: activeTool,
          startX: x,
          startY: y,
          currentX: x,
          currentY: y
        });
        break;
    }

    redrawCanvasRef.current?.();
  }, [toolStore, whiteboardStore, userId, getCanvasCoordinates, findObjectAtPosition, handleObjectDragStart, handleDrawingStart, handleEraserStart]);

  const handlePointerMove = useCallback((event: PointerEvent | MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const coords = getCanvasCoordinates(event, canvas);
    if (!coords) return;

    const { x, y } = coords;
    const activeTool = toolStore.activeTool;

    // Handle dragging
    if (isDraggingRef.current && dragObjectIdRef.current) {
      handleObjectDragMove(dragObjectIdRef.current, x, y);
      return;
    }

    // Handle drawing
    if (isDrawingRef.current && currentDrawingId) {
      drawingPathRef.current += ` L ${x} ${y}`;
      whiteboardStore.updateObject(currentDrawingId, {
        data: { ...whiteboardStore.objects[currentDrawingId]?.data, path: drawingPathRef.current }
      }, userId);
      setCurrentDrawingPreview({ path: drawingPathRef.current });
      redrawCanvasRef.current?.();
      return;
    }

    // Handle shape preview
    if (shapeStartRef.current) {
      setCurrentShapePreview({
        type: activeTool,
        startX: shapeStartRef.current.x,
        startY: shapeStartRef.current.y,
        currentX: x,
        currentY: y
      });
      redrawCanvasRef.current?.();
      return;
    }

    // Handle eraser
    if (activeTool === 'eraser') {
      const targetObject = findObjectAtPosition(x, y);
      if (targetObject && targetObject.type === 'path') {
        performErase(targetObject, x, y, toolStore.eraserSize);
        redrawCanvasRef.current?.();
      }
    }
  }, [toolStore, whiteboardStore, userId, currentDrawingId, getCanvasCoordinates, findObjectAtPosition, handleObjectDragMove, performErase]);

  const handlePointerUp = useCallback((event: PointerEvent | MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const coords = getCanvasCoordinates(event, canvas);
    if (!coords) return;

    const { x, y } = coords;
    const activeTool = toolStore.activeTool;

    // Handle drag end
    if (isDraggingRef.current) {
      handleObjectDragEnd();
      return;
    }

    // Handle drawing end
    if (isDrawingRef.current) {
      handleDrawingEnd();
      return;
    }

    // Handle shape creation
    if (shapeStartRef.current && activeTool !== 'select') {
      const startX = shapeStartRef.current.x;
      const startY = shapeStartRef.current.y;
      const width = Math.abs(x - startX);
      const height = Math.abs(y - startY);
      
      if (width > 5 && height > 5) { // Minimum size threshold
        whiteboardStore.addObject({
          type: activeTool as any,
          x: Math.min(startX, x),
          y: Math.min(startY, y),
          width,
          height,
          stroke: toolStore.strokeColor,
          strokeWidth: toolStore.strokeWidth,
          fill: toolStore.fillColor
        }, userId);
      }
      
      shapeStartRef.current = null;
      setCurrentShapePreview(null);
      redrawCanvasRef.current?.();
    }

    // Handle eraser end
    if (activeTool === 'eraser') {
      handleEraserEnd();
    }
  }, [toolStore, whiteboardStore, userId, getCanvasCoordinates, handleObjectDragEnd, handleDrawingEnd, handleEraserEnd]);

  const handleMouseLeave = useCallback(() => {
    // Clean up any active interactions
    if (isDraggingRef.current) {
      handleObjectDragEnd();
    }
    if (isDrawingRef.current) {
      handleDrawingEnd();
    }
    if (shapeStartRef.current) {
      shapeStartRef.current = null;
      setCurrentShapePreview(null);
      redrawCanvasRef.current?.();
    }
  }, [handleObjectDragEnd, handleDrawingEnd]);

  // Preview getters
  const getCurrentDrawingPreview = useCallback(() => currentDrawingPreview, [currentDrawingPreview]);
  const getCurrentShapePreview = useCallback(() => currentShapePreview, [currentShapePreview]);

  // Setters for external dependencies
  const setRedrawCanvas = useCallback((fn: () => void) => {
    redrawCanvasRef.current = fn;
  }, []);

  const setDoubleClickProtection = useCallback((value: boolean) => {
    doubleClickProtectionRef.current = value;
  }, []);

  const setEditingState = useCallback((value: boolean) => {
    editingStateRef.current = value;
  }, []);

  // Clean up any active batches on unmount
  useEffect(() => {
    return () => {
      endInteractionBatch();
    };
  }, [endInteractionBatch]);

  return {
    // Batched interaction handlers
    handleObjectDragStart,
    handleObjectDragMove,
    handleObjectDragEnd,
    handleEraserStart,
    handleEraserEnd,
    handleDrawingStart,
    handleDrawingEnd,
    
    // Core interaction handlers
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleMouseLeave,
    
    // State
    isDragging,
    isDrawing,
    
    // Preview functions
    getCurrentDrawingPreview,
    getCurrentShapePreview,
    
    // Setters
    setRedrawCanvas,
    setDoubleClickProtection,
    setEditingState,
  };
};
