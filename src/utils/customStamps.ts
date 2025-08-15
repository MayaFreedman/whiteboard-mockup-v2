/**
 * Custom stamp storage and processing utilities
 * Handles localStorage persistence, file processing, and image optimization
 */

export interface CustomStamp {
  id: string;
  name: string;
  dataUrl: string; // base64 encoded image
  category: 'custom';
  preview: string; // base64 thumbnail for grid display
  createdAt: number;
  size: number; // file size in bytes
}

// Storage configuration
const STORAGE_KEY = 'whiteboard-custom-stamps';
const MAX_TOTAL_SIZE = 5 * 1024 * 1024; // 5MB total
const MAX_STAMP_SIZE = 1024 * 1024; // 1MB per stamp
const MAX_STAMP_COUNT = 50;
const MAX_DIMENSION = 200; // Max width/height for stamps
const THUMBNAIL_SIZE = 50; // Thumbnail dimensions

/**
 * Get all custom stamps from localStorage
 */
export const getCustomStamps = (): CustomStamp[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const stamps = JSON.parse(stored) as CustomStamp[];
    
    // Validate and clean up corrupted data
    return stamps.filter(stamp => 
      stamp && 
      stamp.id && 
      stamp.name && 
      stamp.dataUrl && 
      stamp.preview &&
      typeof stamp.createdAt === 'number' &&
      typeof stamp.size === 'number'
    );
  } catch (error) {
    console.warn('Failed to load custom stamps from localStorage:', error);
    return [];
  }
};

/**
 * Save custom stamps to localStorage with LRU eviction
 */
const saveCustomStamps = (stamps: CustomStamp[]): void => {
  try {
    // Sort by creation time (most recent first) and enforce limits
    const sortedStamps = stamps
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, MAX_STAMP_COUNT);
    
    // Calculate total size and remove oldest stamps if needed
    let totalSize = 0;
    const finalStamps: CustomStamp[] = [];
    
    for (const stamp of sortedStamps) {
      if (totalSize + stamp.size <= MAX_TOTAL_SIZE) {
        finalStamps.push(stamp);
        totalSize += stamp.size;
      }
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(finalStamps));
  } catch (error) {
    console.error('Failed to save custom stamps to localStorage:', error);
    throw new Error('Storage quota exceeded or unavailable');
  }
};

/**
 * Process and resize image file to create stamp
 */
const processImageFile = (file: File): Promise<{ dataUrl: string; preview: string; size: number }> => {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_STAMP_SIZE) {
      reject(new Error(`File too large. Maximum size is ${Math.round(MAX_STAMP_SIZE / 1024 / 1024)}MB`));
      return;
    }
    
    const img = new Image();
    img.onload = () => {
      try {
        // Create main stamp canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to create canvas context'));
          return;
        }
        
        // Calculate resize dimensions maintaining aspect ratio
        let { width, height } = img;
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }
        
        // Resize main image
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/png', 0.9);
        
        // Create thumbnail - preserve aspect ratio
        const thumbCanvas = document.createElement('canvas');
        const thumbCtx = thumbCanvas.getContext('2d');
        if (!thumbCtx) {
          reject(new Error('Failed to create thumbnail canvas context'));
          return;
        }
        
        // Calculate thumbnail dimensions preserving aspect ratio
        let thumbWidth = width;
        let thumbHeight = height;
        
        if (width > THUMBNAIL_SIZE || height > THUMBNAIL_SIZE) {
          if (width > height) {
            thumbHeight = Math.round((height * THUMBNAIL_SIZE) / width);
            thumbWidth = THUMBNAIL_SIZE;
          } else {
            thumbWidth = Math.round((width * THUMBNAIL_SIZE) / height);
            thumbHeight = THUMBNAIL_SIZE;
          }
        }
        
        thumbCanvas.width = thumbWidth;
        thumbCanvas.height = thumbHeight;
        
        thumbCtx.drawImage(img, 0, 0, thumbWidth, thumbHeight);
        const preview = thumbCanvas.toDataURL('image/png', 0.8);
        
        // Calculate approximate size of processed image
        const size = Math.round(dataUrl.length * 0.75); // Base64 overhead approximation
        
        resolve({ dataUrl, preview, size });
      } catch (error) {
        reject(new Error('Failed to process image'));
      }
    };
    
    img.onerror = () => reject(new Error('Failed to load image file'));
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Add a custom stamp from file
 */
export const addCustomStamp = async (file: File, name?: string): Promise<CustomStamp> => {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('Please select an image file (PNG, JPG, JPEG)');
  }
  
  if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
    throw new Error('Unsupported file type. Please use PNG, JPG, or JPEG');
  }
  
  try {
    // Process the image
    const { dataUrl, preview, size } = await processImageFile(file);
    
    // Check for duplicate stamps
    const existingStamps = getCustomStamps();
    const isDuplicate = existingStamps.some(stamp => stamp.dataUrl === dataUrl);
    
    if (isDuplicate) {
      console.log('Duplicate stamp detected'); // Debug log
      throw new Error('This stamp has already been uploaded');
    }
    
    // Create stamp object
    const stamp: CustomStamp = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: name || file.name.replace(/\.[^/.]+$/, '') || 'Custom Stamp',
      dataUrl,
      category: 'custom',
      preview,
      createdAt: Date.now(),
      size
    };
    
    // Add new stamp to existing ones
    const updatedStamps = [stamp, ...existingStamps];
    
    // Save with automatic cleanup
    saveCustomStamps(updatedStamps);
    
    return stamp;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to create custom stamp');
  }
};

/**
 * Remove a custom stamp by dataURL (since that's what we have in the UI)
 */
export const removeCustomStamp = (stampDataUrl: string): void => {
  try {
    const stamps = getCustomStamps();
    const updatedStamps = stamps.filter(stamp => stamp.dataUrl !== stampDataUrl);
    saveCustomStamps(updatedStamps);
  } catch (error) {
    console.error('Failed to remove custom stamp:', error);
    throw new Error('Failed to remove stamp');
  }
};

/**
 * Check if custom stamps are supported (localStorage available)
 */
export const isCustomStampsSupported = (): boolean => {
  try {
    const test = 'test';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
};

/**
 * Get storage usage info
 */
export const getStorageInfo = () => {
  const stamps = getCustomStamps();
  const totalSize = stamps.reduce((sum, stamp) => sum + stamp.size, 0);
  
  return {
    count: stamps.length,
    totalSize,
    maxSize: MAX_TOTAL_SIZE,
    maxCount: MAX_STAMP_COUNT,
    usage: totalSize / MAX_TOTAL_SIZE,
    remaining: MAX_TOTAL_SIZE - totalSize
  };
};