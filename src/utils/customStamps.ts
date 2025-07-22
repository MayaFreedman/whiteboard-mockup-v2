
export interface CustomStamp {
  id: string;
  name: string;
  dataUrl: string; // base64 encoded image
  category: 'custom';
  preview: string; // thumbnail dataURL
  createdAt: number;
  size: number; // file size in bytes
}

const STORAGE_KEY = 'whiteboard-custom-stamps';
const MAX_TOTAL_SIZE = 5 * 1024 * 1024; // 5MB total
const MAX_SINGLE_SIZE = 1024 * 1024; // 1MB per image
const MAX_STAMPS = 50;
const MAX_DIMENSION = 200;
const THUMBNAIL_SIZE = 50;

/**
 * Load custom stamps from localStorage
 */
export function getCustomStamps(): CustomStamp[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const stamps = JSON.parse(stored) as CustomStamp[];
    return Array.isArray(stamps) ? stamps : [];
  } catch (error) {
    console.warn('Failed to load custom stamps:', error);
    return [];
  }
}

/**
 * Save custom stamps to localStorage
 */
export function saveCustomStamps(stamps: CustomStamp[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stamps));
    return true;
  } catch (error) {
    console.warn('Failed to save custom stamps:', error);
    return false;
  }
}

/**
 * Calculate total storage size of stamps
 */
export function getTotalStorageSize(stamps: CustomStamp[]): number {
  return stamps.reduce((total, stamp) => total + stamp.size, 0);
}

/**
 * Remove least recently used stamps to make space
 */
export function evictOldStamps(stamps: CustomStamp[], neededSpace: number): CustomStamp[] {
  const sorted = [...stamps].sort((a, b) => a.createdAt - b.createdAt);
  let currentSize = getTotalStorageSize(stamps);
  
  while (currentSize + neededSpace > MAX_TOTAL_SIZE && sorted.length > 0) {
    const removed = sorted.shift()!;
    currentSize -= removed.size;
  }
  
  return sorted;
}

/**
 * Resize image to fit within max dimensions while maintaining aspect ratio
 */
function resizeImage(img: HTMLImageElement, maxWidth: number, maxHeight: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  let { width, height } = img;
  
  // Calculate new dimensions
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width *= ratio;
    height *= ratio;
  }
  
  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(img, 0, 0, width, height);
  
  return canvas;
}

/**
 * Create thumbnail from image
 */
function createThumbnail(img: HTMLImageElement): string {
  const canvas = resizeImage(img, THUMBNAIL_SIZE, THUMBNAIL_SIZE);
  return canvas.toDataURL('image/png', 0.8);
}

/**
 * Process uploaded file into custom stamp
 */
export async function processUploadedFile(file: File): Promise<CustomStamp> {
  // Validate file
  if (file.size > MAX_SINGLE_SIZE) {
    throw new Error(`File too large. Maximum size is ${MAX_SINGLE_SIZE / 1024 / 1024}MB`);
  }
  
  if (!file.type.match(/^image\/(png|jpeg|jpg)$/i)) {
    throw new Error('Only PNG and JPEG files are supported');
  }
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      try {
        // Resize main image
        const resizedCanvas = resizeImage(img, MAX_DIMENSION, MAX_DIMENSION);
        const dataUrl = resizedCanvas.toDataURL('image/png', 0.9);
        
        // Create thumbnail
        const preview = createThumbnail(img);
        
        // Estimate size (base64 is ~1.37x original size)
        const estimatedSize = Math.ceil(dataUrl.length * 0.75);
        
        const customStamp: CustomStamp = {
          id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
          dataUrl,
          category: 'custom',
          preview,
          createdAt: Date.now(),
          size: estimatedSize
        };
        
        URL.revokeObjectURL(img.src);
        resolve(customStamp);
      } catch (error) {
        URL.revokeObjectURL(img.src);
        reject(error);
      }
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };
    
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Add custom stamp to storage
 */
export async function addCustomStamp(file: File): Promise<CustomStamp> {
  const stamp = await processUploadedFile(file);
  const existingStamps = getCustomStamps();
  
  // Check limits
  if (existingStamps.length >= MAX_STAMPS) {
    throw new Error(`Too many custom stamps. Maximum is ${MAX_STAMPS}`);
  }
  
  // Evict old stamps if needed
  let stamps = existingStamps;
  if (getTotalStorageSize(stamps) + stamp.size > MAX_TOTAL_SIZE) {
    stamps = evictOldStamps(stamps, stamp.size);
  }
  
  // Add new stamp
  stamps.push(stamp);
  
  if (!saveCustomStamps(stamps)) {
    throw new Error('Failed to save custom stamp to storage');
  }
  
  return stamp;
}

/**
 * Remove custom stamp
 */
export function removeCustomStamp(stampId: string): boolean {
  const stamps = getCustomStamps();
  const filtered = stamps.filter(s => s.id !== stampId);
  
  if (filtered.length === stamps.length) {
    return false; // Stamp not found
  }
  
  return saveCustomStamps(filtered);
}

/**
 * Get storage usage info
 */
export function getStorageInfo() {
  const stamps = getCustomStamps();
  return {
    count: stamps.length,
    maxCount: MAX_STAMPS,
    totalSize: getTotalStorageSize(stamps),
    maxTotalSize: MAX_TOTAL_SIZE,
    availableSpace: MAX_TOTAL_SIZE - getTotalStorageSize(stamps)
  };
}
