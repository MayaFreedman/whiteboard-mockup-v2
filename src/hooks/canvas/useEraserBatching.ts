
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
  
  // Use eraser-specific batching configuration
  const actionBatching = useActionBatching({
    batchTimeout: 3000, // Longer timeout for eraser strokes
    maxBatchSize: 500,  // Much higher limit for eraser operations
    isEraserBatch: true
  });

  const startEraserStroke = useCallback((userId?: string) => {
    // Generate a unique stroke ID for this eraser session
    strokeIdRef.current = nanoid();
    const strokeObjectId = `eraser-stroke-${strokeIdRef.current}`;
    
    // Start the batch with the consistent stroke ID
    batchIdRef.current = actionBatching.startBatch('ERASE_PATH', strokeObjectId, userId);
    
    console.log('🧹 Started eraser stroke batch:', {
      strokeId: strokeIdRef.current.slice(0, 8),
      batchId: batchIdRef.current.slice(0, 8)
    });
    
    return {
      strokeId: strokeIdRef.current,
      batchId: batchIdRef.current
    };
  }, [actionBatching]);

  const endEraserStroke = useCallback(() => {
    if (batchIdRef.current && strokeIdRef.current) {
      actionBatching.endBatch();
      
      console.log('🧹 Ended eraser stroke batch:', {
        strokeId: strokeIdRef.current.slice(0, 8),
        batchId: batchIdRef.current.slice(0, 8)
      });
      
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
