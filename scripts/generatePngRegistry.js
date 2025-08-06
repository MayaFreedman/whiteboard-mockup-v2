/**
 * Auto-generates PNG emoji registry from /public/png-emojis directory
 * Run with: node scripts/generatePngRegistry.js
 */

const fs = require('fs');
const path = require('path');

// Unicode ranges for categorization
const CATEGORIES = {
  // Basic Latin & Latin-1 Supplement
  'symbols': /^(00[0-7]|20[0-2]|21[0-9]|22[0-9]|23[0-9]|24[0-9]|25[0-9]|26[0-9]|27[0-9])/,
  
  // Miscellaneous Symbols
  'objects': /^(26[0-9]|27[0-9])/,
  
  // Dingbats & Miscellaneous Symbols and Arrows
  'symbols': /^(27[0-9]|2B[0-9])/,
  
  // Emoticons (1F600-1F64F)
  'emotions': /^1F6[0-4]/,
  
  // Miscellaneous Symbols and Pictographs (1F300-1F5FF)
  'nature': /^1F3[0-4]/,
  'objects': /^1F3[5-9A-F]|1F4[0-9A-F]|1F5[0-9A-F]/,
  
  // Transport and Map Symbols (1F680-1F6FF)
  'travel': /^1F6[8-9A-F]/,
  
  // Supplemental Symbols and Pictographs (1F900-1F9FF)
  'objects': /^1F9[0-9A-F]/,
  
  // Country flags (Regional Indicator Symbols)
  'flags': /^1F1[E-F]/,
  
  // Food & Drink (1F32D-1F37F)
  'food': /^1F3[2-7]/,
  
  // Activities & Sports (1F3A0-1F3FF)
  'activities': /^1F3[A-F]/,
  
  // People & Body (1F385-1F9CF with skin tones)
  'people': /^1F[4-9]/,
};

// Friendly category names
const CATEGORY_NAMES = {
  'emotions': 'Emotions & Faces',
  'people': 'People & Body',
  'nature': 'Nature & Weather', 
  'food': 'Food & Drink',
  'activities': 'Activities & Sports',
  'travel': 'Travel & Transport',
  'objects': 'Objects & Symbols',
  'symbols': 'Symbols',
  'flags': 'Country Flags'
};

// Unicode name mappings for common emojis
const UNICODE_NAMES = {
  '1F600': 'Grinning Face',
  '1F601': 'Beaming Face with Smiling Eyes',
  '1F602': 'Face with Tears of Joy',
  '1F603': 'Grinning Face with Big Eyes',
  '1F604': 'Smiling Face with Smiling Eyes',
  '1F605': 'Grinning Face with Sweat',
  '1F606': 'Grinning Squinting Face',
  '1F607': 'Smiling Face with Halo',
  '1F608': 'Smiling Face with Horns',
  '1F609': 'Winking Face',
  '1F60A': 'Smiling Face with Smiling Eyes',
  '1F60B': 'Face Savoring Food',
  '1F60C': 'Relieved Face',
  '1F60D': 'Smiling Face with Heart-Eyes',
  '1F60E': 'Smiling Face with Sunglasses',
  '1F60F': 'Smirking Face',
  // Add more as needed, or use a Unicode database
};

function categorizeEmoji(filename) {
  const codepoint = filename.replace('.png', '').split('-')[0];
  
  // Check each category pattern
  for (const [category, pattern] of Object.entries(CATEGORIES)) {
    if (pattern.test(codepoint)) {
      return category;
    }
  }
  
  // Default fallback based on first digit
  if (codepoint.startsWith('1F6')) return 'emotions';
  if (codepoint.startsWith('1F3')) return 'nature';
  if (codepoint.startsWith('1F4')) return 'objects';
  if (codepoint.startsWith('1F1')) return 'flags';
  if (codepoint.startsWith('1F9')) return 'objects';
  
  return 'objects'; // Default category
}

function generateName(filename) {
  const codepoint = filename.replace('.png', '').split('-')[0];
  
  // Use known Unicode names if available
  if (UNICODE_NAMES[codepoint]) {
    return UNICODE_NAMES[codepoint];
  }
  
  // Generate a basic name from the codepoint
  const cleanName = codepoint
    .replace(/1F/g, '')
    .split('')
    .map((char, i) => i % 2 === 0 ? char : char.toLowerCase())
    .join('');
    
  return `Emoji ${codepoint}`;
}

function generatePreview(filename) {
  // For now, just use the filename as preview
  // In a real implementation, you'd convert Unicode to actual emoji character
  return filename.replace('.png', '');
}

async function generateRegistry() {
  const pngDir = path.join(__dirname, '../public/png-emojis');
  
  if (!fs.existsSync(pngDir)) {
    console.error('PNG emoji directory not found:', pngDir);
    process.exit(1);
  }
  
  const files = fs.readdirSync(pngDir)
    .filter(file => file.endsWith('.png'))
    .sort();
  
  console.log(`Found ${files.length} PNG emoji files`);
  
  const icons = files.map(filename => {
    const category = categorizeEmoji(filename);
    const name = generateName(filename);
    const preview = generatePreview(filename);
    
    return {
      name,
      category,
      path: `/png-emojis/${filename}`,
      preview
    };
  });
  
  // Group by category for stats
  const categoryStats = {};
  icons.forEach(icon => {
    categoryStats[icon.category] = (categoryStats[icon.category] || 0) + 1;
  });
  
  console.log('Category distribution:', categoryStats);
  
  // Generate the TypeScript file
  const registryContent = `/**
 * Auto-generated PNG emoji registry
 * Generated from ${files.length} PNG files on ${new Date().toISOString()}
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

// Auto-generated PNG emoji registry (${files.length} emojis)
export const iconRegistry: IconInfo[] = [
${icons.map(icon => `  {
    name: "${icon.name}",
    category: "${icon.category}",
    path: "${icon.path}",
    preview: "${icon.preview}",
  }`).join(',\n')}
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
  const displayNames: Record<string, string> = ${JSON.stringify(CATEGORY_NAMES, null, 2)};
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
    preview: stamp.thumbnail
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
export const CATEGORY_STATS = ${JSON.stringify(categoryStats, null, 2)};
export const TOTAL_EMOJIS = ${files.length};
export const GENERATED_AT = "${new Date().toISOString()}";
`;

  // Write the generated file
  const outputPath = path.join(__dirname, '../src/utils/iconRegistry.ts');
  fs.writeFileSync(outputPath, registryContent);
  
  console.log(`✅ Generated ${outputPath} with ${files.length} emojis`);
  console.log('Categories:', Object.keys(categoryStats).join(', '));
  console.log('Run the script again whenever PNG files change');
}

generateRegistry().catch(console.error);