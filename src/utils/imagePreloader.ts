/**
 * Image preloader utility to warm up the cache with stamp images
 * Prevents infinite rendering loops caused by missing images
 */

import { iconRegistry } from './iconRegistry';

const PRELOAD_TIMEOUT = 10000; // 10 seconds timeout per image
const MAX_CONCURRENT_LOADS = 8; // Load up to 8 images concurrently

interface PreloadResult {
  path: string;
  success: boolean;
  error?: string;
}

/**
 * Preloads a single image with timeout and proper error handling
 */
async function preloadImage(path: string): Promise<PreloadResult> {
  return new Promise((resolve) => {
    const img = new Image();
    let resolved = false;
    
    // Set up timeout
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.warn(`⏰ Image preload timeout: ${path}`);
        resolve({ path, success: false, error: 'timeout' });
      }
    }, PRELOAD_TIMEOUT);
    
    img.onload = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        console.log(`✅ Preloaded: ${path}`);
        resolve({ path, success: true });
      }
    };
    
    img.onerror = (error) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        console.warn(`❌ Failed to preload: ${path}`, error);
        resolve({ path, success: false, error: 'load_error' });
      }
    };
    
    img.src = path;
  });
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