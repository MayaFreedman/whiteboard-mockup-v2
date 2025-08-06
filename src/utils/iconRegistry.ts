/**
 * Icon registry for stamp icons
 * Maps icon names to their file paths for dynamic loading
 * Uses authentic OpenMoji SVG files
 */

import { getCustomStamps, CustomStamp } from './customStamps';
import { generateIconRegistry } from './emojiAutoGenerator';
import { IconInfo } from '../types/icons';

// Auto-generated icon registry from emoji directory
export const iconRegistry: IconInfo[] = generateIconRegistry();

/**
 * Get all available icon categories
 */
export function getCategories(): string[] {
  const categories = new Set<string>();
  
  iconRegistry.forEach(icon => {
    categories.add(icon.category);
  });
  
  return Array.from(categories).sort();
}

/**
 * Legacy function name for backward compatibility
 */
export function getAllCategories(): string[] {
  return getCategories();
}

/**
 * Get icons by category including custom stamps
 */
export function getIconsByCategoryWithCustom(category: string): (IconInfo | CustomStamp)[] {
  const regularIcons = iconRegistry.filter(icon => icon.category === category);
  const customIcons = getCustomStamps().filter(stamp => stamp.category === category);
  return [...regularIcons, ...customIcons];
}

/**
 * Get display name for category
 */
export function getCategoryDisplayName(category: string): string {
  // Convert category to display name (capitalize first letter)
  return category.charAt(0).toUpperCase() + category.slice(1);
}

/**
 * Get icons by category
 */
export function getIconsByCategory(category: string): IconInfo[] {
  return iconRegistry.filter(icon => icon.category === category);
}

/**
 * Get all icon names for debugging/verification
 */
export function getAllIconNames(): string[] {
  return iconRegistry.map(icon => icon.name);
}

/**
 * Find icon by name
 */
export function findIconByName(name: string): IconInfo | undefined {
  return iconRegistry.find(icon => icon.name.toLowerCase() === name.toLowerCase());
}

/**
 * Get stamp info for a given icon name
 */
export function getStampInfo(iconName: string): IconInfo | undefined {
  return iconRegistry.find(icon => icon.name === iconName);
}

/**
 * Get icon preview (emoji character or path)
 */
export function getIconPreview(iconName: string): string {
  const icon = findIconByName(iconName);
  return icon?.preview || '';
}

/**
 * Get all icons with their custom variants
 */
export function getAllIcons(): (IconInfo | CustomStamp)[] {
  return [...iconRegistry, ...getCustomStamps()];
}

/**
 * Get icon count by category (for debugging)
 */
export function getIconStats() {
  const stats = iconRegistry.reduce((acc, icon) => {
    acc[icon.category] = (acc[icon.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return {
    total: iconRegistry.length,
    byCategory: stats
  };
}