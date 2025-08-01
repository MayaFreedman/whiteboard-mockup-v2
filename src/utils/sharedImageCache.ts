/**
 * Central image cache system - single source of truth for all image loading
 * Handles loading, caching, error handling, and timeouts for all image requests
 */

// Global shared cache for images
const globalImageCache = new Map<string, HTMLImageElement>();
const globalLoadingImages = new Set<string>();
const globalFailedImages = new Set<string>();

const IMAGE_LOAD_TIMEOUT = 10000; // 10 seconds timeout

export interface ImageCacheResult {
  image: HTMLImageElement | null;
  isLoading: boolean;
  hasFailed: boolean;
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
 * Loads an image with full error handling, timeout, and SVG support
 * This is the ONLY function that should load images
 */
export async function loadImage(path: string): Promise<HTMLImageElement | null> {
  const normalizedPath = normalizePath(path);
  
  // Check if already cached
  const cached = getCachedImage(normalizedPath);
  if (cached.image) {
    console.log(`🎯 Cache HIT: ${normalizedPath}`);
    return cached.image;
  }
  
  if (cached.hasFailed) {
    console.log(`🚫 Previously failed: ${normalizedPath}`);
    return null;
  }
  
  if (cached.isLoading) {
    console.log(`⏳ Already loading: ${normalizedPath}`);
    return null;
  }
  
  console.log(`📥 Loading image: ${normalizedPath}`);
  globalLoadingImages.add(normalizedPath);
  
  try {
    const img = new Image();
    
    return new Promise((resolve, reject) => {
      let resolved = false;
      
      // Set up timeout
      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          globalLoadingImages.delete(normalizedPath);
          globalFailedImages.add(normalizedPath);
          console.warn(`⏰ Image load timeout: ${normalizedPath}`);
          reject(new Error(`Image load timeout: ${normalizedPath}`));
        }
      }, IMAGE_LOAD_TIMEOUT);
      
      img.onload = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          globalImageCache.set(normalizedPath, img);
          globalLoadingImages.delete(normalizedPath);
          console.log(`✅ Image loaded and cached: ${normalizedPath}`);
          resolve(img);
        }
      };
      
      img.onerror = (error) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          globalLoadingImages.delete(normalizedPath);
          globalFailedImages.add(normalizedPath);
          console.warn(`❌ Image load failed: ${normalizedPath}`, error);
          reject(new Error(`Failed to load image: ${normalizedPath}`));
        }
      };
      
      // Handle SVG files with special processing
      if (normalizedPath.endsWith('.svg')) {
        console.log(`🔍 SVG detected, fetching: ${normalizedPath}`);
        fetch(normalizedPath)
          .then(response => {
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.text();
          })
          .then(svgText => {
            console.log(`📄 SVG content fetched for: ${normalizedPath}`);
            const blob = new Blob([svgText], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            
            // Override handlers for SVG blob URL
            const originalOnload = img.onload;
            const originalOnerror = img.onerror;
            
            img.onload = (e) => {
              URL.revokeObjectURL(url);
              if (originalOnload) originalOnload.call(img, e);
            };
            
            img.onerror = (e) => {
              URL.revokeObjectURL(url);
              if (originalOnerror) originalOnerror.call(img, e);
            };
            
            img.src = url;
          })
          .catch(error => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeoutId);
              globalLoadingImages.delete(normalizedPath);
              globalFailedImages.add(normalizedPath);
              console.error(`❌ SVG fetch failed: ${normalizedPath}`, error);
              reject(error);
            }
          });
      } else {
        img.src = normalizedPath;
      }
    });
  } catch (error) {
    globalLoadingImages.delete(normalizedPath);
    globalFailedImages.add(normalizedPath);
    console.error(`❌ Image load error: ${normalizedPath}`, error);
    return null;
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