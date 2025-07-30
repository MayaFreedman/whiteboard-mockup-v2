/**
 * Canvas and image memory management utilities
 */

// Track canvases for cleanup
const canvasRegistry = new Set<HTMLCanvasElement>();
const blobUrlRegistry = new Set<string>();

/**
 * Register a canvas for cleanup tracking
 */
export const registerCanvas = (canvas: HTMLCanvasElement) => {
  canvasRegistry.add(canvas);
};

/**
 * Unregister and cleanup a canvas
 */
export const unregisterCanvas = (canvas: HTMLCanvasElement) => {
  canvasRegistry.delete(canvas);
  
  // Clear canvas context to free memory
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  
  // Reset canvas dimensions to minimum to free GPU memory
  canvas.width = 1;
  canvas.height = 1;
};

/**
 * Register a blob URL for cleanup
 */
export const registerBlobUrl = (url: string) => {
  if (url.startsWith('blob:')) {
    blobUrlRegistry.add(url);
  }
};

/**
 * Cleanup a specific blob URL
 */
export const cleanupBlobUrl = (url: string) => {
  if (blobUrlRegistry.has(url)) {
    URL.revokeObjectURL(url);
    blobUrlRegistry.delete(url);
  }
};

/**
 * Cleanup all registered blob URLs
 */
export const cleanupAllBlobUrls = () => {
  blobUrlRegistry.forEach(url => {
    URL.revokeObjectURL(url);
  });
  blobUrlRegistry.clear();
};

/**
 * Cleanup all registered canvases
 */
export const cleanupAllCanvases = () => {
  canvasRegistry.forEach(canvas => {
    unregisterCanvas(canvas);
  });
  canvasRegistry.clear();
};

/**
 * Get memory usage statistics
 */
export const getMemoryStats = () => {
  return {
    canvasCount: canvasRegistry.size,
    blobUrlCount: blobUrlRegistry.size,
    registeredUrls: Array.from(blobUrlRegistry)
  };
};

/**
 * Enhanced image cache with size limits and LRU eviction
 */
class ImageCacheManager {
  private cache = new Map<string, { image: HTMLImageElement; lastUsed: number; size: number }>();
  private maxSize = 50 * 1024 * 1024; // 50MB limit
  private maxEntries = 100;
  private currentSize = 0;

  get(src: string): HTMLImageElement | null {
    const entry = this.cache.get(src);
    if (entry) {
      entry.lastUsed = Date.now();
      return entry.image;
    }
    return null;
  }

  set(src: string, image: HTMLImageElement) {
    // Estimate image size (rough approximation)
    const size = (image.naturalWidth || 100) * (image.naturalHeight || 100) * 4; // 4 bytes per pixel

    // Remove existing entry if updating
    if (this.cache.has(src)) {
      const existing = this.cache.get(src)!;
      this.currentSize -= existing.size;
    }

    // Evict entries if needed
    this.evictIfNeeded(size);

    // Add new entry
    this.cache.set(src, {
      image,
      lastUsed: Date.now(),
      size
    });
    this.currentSize += size;
  }

  private evictIfNeeded(newSize: number) {
    // Check if we need to evict based on count or size
    while (
      this.cache.size >= this.maxEntries || 
      this.currentSize + newSize > this.maxSize
    ) {
      // Find least recently used entry
      let oldestKey = '';
      let oldestTime = Date.now();

      for (const [key, entry] of this.cache.entries()) {
        if (entry.lastUsed < oldestTime) {
          oldestTime = entry.lastUsed;
          oldestKey = key;
        }
      }

      if (oldestKey) {
        const removed = this.cache.get(oldestKey)!;
        this.cache.delete(oldestKey);
        this.currentSize -= removed.size;
        console.log('📦 Evicted image from cache:', oldestKey);
      } else {
        break; // Safety break
      }
    }
  }

  clear() {
    this.cache.clear();
    this.currentSize = 0;
  }

  getStats() {
    return {
      entries: this.cache.size,
      totalSize: this.currentSize,
      maxSize: this.maxSize,
      maxEntries: this.maxEntries
    };
  }
}

export const imageCache = new ImageCacheManager();