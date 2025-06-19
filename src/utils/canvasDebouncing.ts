
/**
 * Canvas rendering debouncing utilities
 * Helps reduce excessive redraws during rapid interactions
 */

/**
 * Creates a debounced function that delays execution until after delay milliseconds
 * have elapsed since the last time it was invoked
 */
export const createDebouncer = (delay: number) => {
  let timeoutId: number | null = null;
  
  return (fn: () => void) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = window.setTimeout(fn, delay);
  };
};

/**
 * Creates a throttled function that limits execution to once per interval
 */
export const createThrottler = (interval: number) => {
  let lastExecution = 0;
  let timeoutId: number | null = null;
  
  return (fn: () => void) => {
    const now = Date.now();
    const timeSinceLastExecution = now - lastExecution;
    
    if (timeSinceLastExecution >= interval) {
      // Execute immediately if enough time has passed
      lastExecution = now;
      fn();
    } else {
      // Schedule execution for later if not enough time has passed
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      const remainingTime = interval - timeSinceLastExecution;
      timeoutId = window.setTimeout(() => {
        lastExecution = Date.now();
        fn();
        timeoutId = null;
      }, remainingTime);
    }
  };
};

/**
 * Creates a frame-rate limited function using requestAnimationFrame
 */
export const createFrameThrottler = () => {
  let frameId: number | null = null;
  let isScheduled = false;
  
  return (fn: () => void) => {
    if (isScheduled) return;
    
    isScheduled = true;
    frameId = requestAnimationFrame(() => {
      fn();
      isScheduled = false;
      frameId = null;
    });
  };
};

/**
 * Cleanup utility for all debouncing/throttling mechanisms
 */
export const createCleanupManager = () => {
  const cleanupFunctions: Array<() => void> = [];
  
  return {
    add: (cleanup: () => void) => cleanupFunctions.push(cleanup),
    cleanup: () => {
      cleanupFunctions.forEach(fn => fn());
      cleanupFunctions.length = 0;
    }
  };
};
