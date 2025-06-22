
import { useCallback, useRef } from 'react';
import { useWhiteboardStore } from '../stores/whiteboardStore';

interface BatchingOptions {
  batchTimeout?: number;
  maxBatchSize?: number;
  isEraserBatch?: boolean;
}

export const useActionBatching = (options: BatchingOptions = {}) => {
  const store = useWhiteboardStore();
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { batchTimeout = 1000, maxBatchSize = 50, isEraserBatch = false } = options;

  const startBatch = useCallback((actionType: string, objectId: string, userId?: string) => {
    // Clear any existing timeout
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }

    const batchId = store.startActionBatch(actionType, objectId, userId);
    
    // Set timeout for batch completion
    batchTimeoutRef.current = setTimeout(() => {
      store.endActionBatch();
      batchTimeoutRef.current = null;
    }, batchTimeout);

    return batchId;
  }, [store, batchTimeout]);

  const endBatch = useCallback(() => {
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
      batchTimeoutRef.current = null;
    }
    store.endActionBatch();
  }, [store]);

  const checkBatchSize = useCallback(() => {
    const currentBatch = store.getState().currentBatch;
    
    if (currentBatch.actions.length >= maxBatchSize) {
      endBatch();
      return true;
    }
    return false;
  }, [store, maxBatchSize, endBatch]);

  return {
    startBatch,
    endBatch,
    checkBatchSize,
  };
};
