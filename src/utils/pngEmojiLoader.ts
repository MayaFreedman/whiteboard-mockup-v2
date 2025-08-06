/**
 * PNG emoji loading utilities for category-based lazy loading
 * Optimized for 3,757 PNG emojis with memory management
 */

import { setCachedImage, setImageLoading, setImageFailed, getCachedImage } from './sharedImageCache';

const LOAD_TIMEOUT = 5000; // 5 seconds timeout per image
const MAX_CONCURRENT_LOADS = 12; // Load more PNGs concurrently (they're faster than SVGs)

interface LoadResult {
  path: string;
  success: boolean;
  error?: string;
}

/**
 * Loads a single PNG image with caching
 */
async function loadPngImage(path: string): Promise<LoadResult> {
  // Check shared cache first
  const cached = getCachedImage(path);
  if (cached.image) {
    return { path, success: true };
  }
  if (cached.hasFailed) {
    return { path, success: false, error: 'previously_failed' };
  }
  if (cached.isLoading) {
    return { path, success: false, error: 'already_loading' };
  }

  return new Promise((resolve) => {
    const img = new Image();
    let resolved = false;
    
    setImageLoading(path);
    
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        setImageFailed(path, 'timeout');
        resolve({ path, success: false, error: 'timeout' });
      }
    }, LOAD_TIMEOUT);
    
    img.onload = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        setCachedImage(path, img);
        resolve({ path, success: true });
      }
    };
    
    img.onerror = (error) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        setImageFailed(path, error);
        resolve({ path, success: false, error: 'load_error' });
      }
    };
    
    img.src = path;
  });
}

/**
 * Loads a batch of PNG images concurrently
 */
export async function loadPngBatch(paths: string[]): Promise<LoadResult[]> {
  const results: LoadResult[] = [];
  
  for (let i = 0; i < paths.length; i += MAX_CONCURRENT_LOADS) {
    const batch = paths.slice(i, i + MAX_CONCURRENT_LOADS);
    const batchPromises = batch.map(path => loadPngImage(path));
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * Preloads emojis for a specific category
 * Used when user opens a category for the first time
 */
export async function preloadCategoryEmojis(paths: string[]): Promise<void> {
  console.log(`🎯 Preloading ${paths.length} emojis for category`);
  
  const results = await loadPngBatch(paths);
  const success = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Category preload: ${success} success, ${failed} failed`);
  
  if (failed > 0) {
    const failedPaths = results.filter(r => !r.success).map(r => r.path);
    console.warn('❌ Some category emojis failed to load:', failedPaths.slice(0, 5));
  }
}

/**
 * Checks if an image is already cached
 */
export function isPngCached(path: string): boolean {
  const cached = getCachedImage(path);
  return !!cached.image;
}

/**
 * Gets the loading status of an image
 */
export function getPngLoadingStatus(path: string): 'cached' | 'loading' | 'failed' | 'not_loaded' {
  const cached = getCachedImage(path);
  if (cached.image) return 'cached';
  if (cached.isLoading) return 'loading';
  if (cached.hasFailed) return 'failed';
  return 'not_loaded';
}