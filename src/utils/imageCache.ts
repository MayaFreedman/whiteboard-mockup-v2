
/**
 * Dedicated image cache manager for stamps and other images
 * Handles loading, caching, cleanup, and performance monitoring
 */

interface CacheEntry {
  image: HTMLImageElement;
  timestamp: number;
  hitCount: number;
  size: number; // estimated memory size
}

interface CacheStats {
  totalEntries: number;
  totalMemoryEstimate: number;
  hitCount: number;
  missCount: number;
  loadSuccessCount: number;
  loadFailureCount: number;
}

class ImageCacheManager {
  private cache = new Map<string, CacheEntry>();
  private loadingPromises = new Map<string, Promise<HTMLImageElement>>();
  private stats: CacheStats = {
    totalEntries: 0,
    totalMemoryEstimate: 0,
    hitCount: 0,
    missCount: 0,
    loadSuccessCount: 0,
    loadFailureCount: 0
  };
  
  // Configuration
  private readonly MAX_CACHE_SIZE = 50; // Maximum number of cached images
  private readonly MAX_MEMORY_MB = 100; // Maximum estimated memory usage in MB
  private readonly CLEANUP_INTERVAL = 30000; // 30 seconds
  private readonly MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes
  
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupInterval();
  }

  /**
   * Gets an image from cache or loads it
   */
  async getImage(src: string): Promise<HTMLImageElement | null> {
    // Check cache first
    const cached = this.cache.get(src);
    if (cached) {
      cached.hitCount++;
      cached.timestamp = Date.now();
      this.stats.hitCount++;
      
      console.log('🎯 Image cache hit:', {
        src: src.split('/').pop(),
        hitCount: cached.hitCount
      });
      
      return cached.image;
    }

    this.stats.missCount++;

    // Check if already loading
    const existingPromise = this.loadingPromises.get(src);
    if (existingPromise) {
      console.log('⏳ Image already loading:', src.split('/').pop());
      return existingPromise;
    }

    // Start loading
    const loadPromise = this.loadImage(src);
    this.loadingPromises.set(src, loadPromise);

    try {
      const image = await loadPromise;
      this.loadingPromises.delete(src);
      
      if (image) {
        this.cacheImage(src, image);
        this.stats.loadSuccessCount++;
      }
      
      return image;
    } catch (error) {
      this.loadingPromises.delete(src);
      this.stats.loadFailureCount++;
      console.warn('❌ Failed to load image:', src, error);
      return null;
    }
  }

  /**
   * Preloads multiple images (useful for stamp tool activation)
   */
  async preloadImages(sources: string[]): Promise<void> {
    console.log('🚀 Preloading images:', sources.length);
    
    const promises = sources.map(src => this.getImage(src));
    await Promise.allSettled(promises);
    
    console.log('✅ Image preloading complete');
  }

  /**
   * Loads a single image with proper error handling
   */
  private async loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      const cleanup = () => {
        img.onload = null;
        img.onerror = null;
      };

      img.onload = () => {
        cleanup();
        console.log('✅ Image loaded:', {
          src: src.split('/').pop(),
          dimensions: `${img.naturalWidth}x${img.naturalHeight}`
        });
        resolve(img);
      };

      img.onerror = (error) => {
        cleanup();
        console.warn('❌ Image load error:', src, error);
        reject(new Error(`Failed to load image: ${src}`));
      };

      // Handle SVG files and regular images the same way
      img.src = src;
      
      // Timeout fallback
      setTimeout(() => {
        if (!img.complete) {
          cleanup();
          reject(new Error(`Image load timeout: ${src}`));
        }
      }, 10000); // 10 second timeout
    });
  }

  /**
   * Caches a loaded image with size estimation
   */
  private cacheImage(src: string, image: HTMLImageElement): void {
    // Estimate memory usage (width * height * 4 bytes per pixel)
    const estimatedSize = (image.naturalWidth || 80) * (image.naturalHeight || 80) * 4;
    
    const entry: CacheEntry = {
      image,
      timestamp: Date.now(),
      hitCount: 1,
      size: estimatedSize
    };

    // Clean up before adding if necessary
    this.cleanupIfNeeded();

    this.cache.set(src, entry);
    this.stats.totalEntries++;
    this.stats.totalMemoryEstimate += estimatedSize;

    console.log('💾 Image cached:', {
      src: src.split('/').pop(),
      cacheSize: this.cache.size,
      memoryMB: Math.round(this.stats.totalMemoryEstimate / 1024 / 1024 * 100) / 100
    });
  }

  /**
   * Cleanup old or excess cache entries
   */
  private cleanupIfNeeded(): void {
    const now = Date.now();
    let cleaned = false;

    // Remove old entries
    for (const [src, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.MAX_AGE_MS) {
        this.cache.delete(src);
        this.stats.totalEntries--;
        this.stats.totalMemoryEstimate -= entry.size;
        cleaned = true;
      }
    }

    // Remove excess entries (least recently used)
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      const entries = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);
      
      const toRemove = entries.slice(0, entries.length - this.MAX_CACHE_SIZE);
      
      for (const [src, entry] of toRemove) {
        this.cache.delete(src);
        this.stats.totalEntries--;
        this.stats.totalMemoryEstimate -= entry.size;
        cleaned = true;
      }
    }

    // Remove if memory usage is too high (least hit entries first)
    const memoryMB = this.stats.totalMemoryEstimate / 1024 / 1024;
    if (memoryMB > this.MAX_MEMORY_MB) {
      const entries = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.hitCount - b.hitCount);
      
      for (const [src, entry] of entries) {
        this.cache.delete(src);
        this.stats.totalEntries--;
        this.stats.totalMemoryEstimate -= entry.size;
        
        const newMemoryMB = this.stats.totalMemoryEstimate / 1024 / 1024;
        if (newMemoryMB <= this.MAX_MEMORY_MB * 0.8) break; // Clean to 80% of limit
        cleaned = true;
      }
    }

    if (cleaned) {
      console.log('🧹 Image cache cleaned:', {
        size: this.cache.size,
        memoryMB: Math.round(this.stats.totalMemoryEstimate / 1024 / 1024 * 100) / 100
      });
    }
  }

  /**
   * Start automatic cleanup interval
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupIfNeeded();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { memoryMB: number } {
    return {
      ...this.stats,
      memoryMB: Math.round(this.stats.totalMemoryEstimate / 1024 / 1024 * 100) / 100
    };
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.loadingPromises.clear();
    this.stats = {
      totalEntries: 0,
      totalMemoryEstimate: 0,
      hitCount: 0,
      missCount: 0,
      loadSuccessCount: 0,
      loadFailureCount: 0
    };
    console.log('🗑️ Image cache cleared completely');
  }

  /**
   * Cleanup on destroy
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

// Export singleton instance
export const imageCache = new ImageCacheManager();

// Preload common stamp images when stamp tool is selected
export const preloadStampImages = async (): Promise<void> => {
  const commonStamps = [
    '/src/assets/Animals.svg',
    '/src/assets/Plants.svg',
    '/src/assets/Vehicles.svg',
    '/src/assets/fantasy.svg',
    '/src/assets/religious.svg',
    '/src/assets/sports.svg'
  ];
  
  await imageCache.preloadImages(commonStamps);
};
