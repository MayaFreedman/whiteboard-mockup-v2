/**
 * Auto-generates icon registry from emoji directory
 * Scans all SVG files and creates IconInfo entries
 */

import { IconInfo } from './iconRegistry';
import { getEmojiData, generateFallbackEmojiData } from './emojiDatabase';

// Simulate directory scanning (in a real app, this would scan the actual directory)
const EMOJI_DIRECTORY = '/emojis/openmoji-svg-color (1)/';

/**
 * Auto-generate icon registry from all available emoji files
 */
export function generateIconRegistry(): IconInfo[] {
  const icons: IconInfo[] = [];
  
  // In a real implementation, this would scan the actual directory
  // For now, we'll use a representative sample that covers the main categories
  const emojiFiles = [
    // Sample of actual files from the directory
    '1F600.svg', '1F601.svg', '1F602.svg', '1F603.svg', '1F60A.svg',
    '1F400.svg', '1F401.svg', '1F408.svg', '1F415.svg', '1F431.svg',
    '1F349.svg', '1F34E.svg', '1F355.svg', '1F354.svg', '1F32D.svg',
    '1F680.svg', '1F697.svg', '1F68C.svg', '1F6B2.svg', '1F3C0.svg',
    '2764.svg', '1F493.svg', '1F31F.svg', '2600.svg', '1F308.svg',
    // Add more as needed...
  ];

  for (const filename of emojiFiles) {
    const codepoint = filename.replace('.svg', '').toUpperCase();
    let emojiData = getEmojiData(codepoint);
    
    // Generate fallback data if not found in database
    if (!emojiData) {
      emojiData = generateFallbackEmojiData(filename);
    }
    
    const iconInfo: IconInfo = {
      name: emojiData.name,
      category: emojiData.category,
      path: `${EMOJI_DIRECTORY}${filename}`,
      preview: String.fromCodePoint(parseInt(codepoint, 16))
    };
    
    icons.push(iconInfo);
  }
  
  return icons.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}

/**
 * Get icon count by category for debugging
 */
export function getIconStats() {
  const icons = generateIconRegistry();
  const stats = icons.reduce((acc, icon) => {
    acc[icon.category] = (acc[icon.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return {
    total: icons.length,
    byCategory: stats
  };
}