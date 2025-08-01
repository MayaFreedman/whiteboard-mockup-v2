
import { useCallback, useRef } from 'react';
import { useWhiteboardStore } from '../stores/whiteboardStore';

interface BatchingOptions {
  batchTimeout?: number; // Time in ms to wait before ending batch
  maxBatchSize?: number; // Maximum actions per batch
  isEraserBatch?: boolean; // Special handling for eraser operations
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
    
    // Set timeout to auto-end batch (longer for eraser operations)
    const timeout = isEraserBatch ? batchTimeout * 3 : batchTimeout;
    batchTimeoutRef.current = setTimeout(() => {
      store.endActionBatch();
      batchTimeoutRef.current = null;
    }, timeout);

    return batchId;
  }, [store, batchTimeout, isEraserBatch]);

  const endBatch = useCallback(() => {
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
      batchTimeoutRef.current = null;
    }
    store.endActionBatch();
  }, [store]);

  const checkBatchSize = useCallback(() => {
    const currentBatch = store.getState().currentBatch;
    // For eraser operations, use much higher limits and don't auto-end during stroke
    const effectiveMaxSize = isEraserBatch ? maxBatchSize * 10 : maxBatchSize;
    
    if (currentBatch.actions.length >= effectiveMaxSize) {
      endBatch();
      return true;
    }
    return false;
  }, [store, maxBatchSize, endBatch, isEraserBatch]);

  return {
    startBatch,
    endBatch,
    checkBatchSize,
  };
};
