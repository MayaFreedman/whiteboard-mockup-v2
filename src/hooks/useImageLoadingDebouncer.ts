/**
 * Custom hook for debouncing image loading to prevent cascade redraws
 */
import { useCallback, useRef } from 'react';

const DEBOUNCE_DELAY = 100; // 100ms debounce for image loading
const CIRCUIT_BREAKER_THRESHOLD = 10; // Max redraws in time window
const CIRCUIT_BREAKER_WINDOW = 1000; // 1 second window

export const useImageLoadingDebouncer = (redrawCanvas: () => void) => {
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingImageLoads = useRef<Set<string>>(new Set());
  const redrawCallsRef = useRef<number[]>([]);

  // Circuit breaker to prevent infinite redraw loops
  const isCircuitBreakerTripped = useCallback(() => {
    const now = Date.now();
    // Remove old calls outside the window
    redrawCallsRef.current = redrawCallsRef.current.filter(
      timestamp => now - timestamp < CIRCUIT_BREAKER_WINDOW
    );
    
    // Check if we're hitting the threshold
    const isTripped = redrawCallsRef.current.length >= CIRCUIT_BREAKER_THRESHOLD;
    
    if (isTripped) {
      console.warn('🚨 Canvas redraw circuit breaker tripped! Preventing excessive redraws.');
    }
    
    return isTripped;
  }, []);

  const debouncedImageRedraw = useCallback((imageUrl: string) => {
    // Don't trigger redraws if circuit breaker is tripped
    if (isCircuitBreakerTripped()) {
      return;
    }

    pendingImageLoads.current.add(imageUrl);
    
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Set new timeout
    debounceTimeoutRef.current = setTimeout(() => {
      if (pendingImageLoads.current.size > 0) {
        console.log('🖼️ Batch redrawing canvas for', pendingImageLoads.current.size, 'loaded images');
        
        // Record redraw call for circuit breaker
        redrawCallsRef.current.push(Date.now());
        
        // Clear pending loads and trigger redraw
        pendingImageLoads.current.clear();
        redrawCanvas();
      }
      debounceTimeoutRef.current = null;
    }, DEBOUNCE_DELAY);
  }, [redrawCanvas, isCircuitBreakerTripped]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
    pendingImageLoads.current.clear();
  }, []);

  return {
    debouncedImageRedraw,
    cleanup,
    isCircuitBreakerTripped
  };
};