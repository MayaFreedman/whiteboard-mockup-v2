// Utility to preload images and populate the shared image cache
import { getCachedImage, setCachedImage, setImageLoading, setImageFailed } from './sharedImageCache';

/**
 * Preloads an image and stores it in the shared cache to enable zero-gap swaps.
 * Resolves once the image is fully decoded (when supported) or loaded.
 */
export async function preloadAndCacheImage(path: string): Promise<HTMLImageElement> {
  const normalized = decodeURIComponent(path);
  const cached = getCachedImage(normalized);
  if (cached.image) return cached.image;

  // Begin loading (mark in shared cache)
  setImageLoading(normalized);

  const img = new Image();

  const loadViaOnload = () =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        setImageFailed(normalized, new Error('Image preload timeout'));
        reject(new Error('Image preload timeout'));
      }, 10000);

      img.onload = () => {
        window.clearTimeout(timeout);
        setCachedImage(normalized, img);
        resolve(img);
      };
      img.onerror = (e) => {
        window.clearTimeout(timeout);
        setImageFailed(normalized, e);
        reject(new Error('Failed to preload image'));
      };

      img.src = normalized;
    });

  // Set src, then try decode if supported for paint-ready image
  img.src = normalized;
  if ('decode' in img && typeof (img as any).decode === 'function') {
    try {
      await (img as any).decode();
      setCachedImage(normalized, img);
      return img;
    } catch {
      // Fallback to onload listener
      return await loadViaOnload();
    }
  }

  // Fallback for browsers without decode()
  return await loadViaOnload();
}
