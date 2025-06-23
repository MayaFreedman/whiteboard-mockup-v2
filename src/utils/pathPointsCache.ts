
/**
 * Cache system for path-to-points conversion to improve performance
 */

export interface PathPointsCache {
  points: Array<{ x: number; y: number }>;
  pathString: string;
  timestamp: number;
}

class PathPointsCacheManager {
  private cache = new Map<string, PathPointsCache>();
  private maxCacheSize = 100; // Limit cache size to prevent memory issues
  private maxAge = 5 * 60 * 1000; // 5 minutes max age

  /**
   * Generate cache key from path string
   */
  private generateKey(path: string): string {
    // Use a simple hash of the path for the key
    let hash = 0;
    for (let i = 0; i < path.length; i++) {
      const char = path.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  /**
   * Get cached points for a path, or return null if not cached
   */
  get(path: string): Array<{ x: number; y: number }> | null {
    const key = this.generateKey(path);
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    // Check if cache entry is still valid
    const now = Date.now();
    if (now - cached.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }
    
    // Verify the path hasn't changed (hash collision protection)
    if (cached.pathString !== path) {
      return null;
    }
    
    return cached.points;
  }

  /**
   * Store points for a path in cache
   */
  set(path: string, points: Array<{ x: number; y: number }>): void {
    const key = this.generateKey(path);
    
    // Clean up old entries if cache is getting too large
    if (this.cache.size >= this.maxCacheSize) {
      this.cleanup();
    }
    
    this.cache.set(key, {
      points: [...points], // Create a copy to avoid mutations
      pathString: path,
      timestamp: Date.now()
    });
  }

  /**
   * Clean up old cache entries
   */
  private cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    
    // Sort by timestamp (oldest first)
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove oldest entries or expired ones
    const toRemove = Math.max(1, Math.floor(this.cache.size * 0.3)); // Remove 30% of cache
    
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats for debugging
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      entries: Array.from(this.cache.values()).map(entry => ({
        pathLength: entry.pathString.length,
        pointCount: entry.points.length,
        age: Date.now() - entry.timestamp
      }))
    };
  }
}

export const pathPointsCache = new PathPointsCacheManager();
