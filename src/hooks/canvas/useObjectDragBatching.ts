
import { useCallback, useRef } from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useUser } from '../../contexts/UserContext';
import { useCanvasInteractionBatching } from './useCanvasInteractionBatching';

export const useObjectDragBatching = () => {
  const whiteboardStore = useWhiteboardStore();
  const { userId } = useUser();
  const { startInteractionBatch, endInteractionBatch } = useCanvasInteractionBatching(userId);
  
  const activeDragRef = useRef<{
    objectId: string;
    batchId: string;
    startPosition: { x: number; y: number };
  } | null>(null);

  const startDrag = useCallback((objectId: string, startX: number, startY: number) => {
    console.log('🎯 Starting object drag batch for:', objectId);
    
    // End any existing drag batch
    if (activeDragRef.current) {
      endInteractionBatch();
    }
    
    const batchId = startInteractionBatch('UPDATE_OBJECT', objectId);
    activeDragRef.current = {
      objectId,
      batchId,
      startPosition: { x: startX, y: startY }
    };
    
    return batchId;
  }, [startInteractionBatch, endInteractionBatch]);

  const updateDrag = useCallback((objectId: string, newX: number, newY: number) => {
    if (!activeDragRef.current || activeDragRef.current.objectId !== objectId) {
      // Start drag if not already started
      startDrag(objectId, newX, newY);
      return;
    }
    
    // This update will be automatically batched
    whiteboardStore.updateObject(objectId, { x: newX, y: newY }, userId);
  }, [whiteboardStore, userId, startDrag]);

  const endDrag = useCallback(() => {
    if (!activeDragRef.current) return;
    
    console.log('🎯 Ending object drag batch for:', activeDragRef.current.objectId);
    endInteractionBatch();
    activeDragRef.current = null;
  }, [endInteractionBatch]);

  return {
    startDrag,
    updateDrag,
    endDrag,
    isActive: () => !!activeDragRef.current,
    getCurrentDrag: () => activeDragRef.current,
  };
};
