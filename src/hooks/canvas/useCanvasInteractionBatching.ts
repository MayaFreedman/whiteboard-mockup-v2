
import { useCallback, useRef } from 'react';
import { useActionBatching } from '../useActionBatching';

interface InteractionBatchingState {
  currentBatchId: string | null;
  currentActionType: string | null;
  currentObjectId: string | null;
}

export const useCanvasInteractionBatching = (userId?: string) => {
  const { startBatch, endBatch } = useActionBatching({ 
    batchTimeout: 500, // Shorter timeout for interactions
    maxBatchSize: 100 
  });
  
  const batchStateRef = useRef<InteractionBatchingState>({
    currentBatchId: null,
    currentActionType: null,
    currentObjectId: null,
  });

  const startInteractionBatch = useCallback((actionType: string, objectId: string) => {
    console.log('🎯 Starting interaction batch:', { actionType, objectId });
    
    // End any existing batch first
    if (batchStateRef.current.currentBatchId) {
      endBatch();
    }
    
    const batchId = startBatch(actionType, objectId, userId);
    batchStateRef.current = {
      currentBatchId: batchId,
      currentActionType: actionType,
      currentObjectId: objectId,
    };
    
    return batchId;
  }, [startBatch, endBatch, userId]);

  const endInteractionBatch = useCallback(() => {
    if (batchStateRef.current.currentBatchId) {
      console.log('🎯 Ending interaction batch:', batchStateRef.current.currentBatchId);
      endBatch();
      batchStateRef.current = {
        currentBatchId: null,
        currentActionType: null,
        currentObjectId: null,
      };
    }
  }, [endBatch]);

  const shouldStartBatch = useCallback((actionType: string, objectId: string) => {
    const current = batchStateRef.current;
    return !current.currentBatchId || 
           current.currentActionType !== actionType || 
           current.currentObjectId !== objectId;
  }, []);

  const getCurrentBatch = useCallback(() => {
    return batchStateRef.current;
  }, []);

  return {
    startInteractionBatch,
    endInteractionBatch,
    shouldStartBatch,
    getCurrentBatch,
  };
};
