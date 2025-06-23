
/**
 * Robust image cache utility for handling SVG and regular images
 * Persists across component lifecycles and prevents race conditions
 */

interface ImageCacheEntry {
  image: HTMLImageElement;
  status: 'loaded' | 'loading' | 'error';
  timestamp: number;
}

class ImageCacheManager {
  private cache = new Map<string, ImageCacheEntry>();
  private loadingPromises = new Map<string, Promise<HTMLImageElement>>();
  private maxCacheSize = 100;
  private maxAge = 5 * 60 * 1000; // 5 minutes

  /**
   * Converts src paths to proper URLs that work in both dev and production
   */
  private resolveImageUrl(src: string): string {
    // If it starts with /src/assets/, convert it to a proper import
    if (src.startsWith('/src/assets/')) {
      const assetPath = src.replace('/src/assets/', '');
      // In Vite, we need to import the asset to get the correct URL
      // For now, we'll try to convert it to a relative path
      return `./src/assets/${assetPath}`;
    }
    return src;
  }

  /**
   * Gets a cached image or loads it if not cached
   */
  async getImage(src: string): Promise<HTMLImageElement | null> {
    const resolvedSrc = this.resolveImageUrl(src);
    
    // Check if we have a valid cached entry
    const cached = this.cache.get(resolvedSrc);
    if (cached && cached.status === 'loaded' && this.isEntryValid(cached)) {
      return cached.image;
    }

    // Check if we're already loading this image
    if (this.loadingPromises.has(resolvedSrc)) {
      try {
        return await this.loadingPromises.get(resolvedSrc)!;
      } catch (error) {
        console.warn('Failed to load image from existing promise:', resolvedSrc, error);
        return null;
      }
    }

    // Start loading the image
    const loadPromise = this.loadImage(resolvedSrc);
    this.loadingPromises.set(resolvedSrc, loadPromise);

    try {
      const image = await loadPromise;
      this.loadingPromises.delete(resolvedSrc);
      return image;
    } catch (error) {
      this.loadingPromises.delete(resolvedSrc);
      console.warn('Failed to load image:', resolvedSrc, error);
      return null;
    }
  }

  /**
   * Gets a cached image synchronously if available
   */
  getCachedImage(src: string): HTMLImageElement | null {
    const resolvedSrc = this.resolveImageUrl(src);
    const cached = this.cache.get(resolvedSrc);
    if (cached && cached.status === 'loaded' && this.isEntryValid(cached)) {
      return cached.image;
    }
    return null;
  }

  /**
   * Checks if we're currently loading an image
   */
  isLoading(src: string): boolean {
    const resolvedSrc = this.resolveImageUrl(src);
    return this.loadingPromises.has(resolvedSrc);
  }

  /**
   * Loads an image and caches it
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
        
        // Cache the loaded image
        this.cache.set(src, {
          image: img,
          status: 'loaded',
          timestamp: Date.now()
        });
        
        this.cleanupOldEntries();
        resolve(img);
      };

      img.onerror = (error) => {
        cleanup();
        
        // Cache the error to prevent repeated attempts
        this.cache.set(src, {
          image: img,
          status: 'error',
          timestamp: Date.now()
        });
        
        reject(new Error(`Failed to load image: ${src}`));
      };

      // Handle SVG files specially - try dynamic import first, then fetch
      if (src.endsWith('.svg')) {
        this.loadSvgImage(img, src).catch(reject);
      } else {
        img.src = src;
      }
    });
  }

  /**
   * Loads SVG images with better path resolution
   */
  private async loadSvgImage(img: HTMLImageElement, src: string): Promise<void> {
    try {
      // Try to dynamically import the SVG first (works better with Vite)
      if (src.startsWith('./src/assets/')) {
        try {
          const module = await import(/* @vite-ignore */ src);
          img.src = module.default || src;
          return;
        } catch (importError) {
          console.log('Dynamic import failed, trying fetch:', importError);
        }
      }
      
      // Fallback to fetch
      const response = await fetch(src);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const svgText = await response.text();
      const blob = new Blob([svgText], { type: 'image/svg+xml' });
      const blobUrl = URL.createObjectURL(blob);
      
      // Set up cleanup for blob URL
      const originalOnload = img.onload;
      img.onload = (event) => {
        URL.revokeObjectURL(blobUrl);
        if (originalOnload) {
          originalOnload.call(img, event);
        }
      };
      
      const originalOnerror = img.onerror;
      img.onerror = (event) => {
        URL.revokeObjectURL(blobUrl);
        if (originalOnerror) {
          originalOnerror.call(img, event);
        }
      };
      
      img.src = blobUrl;
    } catch (error) {
      throw new Error(`Failed to fetch SVG: ${error}`);
    }
  }

  /**
   * Checks if a cache entry is still valid
   */
  private isEntryValid(entry: ImageCacheEntry): boolean {
    const age = Date.now() - entry.timestamp;
    return age < this.maxAge && entry.status === 'loaded';
  }

  /**
   * Removes old entries to prevent memory leaks
   */
  private cleanupOldEntries(): void {
    if (this.cache.size <= this.maxCacheSize) return;

    const entries = Array.from(this.cache.entries());
    entries.sort(([, a], [, b]) => a.timestamp - b.timestamp);
    
    const toRemove = entries.slice(0, entries.length - this.maxCacheSize);
    toRemove.forEach(([src]) => {
      this.cache.delete(src);
    });
  }

  /**
   * Clears the entire cache
   */
  clearCache(): void {
    this.cache.clear();
    this.loadingPromises.clear();
  }

  /**
   * Gets cache statistics
   */
  getStats(): { size: number; loading: number; maxSize: number } {
    return {
      size: this.cache.size,
      loading: this.loadingPromises.size,
      maxSize: this.maxCacheSize
    };
  }
}

// Export singleton instance
export const imageCache = new ImageCacheManager();
