
import { useCallback, useRef, useEffect } from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useToolStore } from '../../stores/toolStore';
import { useUser } from '../../contexts/UserContext';
import { useCanvasInteractionBatching } from './useCanvasInteractionBatching';

export const useCanvasInteractions = () => {
  const whiteboardStore = useWhiteboardStore();
  const toolStore = useToolStore();
  const { userId } = useUser();
  const { startInteractionBatch, endInteractionBatch, shouldStartBatch } = useCanvasInteractionBatching(userId);
  
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragObjectIdRef = useRef<string | null>(null);

  // Handle object dragging with batching
  const handleObjectDragStart = useCallback((objectId: string, startX: number, startY: number) => {
    console.log('🎯 Object drag start:', objectId);
    isDraggingRef.current = true;
    dragStartRef.current = { x: startX, y: startY };
    dragObjectIdRef.current = objectId;
    
    // Start batching for UPDATE_OBJECT actions on this object
    startInteractionBatch('UPDATE_OBJECT', objectId);
  }, [startInteractionBatch]);

  const handleObjectDragMove = useCallback((objectId: string, newX: number, newY: number) => {
    if (!isDraggingRef.current || dragObjectIdRef.current !== objectId) return;
    
    // This will now be batched automatically since we started a batch
    whiteboardStore.updateObject(objectId, { x: newX, y: newY }, userId);
  }, [whiteboardStore, userId]);

  const handleObjectDragEnd = useCallback(() => {
    if (!isDraggingRef.current) return;
    
    console.log('🎯 Object drag end');
    isDraggingRef.current = false;
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
    
    // Start batching for UPDATE_OBJECT actions during drawing
    startInteractionBatch('UPDATE_OBJECT', objectId);
  }, [startInteractionBatch]);

  const handleDrawingEnd = useCallback(() => {
    console.log('🎯 Drawing end');
    
    // End the batching for drawing actions
    endInteractionBatch();
  }, [endInteractionBatch]);

  // Clean up any active batches on unmount
  useEffect(() => {
    return () => {
      endInteractionBatch();
    };
  }, [endInteractionBatch]);

  return {
    handleObjectDragStart,
    handleObjectDragMove,
    handleObjectDragEnd,
    handleEraserStart,
    handleEraserEnd,
    handleDrawingStart,
    handleDrawingEnd,
  };
};
