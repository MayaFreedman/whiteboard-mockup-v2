
// Import all SVG assets
import AnimalsIcon from '../assets/Animals.svg';
import PlantsIcon from '../assets/Plants.svg';
import VehiclesIcon from '../assets/Vehicles.svg';
import FantasyIcon from '../assets/fantasy.svg';
import SportsIcon from '../assets/sports.svg';
import ReligiousIcon from '../assets/religious.svg';

export interface StampInfo {
  id: string;
  name: string;
  category: string;
  src: string;
  originalWidth: number;
  originalHeight: number;
  icon: string;
}

/**
 * Available stamp categories with their SVG assets
 */
export const AVAILABLE_STAMPS: StampInfo[] = [
  {
    id: 'animals',
    name: 'Animals',
    category: 'Animals',
    src: AnimalsIcon,
    originalWidth: 80,
    originalHeight: 80,
    icon: AnimalsIcon
  },
  {
    id: 'plants',
    name: 'Plants',
    category: 'Plants',
    src: PlantsIcon,
    originalWidth: 80,
    originalHeight: 80,
    icon: PlantsIcon
  },
  {
    id: 'vehicles',
    name: 'Vehicles',
    category: 'Vehicles',
    src: VehiclesIcon,
    originalWidth: 80,
    originalHeight: 80,
    icon: VehiclesIcon
  },
  {
    id: 'fantasy',
    name: 'Fantasy',
    category: 'Fantasy',
    src: FantasyIcon,
    originalWidth: 80,
    originalHeight: 80,
    icon: FantasyIcon
  },
  {
    id: 'sports',
    name: 'Sports',
    category: 'Sports',
    src: SportsIcon,
    originalWidth: 80,
    originalHeight: 80,
    icon: SportsIcon
  },
  {
    id: 'religious',
    name: 'Religious',
    category: 'Religious',
    src: ReligiousIcon,
    originalWidth: 80,
    originalHeight: 80,
    icon: ReligiousIcon
  }
];

/**
 * SVG image cache to avoid repeated loading
 */
const imageCache = new Map<string, HTMLImageElement>();

/**
 * Load and cache an SVG image
 * @param src - SVG source path
 * @returns Promise that resolves to the loaded image
 */
export const loadStampImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    // Check cache first
    if (imageCache.has(src)) {
      const cachedImg = imageCache.get(src);
      if (cachedImg && cachedImg.complete) {
        resolve(cachedImg);
        return;
      }
    }

    // Create new image
    const img = new Image();
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = () => {
      console.error('Failed to load stamp image:', src);
      reject(new Error(`Failed to load image: ${src}`));
    };
    
    // Set source - for SVG imports in Vite, they become URLs
    img.src = src;
  });
};

/**
 * Get stamp info by ID
 * @param stampId - ID of the stamp to retrieve
 * @returns StampInfo or undefined if not found
 */
export const getStampById = (stampId: string): StampInfo | undefined => {
  return AVAILABLE_STAMPS.find(stamp => stamp.id === stampId);
};

/**
 * Preload all stamp images for better performance
 */
export const preloadAllStamps = async (): Promise<void> => {
  console.log('🖼️ Preloading all stamp images...');
  
  const loadPromises = AVAILABLE_STAMPS.map(stamp => 
    loadStampImage(stamp.src).catch(error => {
      console.warn(`Failed to preload stamp ${stamp.id}:`, error);
      return null;
    })
  );
  
  await Promise.allSettled(loadPromises);
  console.log('✅ Stamp preloading completed');
};
