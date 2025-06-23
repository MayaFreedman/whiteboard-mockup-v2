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
  private async resolveImageUrl(src: string): Promise<string> {
    // If it starts with /src/assets/, we need to use Vite's import system
    if (src.startsWith('/src/assets/')) {
      const assetPath = src.replace('/src/assets/', '');
      
      // Try to dynamically import the asset to get the correct URL
      try {
        let assetUrl: string;
        
        // Handle specific known assets
        switch (assetPath) {
          case 'Animals.svg':
            assetUrl = (await import('../assets/Animals.svg')).default;
            break;
          case 'Plants.svg':
            assetUrl = (await import('../assets/Plants.svg')).default;
            break;
          case 'Vehicles.svg':
            assetUrl = (await import('../assets/Vehicles.svg')).default;
            break;
          case 'fantasy.svg':
            assetUrl = (await import('../assets/fantasy.svg')).default;
            break;
          case 'religious.svg':
            assetUrl = (await import('../assets/religious.svg')).default;
            break;
          case 'sports.svg':
            assetUrl = (await import('../assets/sports.svg')).default;
            break;
          default:
            // For background assets or other paths
            if (assetPath.startsWith('backgrounds/')) {
              const bgName = assetPath.replace('backgrounds/', '');
              switch (bgName) {
                case 'brick-wall.svg':
                  assetUrl = (await import('../assets/backgrounds/brick-wall.svg')).default;
                  break;
                case 'bubbles.svg':
                  assetUrl = (await import('../assets/backgrounds/bubbles.svg')).default;
                  break;
                case 'i-like-food.svg':
                  assetUrl = (await import('../assets/backgrounds/i-like-food.svg')).default;
                  break;
                case 'topography.svg':
                  assetUrl = (await import('../assets/backgrounds/topography.svg')).default;
                  break;
                default:
                  console.warn('Unknown background asset:', bgName);
                  return src;
              }
            } else {
              console.warn('Unknown asset:', assetPath);
              return src;
            }
        }
        
        console.log('✅ Resolved asset URL:', { original: src, resolved: assetUrl });
        return assetUrl;
      } catch (error) {
        console.warn('Failed to resolve asset:', src, error);
        return src;
      }
    }
    return src;
  }

  /**
   * Gets a cached image or loads it if not cached
   */
  async getImage(src: string): Promise<HTMLImageElement | null> {
    const resolvedSrc = await this.resolveImageUrl(src);
    
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
    // For synchronous access, we can't resolve the URL, so try both original and common resolved patterns
    let cached = this.cache.get(src);
    if (cached && cached.status === 'loaded' && this.isEntryValid(cached)) {
      return cached.image;
    }
    
    // Also check if we have it cached under a resolved URL pattern
    // This is a fallback for when we've already resolved the URL before
    for (const [cachedSrc, entry] of this.cache.entries()) {
      if (cachedSrc.includes(src.replace('/src/assets/', '')) && entry.status === 'loaded' && this.isEntryValid(entry)) {
        return entry.image;
      }
    }
    
    return null;
  }

  /**
   * Checks if we're currently loading an image
   */
  async isLoading(src: string): Promise<boolean> {
    const resolvedSrc = await this.resolveImageUrl(src);
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

      // For resolved URLs (which should already be correct), just set the src directly
      img.src = src;
    });
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
