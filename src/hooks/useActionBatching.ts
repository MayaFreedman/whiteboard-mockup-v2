
import { useCallback } from 'react';
import { useWhiteboardStore } from '../stores/whiteboardStore';
import { batchManager } from '../services/BatchManager';

interface BatchingOptions {
  batchTimeout?: number;
  maxBatchSize?: number; 
  isEraserBatch?: boolean;
}

export const useActionBatching = (options: BatchingOptions = {}) => {
  const store = useWhiteboardStore();

  const startBatch = useCallback((actionType: string, objectId: string, userId?: string) => {
    return store.startActionBatch(actionType, objectId, userId);
  }, [store]);

  const endBatch = useCallback(() => {
    store.endActionBatch();
  }, [store]);

  const checkBatchSize = useCallback(() => {
    const currentBatch = store.getCurrentBatch();
    const { maxBatchSize = 50, isEraserBatch = false } = options;
    
    const effectiveMaxSize = isEraserBatch ? maxBatchSize * 10 : maxBatchSize;
    
    if (currentBatch.actions.length >= effectiveMaxSize) {
      console.log('🎯 Auto-ending batch due to size limit');
      endBatch();
      return true;
    }
    return false;
  }, [endBatch, options]);

  return {
    startBatch,
    endBatch,
    checkBatchSize,
  };
};
