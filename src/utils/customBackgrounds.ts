/**
 * Custom background storage utilities
 * Persists custom backgrounds in localStorage so they survive reloads
 */

export interface StoredCustomBackground {
  id: string;
  name: string;
  url: string; // data URL or path
  preview: string; // thumbnail or same as url
  createdAt?: number;
}

const STORAGE_KEY = 'whiteboard-custom-backgrounds';

export const isCustomBackgroundsSupported = (): boolean => {
  try {
    const test = '__cb_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
};

export const getCustomBackgrounds = (): StoredCustomBackground[] => {
  if (!isCustomBackgroundsSupported()) return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const list = JSON.parse(stored) as StoredCustomBackground[];
    // Basic validation
    return (list || []).filter(b => b && b.id && b.name && b.url && b.preview);
  } catch {
    return [];
  }
};

export const saveCustomBackgrounds = (backgrounds: StoredCustomBackground[]) => {
  if (!isCustomBackgroundsSupported()) return;
  try {
    // Keep most recent first by createdAt when available
    const sorted = [...backgrounds].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
  } catch (e) {
    // Swallow errors to avoid breaking UX
    console.warn('Failed to save custom backgrounds:', e);
  }
};
