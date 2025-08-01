/**
 * Image preloader utility - now uses central cache system
 * Prevents infinite rendering loops by pre-warming the central cache
 */

import { iconRegistry } from './iconRegistry';
import { loadImage, getCacheStats } from './sharedImageCache';

const MAX_CONCURRENT_LOADS = 8; // Load up to 8 images concurrently

interface PreloadResult {
  path: string;
  success: boolean;
  error?: string;
}

/**
 * Preloads a single image using the central cache system
 */
async function preloadImage(path: string): Promise<PreloadResult> {
  try {
    const img = await loadImage(path);
    return { 
      path, 
      success: img !== null 
    };
  } catch (error) {
    return { 
      path, 
      success: false, 
      error: error instanceof Error ? error.message : 'unknown_error' 
    };
  }
}

/**
 * Preloads images in batches to avoid overwhelming the browser
 */
async function preloadBatch(paths: string[]): Promise<PreloadResult[]> {
  const results: PreloadResult[] = [];
  
  for (let i = 0; i < paths.length; i += MAX_CONCURRENT_LOADS) {
    const batch = paths.slice(i, i + MAX_CONCURRENT_LOADS);
    const batchPromises = batch.map(path => preloadImage(path));
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * Preloads all stamp images from the icon registry
 * Returns a summary of the preload operation
 */
export async function preloadStampImages(): Promise<{
  total: number;
  success: number;
  failed: number;
  failedPaths: string[];
}> {
  console.log('🚀 Starting stamp image preload...');
  
  // Get all unique image paths from the registry
  const imagePaths = Array.from(new Set(
    iconRegistry.map(icon => icon.path)
  ));
  
  console.log(`📦 Preloading ${imagePaths.length} stamp images...`);
  
  const results = await preloadBatch(imagePaths);
  
  const summary = {
    total: results.length,
    success: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    failedPaths: results.filter(r => !r.success).map(r => r.path)
  };
  
  console.log(`✨ Preload complete:`, {
    ...summary,
    successRate: `${Math.round((summary.success / summary.total) * 100)}%`
  });
  
  // Log cache stats after preload
  const cacheStats = getCacheStats();
  console.log(`📊 Cache after preload:`, cacheStats);
  
  if (summary.failed > 0) {
    console.warn('⚠️ Some stamp images failed to preload:', summary.failedPaths);
  }
  
  return summary;
}

/**
 * Checks if a specific image path exists and can be loaded
 */
export async function checkImageExists(path: string): Promise<boolean> {
  const result = await preloadImage(path);
  return result.success;
}