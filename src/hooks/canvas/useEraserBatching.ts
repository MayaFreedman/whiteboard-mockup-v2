
import { useCallback, useRef } from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useUser } from '../../contexts/UserContext';
import { useCanvasInteractionBatching } from './useCanvasInteractionBatching';

export const useEraserBatching = () => {
  const whiteboardStore = useWhiteboardStore();
  const { userId } = useUser();
  const { startInteractionBatch, endInteractionBatch } = useCanvasInteractionBatching(userId);
  
  const activeEraseRef = useRef<{
    objectId: string;
    batchId: string;
  } | null>(null);

  const startErase = useCallback((objectId: string) => {
    console.log('🎯 Starting erase batch for:', objectId);
    
    // End any existing erase batch
    if (activeEraseRef.current) {
      endInteractionBatch();
    }
    
    const batchId = startInteractionBatch('ERASE_PATH', objectId);
    activeEraseRef.current = {
      objectId,
      batchId
    };
    
    return batchId;
  }, [startInteractionBatch, endInteractionBatch]);

  const performErase = useCallback((eraseAction: Parameters<typeof whiteboardStore.erasePath>[0]) => {
    const objectId = eraseAction.originalObjectId;
    
    if (!activeEraseRef.current || activeEraseRef.current.objectId !== objectId) {
      // Start erase batch if not already started
      startErase(objectId);
    }
    
    // This erase will be automatically batched
    whiteboardStore.erasePath(eraseAction, userId);
  }, [whiteboardStore, userId, startErase]);

  const endErase = useCallback(() => {
    if (!activeEraseRef.current) return;
    
    console.log('🎯 Ending erase batch for:', activeEraseRef.current.objectId);
    endInteractionBatch();
    activeEraseRef.current = null;
  }, [endInteractionBatch]);

  return {
    startErase,
    performErase,
    endErase,
    isActive: () => !!activeEraseRef.current,
    getCurrentErase: () => activeEraseRef.current,
  };
};
