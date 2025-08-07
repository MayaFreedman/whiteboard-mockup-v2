/**
 * Auto-generated PNG emoji registry
 * Generated from PNG files with Unicode-based categorization
 * 
 * DO NOT EDIT MANUALLY - Run 'node scripts/generatePngRegistry.js' to regenerate
 */

import { getCustomStamps, CustomStamp } from './customStamps';

export interface IconInfo {
  name: string;
  category: string;
  path: string;
  preview: string;
}

// Registry will be populated by the generator script
export const iconRegistry: IconInfo[] = [
  // This will be regenerated automatically by the build process
];

/**
 * Get icon by path
 */
export function getIconByPath(path: string): IconInfo | undefined {
  return iconRegistry.find(icon => icon.path === path);
}

/**
 * Get icons by category
 */
export function getIconsByCategory(category: string): IconInfo[] {
  return iconRegistry.filter(icon => icon.category === category);
}

/**
 * Get all available categories
 */
export function getCategories(): string[] {
  const categories = Array.from(new Set(iconRegistry.map(icon => icon.category)));
  return categories.sort();
}

/**
 * Get category display name
 */
export function getCategoryDisplayName(category: string): string {
  const displayNames: Record<string, string> = {
    'emotions': 'Emotions & Faces',
    'people': 'People & Body',
    'professions': 'Professions & Careers',
    'gestures': 'Gestures & Body',
    'fantasy': 'Fantasy & Mythical',
    'animals': 'Animals',
    'nature': 'Plants & Nature',
    'weather': 'Weather & Sky',
    'food-drink': 'Food & Drink',
    'sports': 'Sports & Recreation',
    'entertainment': 'Music & Entertainment',
    'celebrations': 'Celebrations & Events',
    'vehicles': 'Vehicles & Transport',
    'places': 'Buildings & Places',
    'technology': 'Technology & Digital',
    'tools': 'Tools & Household',
    'office': 'Office & Documents',
    'objects': 'Objects & Items',
    'symbols': 'Symbols & Math',
    'flags': 'Country Flags'
  };
  return displayNames[category] || category.charAt(0).toUpperCase() + category.slice(1);
}

/**
 * Get custom stamps as icons
 */
export function getCustomStampsAsIcons(): IconInfo[] {
  const customStamps = getCustomStamps();
  return customStamps.map((stamp: CustomStamp) => ({
    name: stamp.name,
    category: 'custom',
    path: stamp.dataUrl,
    preview: stamp.preview
  }));
}

/**
 * Get all categories including custom
 */
export function getAllCategories(): string[] {
  const standardCategories = getCategories();
  const customStamps = getCustomStamps();
  
  if (customStamps.length > 0) {
    return ['custom', ...standardCategories];
  }
  
  return standardCategories;
}

/**
 * Get icons by category including custom stamps
 */
export function getIconsByCategoryWithCustom(category: string): IconInfo[] {
  if (category === 'custom') {
    return getCustomStampsAsIcons();
  }
  return getIconsByCategory(category);
}

/**
 * Get all icons including custom stamps
 */
export function getAllIcons(): IconInfo[] {
  return [...iconRegistry, ...getCustomStampsAsIcons()];
}

// Export category statistics for debugging
export const CATEGORY_STATS = {};
export const TOTAL_EMOJIS = 0;
export const GENERATED_AT = new Date().toISOString();
