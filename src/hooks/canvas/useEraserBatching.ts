
import { useRef, useCallback } from 'react';
import { nanoid } from 'nanoid';
import { useActionBatching } from '../useActionBatching';

/**
 * Specialized hook for eraser action batching
 * Ensures one eraser stroke = one undo/redo entry
 */
export const useEraserBatching = () => {
  const strokeIdRef = useRef<string | null>(null);
  const batchIdRef = useRef<string | null>(null);
  
  // Use eraser-specific batching configuration with smaller but optimized sizes
  const actionBatching = useActionBatching({
    batchTimeout: 2000, // Reduced from 3000ms to 2000ms
    maxBatchSize: 200,  // Reduced from 500 to 200
    isEraserBatch: true
  });

  const startEraserStroke = useCallback((userId?: string) => {
    // Generate a unique stroke ID for this eraser session
    strokeIdRef.current = nanoid();
    const strokeObjectId = `eraser-stroke-${strokeIdRef.current}`;
    
    // Start the batch with the consistent stroke ID
    batchIdRef.current = actionBatching.startBatch('ERASE_PATH', strokeObjectId, userId);
    
    
    return {
      strokeId: strokeIdRef.current,
      batchId: batchIdRef.current
    };
  }, [actionBatching]);

  const endEraserStroke = useCallback(() => {
    if (batchIdRef.current && strokeIdRef.current) {
      actionBatching.endBatch();
      
      
      strokeIdRef.current = null;
      batchIdRef.current = null;
    }
  }, [actionBatching]);

  const getCurrentStrokeId = useCallback(() => {
    return strokeIdRef.current;
  }, []);

  const isStrokeActive = useCallback(() => {
    return strokeIdRef.current !== null && batchIdRef.current !== null;
  }, []);

  return {
    startEraserStroke,
    endEraserStroke,
    getCurrentStrokeId,
    isStrokeActive
  };
};
