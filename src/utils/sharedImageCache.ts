/**
 * Shared image cache system for both preloader and canvas rendering
 * Prevents duplicate loading and ensures consistent caching
 */

// Global shared cache for images
const globalImageCache = new Map<string, HTMLImageElement>();
const globalLoadingImages = new Set<string>();
const globalFailedImages = new Set<string>();

export interface ImageCacheResult {
  image: HTMLImageElement | null;
  isLoading: boolean;
  hasFailed: boolean;
}

/**
 * Gets an image from the shared cache
 */
export function getCachedImage(path: string): ImageCacheResult {
  const normalizedPath = normalizePath(path);
  
  return {
    image: globalImageCache.get(normalizedPath) || null,
    isLoading: globalLoadingImages.has(normalizedPath),
    hasFailed: globalFailedImages.has(normalizedPath)
  };
}

/**
 * Adds an image to the shared cache
 */
export function setCachedImage(path: string, image: HTMLImageElement): void {
  const normalizedPath = normalizePath(path);
  globalImageCache.set(normalizedPath, image);
  globalLoadingImages.delete(normalizedPath);
  globalFailedImages.delete(normalizedPath);
  
  console.log(`✅ Cached image: ${normalizedPath} (cache size: ${globalImageCache.size})`);
}

/**
 * Marks an image as currently loading
 */
export function setImageLoading(path: string): void {
  const normalizedPath = normalizePath(path);
  globalLoadingImages.add(normalizedPath);
}

/**
 * Marks an image as failed to load
 */
export function setImageFailed(path: string, error?: any): void {
  const normalizedPath = normalizePath(path);
  globalLoadingImages.delete(normalizedPath);
  globalFailedImages.add(normalizedPath);
  
  console.warn(`❌ Image failed to load: ${normalizedPath}`, error);
}

/**
 * Normalizes image paths for consistent caching
 */
function normalizePath(path: string): string {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

/**
 * Gets cache statistics for debugging
 */
export function getCacheStats() {
  return {
    cached: globalImageCache.size,
    loading: globalLoadingImages.size,
    failed: globalFailedImages.size,
    cachedPaths: Array.from(globalImageCache.keys()),
    loadingPaths: Array.from(globalLoadingImages),
    failedPaths: Array.from(globalFailedImages)
  };
}

/**
 * Clears all caches (for debugging/testing)
 */
export function clearAllCaches(): void {
  globalImageCache.clear();
  globalLoadingImages.clear();
  globalFailedImages.clear();
  console.log('🧹 All image caches cleared');
}