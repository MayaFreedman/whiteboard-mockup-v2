/**
 * Progressive image loading utility for optimized emoji loading
 * Only loads images when they become visible (intersection observer)
 */

import { setCachedImage, setImageLoading, setImageFailed, getCachedImage } from './sharedImageCache';

const LOAD_TIMEOUT = 3000; // 3 seconds timeout per image
const MAX_CONCURRENT_LOADS = 6; // Reduced concurrent loads for progressive loading

// Queue for managing progressive loading requests
const loadingQueue = new Set<string>();
let activeLoads = 0;

interface ProgressiveLoadResult {
  path: string;
  success: boolean;
  error?: string;
}

/**
 * Loads a single image progressively with queue management
 */
export async function loadProgressiveImage(path: string): Promise<ProgressiveLoadResult> {
  // Check shared cache first
  const cached = getCachedImage(path);
  if (cached.image) {
    return { path, success: true };
  }
  if (cached.hasFailed) {
    return { path, success: false, error: 'previously_failed' };
  }
  if (cached.isLoading || loadingQueue.has(path)) {
    return { path, success: false, error: 'already_loading' };
  }

  // Add to queue
  loadingQueue.add(path);
  
  // Wait for available slot if at capacity
  while (activeLoads >= MAX_CONCURRENT_LOADS) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  activeLoads++;
  setImageLoading(path);
  
  return new Promise((resolve) => {
    const img = new Image();
    let resolved = false;
    
    const cleanup = () => {
      loadingQueue.delete(path);
      activeLoads--;
    };
    
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        setImageFailed(path, 'timeout');
        resolve({ path, success: false, error: 'timeout' });
      }
    }, LOAD_TIMEOUT);
    
    img.onload = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        cleanup();
        setCachedImage(path, img);
        resolve({ path, success: true });
      }
    };
    
    img.onerror = (error) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        cleanup();
        setImageFailed(path, error);
        resolve({ path, success: false, error: 'load_error' });
      }
    };
    
    img.src = path;
  });
}

/**
 * Batch load multiple images progressively
 * Used for preloading visible items
 */
export async function loadProgressiveBatch(paths: string[]): Promise<ProgressiveLoadResult[]> {
  const promises = paths.map(path => loadProgressiveImage(path));
  return Promise.all(promises);
}

/**
 * Get current loading queue statistics
 */
export function getProgressiveLoadStats() {
  return {
    queueSize: loadingQueue.size,
    activeLoads,
    maxConcurrent: MAX_CONCURRENT_LOADS
  };
}

/**
 * Clear the loading queue (for debugging/cleanup)
 */
export function clearProgressiveQueue() {
  loadingQueue.clear();
  activeLoads = 0;
}