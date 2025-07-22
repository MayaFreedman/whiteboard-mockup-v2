import { Openmoji } from 'openmoji/types';
import openmojiList from 'openmoji/openmoji.json';
import { getSvgPath } from 'openmoji';
import { getCustomStamps } from './customStamps';

// Define the structure for each icon entry
interface IconEntry {
  name: string;
  category:
    | 'emotions'
    | 'animals'
    | 'nature'
    | 'objects'
    | 'symbols'
    | 'arrows'
    | 'custom';
  path: string; // SVG path or URL
  preview: string; // Emoji or SVG path for preview
}

// Function to convert Openmoji data to IconEntry
function createIconEntry(emoji: Openmoji): IconEntry {
  return {
    name: emoji.annotation,
    category: emoji.group as IconEntry['category'],
    path: getSvgPath(emoji.hex),
    preview: emoji.emoji
  };
}

// Convert Openmoji list to IconEntry array
const openmojiIcons = openmojiList.map(createIconEntry);

// Define a more specific type for the iconRegistry
export const iconRegistry: IconEntry[] = [
  ...openmojiIcons.filter(icon => icon.category === 'emotions'),
  ...openmojiIcons.filter(icon => icon.category === 'animals'),
  ...openmojiIcons.filter(icon => icon.category === 'nature'),
  ...openmojiIcons.filter(icon => icon.category === 'objects'),
  ...openmojiIcons.filter(icon => icon.category === 'symbols'),
  ...openmojiIcons.filter(icon => icon.category === 'arrows')
];

/**
 * Get all available categories including custom if there are custom stamps
 */
export function getCategories(): string[] {
  const baseCategories = [...new Set(iconRegistry.map(icon => icon.category))];
  const customStamps = getCustomStamps();
  
  if (customStamps.length > 0) {
    return [...baseCategories, 'custom'];
  }
  
  return baseCategories;
}

/**
 * Get icons by category, including custom stamps
 */
export function getIconsByCategory(category: string) {
  if (category === 'custom') {
    const customStamps = getCustomStamps();
    return customStamps.map(stamp => ({
      name: stamp.name,
      category: 'custom' as const,
      path: stamp.dataUrl,
      preview: stamp.preview
    }));
  }
  
  return iconRegistry.filter(icon => icon.category === category);
}

/**
 * Get display name for category
 */
export function getCategoryDisplayName(category: string): string {
  const displayNames: Record<string, string> = {
    emotions: 'Emotions',
    animals: 'Animals',
    nature: 'Nature',
    objects: 'Objects',
    symbols: 'Symbols',
    arrows: 'Arrows',
    custom: 'Custom'
  };
  
  return displayNames[category] || category.charAt(0).toUpperCase() + category.slice(1);
}
