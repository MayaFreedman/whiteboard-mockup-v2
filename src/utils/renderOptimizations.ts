
/**
 * Utility functions for optimizing rendering performance
 * These help reduce glitchiness without impacting core performance
 */

/**
 * Creates a debounced function that delays execution until after a specified delay
 * @param func Function to debounce
 * @param delay Delay in milliseconds
 * @returns Debounced function
 */
export const createDebouncer = <T extends (...args: any[]) => void>(
  func: T,
  delay: number
): T => {
  let timeoutId: number | null = null;
  
  return ((...args: any[]) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = window.setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, delay);
  }) as T;
};

/**
 * Creates a throttled function that limits execution to once per specified interval
 * @param func Function to throttle
 * @param interval Interval in milliseconds
 * @returns Throttled function
 */
export const createThrottler = <T extends (...args: any[]) => void>(
  func: T,
  interval: number
): T => {
  let lastExecution = 0;
  let timeoutId: number | null = null;
  
  return ((...args: any[]) => {
    const now = Date.now();
    
    if (now - lastExecution >= interval) {
      func(...args);
      lastExecution = now;
    } else if (!timeoutId) {
      // Schedule execution at the end of the interval
      timeoutId = window.setTimeout(() => {
        func(...args);
        lastExecution = Date.now();
        timeoutId = null;
      }, interval - (now - lastExecution));
    }
  }) as T;
};

/**
 * Creates a frame-based renderer that uses requestAnimationFrame for smooth updates
 * @param renderFunc Function to call for rendering
 * @returns Optimized render function
 */
export const createFrameRenderer = (renderFunc: () => void) => {
  let frameId: number | null = null;
  
  return () => {
    if (frameId) {
      return; // Already scheduled
    }
    
    frameId = requestAnimationFrame(() => {
      renderFunc();
      frameId = null;
    });
  };
};

/**
 * Path interpolation cache for consistent smoothing
 */
class PathInterpolationCache {
  private cache = new Map<string, Array<{x: number, y: number}>>();
  private maxCacheSize = 100;
  
  getCachedInterpolation(key: string): Array<{x: number, y: number}> | null {
    return this.cache.get(key) || null;
  }
  
  setCachedInterpolation(key: string, points: Array<{x: number, y: number}>): void {
    // Simple LRU: remove oldest entries if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    
    this.cache.set(key, points);
  }
  
  clearCache(): void {
    this.cache.clear();
  }
}

export const pathInterpolationCache = new PathInterpolationCache();
