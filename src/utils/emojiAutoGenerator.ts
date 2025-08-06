/**
 * Auto-generates icon registry from emoji directory
 * Scans all SVG files and creates IconInfo entries
 */

import { IconInfo } from '../types/icons';
import { getEmojiData, generateFallbackEmojiData } from './emojiDatabase';
import { allEmojiFiles } from './emojiFileList';
import { categorizeEmoji, generateEmojiName } from './emojiCategorizer';

// Directory path for emoji files
const EMOJI_DIRECTORY = '/emojis/openmoji-svg-color (1)/';

/**
 * Auto-generate icon registry from all 3,731 available emoji files
 */
export function generateIconRegistry(): IconInfo[] {
  const icons: IconInfo[] = [];
  
  console.log(`🚀 Generating icon registry for ${allEmojiFiles.length} emojis...`);
  
  // Process all emoji files
  const emojiFiles = allEmojiFiles;

  for (const filename of emojiFiles) {
    const codepoint = filename.replace('.svg', '').toUpperCase();
    let emojiData = getEmojiData(codepoint);
    
    // Generate enhanced fallback data if not found in database
    if (!emojiData) {
      const category = categorizeEmoji(filename);
      const name = generateEmojiName(filename);
      
      emojiData = {
        codepoint,
        name,
        category,
        keywords: [category, name.toLowerCase()]
      };
    }
    
    // Generate preview character
    let preview = '📄'; // Default fallback
    try {
      const firstCodepoint = codepoint.split('-')[0];
      preview = String.fromCodePoint(parseInt(firstCodepoint, 16));
    } catch (error) {
      console.warn(`⚠️ Could not generate preview for ${filename}:`, error);
    }
    
    const iconInfo: IconInfo = {
      name: emojiData.name,
      category: emojiData.category,
      path: `${EMOJI_DIRECTORY}${filename}`,
      preview
    };
    
    icons.push(iconInfo);
  }
  
  const sortedIcons = icons.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  
  console.log(`✅ Generated ${sortedIcons.length} icons across ${new Set(sortedIcons.map(i => i.category)).size} categories`);
  
  return sortedIcons;
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