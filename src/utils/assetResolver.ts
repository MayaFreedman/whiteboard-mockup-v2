
/**
 * Resolves asset URLs for both development and production environments
 */

// Import all SVG assets using Vite's explicit import syntax
import AnimalsUrl from '../assets/Animals.svg';
import PlantsUrl from '../assets/Plants.svg';
import VehiclesUrl from '../assets/Vehicles.svg';

// Map of asset paths to their resolved URLs
const assetUrlMap: Record<string, string> = {
  '/src/assets/Animals.svg': AnimalsUrl,
  '/src/assets/Plants.svg': PlantsUrl,
  '/src/assets/Vehicles.svg': VehiclesUrl,
};

/**
 * Resolves an asset path to the correct URL for the current environment
 * @param path - The asset path (e.g., '/src/assets/Plants.svg')
 * @returns The resolved URL that works in both dev and production
 */
export const resolveAssetUrl = (path: string): string => {
  // Check if we have a mapped URL for this path
  if (assetUrlMap[path]) {
    return assetUrlMap[path];
  }
  
  // For external URLs, return as-is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // For other paths, return as-is (fallback)
  return path;
};

/**
 * Gets all available sticker URLs
 * @returns Array of resolved sticker URLs
 */
export const getAllStickerUrls = (): string[] => {
  return Object.values(assetUrlMap);
};
