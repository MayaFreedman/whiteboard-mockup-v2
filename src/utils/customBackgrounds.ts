/**
 * Custom background storage and processing utilities
 * Mirrors custom stamps behavior: localStorage persistence, file processing, and image optimization
 */

export interface CustomBackground {
  id: string;
  name: string;
  dataUrl: string; // base64 encoded image for CSS url()
  preview: string; // base64 thumbnail for grid display
  createdAt: number;
  size: number; // approximate bytes
}

// Storage configuration
const STORAGE_KEY = 'whiteboard-custom-backgrounds';
const MAX_TOTAL_SIZE = 5 * 1024 * 1024; // 5MB total
const MAX_BG_SIZE = 2 * 1024 * 1024; // 2MB per background (processed)
const MAX_BG_COUNT = 30;
const MAX_DIMENSION = 1280; // Resize large images to keep storage reasonable
const THUMBNAIL_SIZE = 96; // For grid preview

export const getCustomBackgrounds = (): CustomBackground[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const bgs = JSON.parse(stored) as CustomBackground[];
    return bgs.filter(
      (b) => b && b.id && b.name && b.dataUrl && b.preview && typeof b.createdAt === 'number' && typeof b.size === 'number'
    );
  } catch (e) {
    console.warn('Failed to load custom backgrounds:', e);
    return [];
  }
};

const saveCustomBackgrounds = (backgrounds: CustomBackground[]) => {
  try {
    const sorted = backgrounds.sort((a, b) => b.createdAt - a.createdAt).slice(0, MAX_BG_COUNT);
    let total = 0;
    const final: CustomBackground[] = [];
    for (const bg of sorted) {
      if (total + bg.size <= MAX_TOTAL_SIZE) {
        final.push(bg);
        total += bg.size;
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(final));
    // Notify listeners
    window.dispatchEvent(new CustomEvent('custom-backgrounds-updated'));
  } catch (e) {
    console.error('Failed to save custom backgrounds:', e);
    throw new Error('Storage quota exceeded or unavailable');
  }
};

const processImageFile = (file: File): Promise<{ dataUrl: string; preview: string; size: number }> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please select an image file (PNG, JPG, JPEG)'));
      return;
    }

    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Failed to create canvas context'));

        let { width, height } = img as HTMLImageElement;
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

        // Thumbnail preserving aspect ratio
        const tCanvas = document.createElement('canvas');
        const tCtx = tCanvas.getContext('2d');
        if (!tCtx) return reject(new Error('Failed to create thumbnail canvas context'));

        let tW = width;
        let tH = height;
        if (tW > THUMBNAIL_SIZE || tH > THUMBNAIL_SIZE) {
          if (tW > tH) {
            tH = Math.round((tH * THUMBNAIL_SIZE) / tW);
            tW = THUMBNAIL_SIZE;
          } else {
            tW = Math.round((tW * THUMBNAIL_SIZE) / tH);
            tH = THUMBNAIL_SIZE;
          }
        }
        tCanvas.width = tW;
        tCanvas.height = tH;
        tCtx.drawImage(img, 0, 0, tW, tH);
        const preview = tCanvas.toDataURL('image/jpeg', 0.8);

        const size = Math.round(dataUrl.length * 0.75);
        if (size > MAX_BG_SIZE) {
          console.warn('Processed background still large:', Math.round(size / 1024), 'KB');
        }
        resolve({ dataUrl, preview, size });
      } catch (err) {
        reject(new Error('Failed to process image'));
      }
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

export const addCustomBackground = async (file: File, name?: string): Promise<CustomBackground> => {
  const { dataUrl, preview, size } = await processImageFile(file);
  const bg: CustomBackground = {
    id: `bg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: name || file.name.replace(/\.[^/.]+$/, '') || 'Custom Background',
    dataUrl,
    preview,
    createdAt: Date.now(),
    size,
  };
  const existing = getCustomBackgrounds();
  saveCustomBackgrounds([bg, ...existing]);
  return bg;
};

export const addCustomBackgroundFromObject = (bg: CustomBackground) => {
  // Basic validation and dedupe by id or dataUrl
  if (!bg || !bg.id || !bg.dataUrl) return;
  const existing = getCustomBackgrounds();
  const exists = existing.some((b) => b.id === bg.id || b.dataUrl === bg.dataUrl);
  const next = exists ? existing : [bg, ...existing];
  saveCustomBackgrounds(next);
};

export const removeCustomBackgroundById = (id: string) => {
  const existing = getCustomBackgrounds();
  const next = existing.filter((b) => b.id !== id);
  saveCustomBackgrounds(next);
};

export const removeCustomBackgroundByDataUrl = (dataUrl: string) => {
  const existing = getCustomBackgrounds();
  const next = existing.filter((b) => b.dataUrl !== dataUrl);
  saveCustomBackgrounds(next);
};

export const isCustomBackgroundsSupported = (): boolean => {
  try {
    const k = '__ls_test__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
};
