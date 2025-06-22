
import { useCallback, useRef } from 'react';
import { useWhiteboardStore } from '../stores/whiteboardStore';

interface BatchingOptions {
  batchTimeout?: number; // Time in ms to wait before ending batch
  maxBatchSize?: number; // Maximum actions per batch
}

export const useActionBatching = (options: BatchingOptions = {}) => {
  const store = useWhiteboardStore();
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { batchTimeout = 1000, maxBatchSize = 50 } = options;

  const startBatch = useCallback((actionType: string, objectId: string, userId?: string) => {
    // Clear any existing timeout
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }

    const batchId = store.startActionBatch(actionType, objectId, userId);
    
    // Set timeout to auto-end batch
    batchTimeoutRef.current = setTimeout(() => {
      console.log('🎯 Auto-ending batch due to timeout');
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
      console.log('🎯 Auto-ending batch due to size limit');
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
