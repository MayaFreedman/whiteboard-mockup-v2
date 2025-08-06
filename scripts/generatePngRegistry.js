/**
 * Auto-generates complete PNG emoji registry from /public/png-emojis directory
 * Scans all PNG files and categorizes them properly
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Better category mapping based on Unicode ranges
const CATEGORY_MAPPINGS = {
  // Emotions & Faces (1F600-1F64F)
  emotions: /^1F6[0-4][0-9A-F]/,
  
  // People & Body (1F385, 1F3C0-1F3FF, 1F400-1F4FF with people)
  people: /^1F(3[C-F][0-9A-F]|4[6-9][0-9A-F]|9[3-9][0-9A-F]|38[5-9])/,
  
  // Animals & Nature (1F300-1F5FF excluding people/objects)
  'animals-nature': /^1F(3[0-5][0-9A-F]|40[0-6][0-9A-F]|41[0-9A-F]|42[0-9A-F]|43[0-9A-F])/,
  
  // Food & Drink (1F32D-1F37F, 1F950-1F96F)
  'food-drink': /^1F(32[D-F]|3[3-7][0-9A-F]|95[0-F]|96[0-F])/,
  
  // Activities & Sports (1F3A0-1F3C3, 1F680-1F6C5)
  activities: /^1F(3A[0-9A-F]|3B[0-9A-F]|68[0-9A-F]|69[0-9A-F]|6A[0-9A-F]|6B[0-9A-F]|6C[0-5])/,
  
  // Travel & Places (1F680-1F6FF, 1F700-1F77F)
  'travel-places': /^1F(6[8-F][0-9A-F]|7[0-7][0-9A-F])/,
  
  // Objects & Symbols (1F4A0-1F4FF, 1F500-1F5FF)
  objects: /^1F([4-5][A-F][0-9A-F]|52[0-9A-F]|53[0-9A-F]|54[0-9A-F]|55[0-9A-F]|56[0-9A-F]|57[0-9A-F]|58[0-9A-F]|59[0-9A-F]|5A[0-9A-F]|5B[0-9A-F]|5C[0-9A-F]|5D[0-9A-F]|5E[0-9A-F]|5F[0-9A-F])/,
  
  // Country Flags (1F1E6-1F1FF combinations)
  flags: /^1F1[E-F][0-9A-F](-1F1[E-F][0-9A-F])?$/,
  
  // Math & Symbols (2000-2BFF)
  symbols: /^(2[0-9A-F][0-9A-F][0-9A-F]|00[0-9A-F][0-9A-F])/,
};

// Enhanced Unicode name database
const UNICODE_NAMES = {
  // Emotions
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
  '1F610': 'Neutral Face',
  '1F611': 'Expressionless Face',
  '1F612': 'Unamused Face',
  '1F613': 'Downcast Face with Sweat',
  '1F614': 'Pensive Face',
  '1F615': 'Confused Face',
  '1F616': 'Confounded Face',
  '1F617': 'Kissing Face',
  '1F618': 'Face Blowing a Kiss',
  '1F619': 'Kissing Face with Smiling Eyes',
  '1F61A': 'Kissing Face with Closed Eyes',
  '1F61B': 'Face with Tongue',
  '1F61C': 'Winking Face with Tongue',
  '1F61D': 'Squinting Face with Tongue',
  '1F61E': 'Disappointed Face',
  '1F61F': 'Worried Face',
  '1F620': 'Angry Face',
  '1F621': 'Pouting Face',
  '1F622': 'Crying Face',
  '1F623': 'Persevering Face',
  '1F624': 'Face with Steam From Nose',
  '1F625': 'Sad but Relieved Face',
  '1F626': 'Frowning Face with Open Mouth',
  '1F627': 'Anguished Face',
  '1F628': 'Fearful Face',
  '1F629': 'Weary Face',
  '1F62A': 'Sleepy Face',
  '1F62B': 'Tired Face',
  '1F62C': 'Grimacing Face',
  '1F62D': 'Loudly Crying Face',
  '1F62E': 'Face with Open Mouth',
  '1F62F': 'Hushed Face',
  '1F630': 'Anxious Face with Sweat',
  '1F631': 'Face Screaming in Fear',
  '1F632': 'Astonished Face',
  '1F633': 'Flushed Face',
  '1F634': 'Sleeping Face',
  '1F635': 'Dizzy Face',
  '1F636': 'Face Without Mouth',
  '1F637': 'Face with Medical Mask',
  
  // Common objects & symbols
  '2764': 'Red Heart',
  '2665': 'Heart Suit',
  '2660': 'Spade Suit', 
  '2663': 'Club Suit',
  '2666': 'Diamond Suit',
  '2600': 'Sun',
  '2601': 'Cloud',
  '2602': 'Umbrella',
  '2603': 'Snowman',
  '2604': 'Comet',
  '26A0': 'Warning Sign',
  '26A1': 'High Voltage',
  '2728': 'Sparkles',
  '2B50': 'Star',
  
  // Common activities
  '1F3C0': 'Basketball',
  '1F3C1': 'Checkered Flag',
  '1F3C2': 'Snowboarder',
  '1F3C3': 'Person Running',
  '1F3C4': 'Person Surfing',
  '1F3C5': 'Sports Medal',
  '1F3C6': 'Trophy',
  '1F3C7': 'Horse Racing',
  '1F3C8': 'American Football',
  '1F3C9': 'Rugby Football',
  '1F3CA': 'Person Swimming',
  
  // Travel
  '1F680': 'Rocket',
  '1F681': 'Helicopter',
  '1F682': 'Steam Locomotive',
  '1F683': 'Railway Car',
  '1F684': 'High-Speed Train',
  '1F685': 'Bullet Train',
  '1F686': 'Train',
  '1F687': 'Metro',
  '1F688': 'Light Rail',
  '1F689': 'Station',
  '1F68A': 'Tram',
  '1F68B': 'Tram Car',
  '1F68C': 'Bus',
  '1F68D': 'Oncoming Bus',
  '1F68E': 'Trolleybus',
  '1F68F': 'Bus Stop',
  '1F690': 'Minibus',
  '1F691': 'Ambulance',
  '1F692': 'Fire Engine',
  '1F693': 'Police Car',
  
  // Nature
  '1F300': 'Cyclone',
  '1F301': 'Foggy',
  '1F302': 'Closed Umbrella',
  '1F303': 'Night with Stars',
  '1F304': 'Sunrise Over Mountains',
  '1F305': 'Sunrise',
  '1F306': 'Cityscape at Dusk',
  '1F307': 'Sunset',
  '1F308': 'Rainbow',
  '1F309': 'Bridge at Night',
  '1F30A': 'Water Wave',
  '1F30B': 'Volcano',
  '1F30C': 'Milky Way',
  '1F30D': 'Globe Showing Europe-Africa',
  '1F30E': 'Globe Showing Americas',
  '1F30F': 'Globe Showing Asia-Australia',
  '1F310': 'Globe with Meridians',
  '1F311': 'New Moon',
  '1F312': 'Waxing Crescent Moon',
  '1F313': 'First Quarter Moon',
  '1F314': 'Waxing Gibbous Moon',
  '1F315': 'Full Moon',
  '1F316': 'Waning Gibbous Moon',
  '1F317': 'Last Quarter Moon',
  '1F318': 'Waning Crescent Moon',
  '1F319': 'Crescent Moon',
  '1F31A': 'New Moon Face',
  '1F31B': 'First Quarter Moon Face',
  '1F31C': 'Last Quarter Moon Face',
  '1F31D': 'Full Moon Face',
  '1F31E': 'Sun with Face',
  '1F31F': 'Glowing Star',
  '1F320': 'Shooting Star',
  
  // Food
  '1F32D': 'Hot Dog',
  '1F32E': 'Taco',
  '1F32F': 'Burrito',
  '1F330': 'Chestnut',
  '1F331': 'Seedling',
  '1F332': 'Evergreen Tree',
  '1F333': 'Deciduous Tree',
  '1F334': 'Palm Tree',
  '1F335': 'Cactus',
  '1F336': 'Hot Pepper',
  '1F337': 'Tulip',
  '1F338': 'Cherry Blossom',
  '1F339': 'Rose',
  '1F33A': 'Hibiscus',
  '1F33B': 'Sunflower',
  '1F33C': 'Blossom',
  '1F33D': 'Ear of Corn',
  '1F33E': 'Sheaf of Rice',
  '1F33F': 'Herb',
  '1F340': 'Four Leaf Clover',
  '1F341': 'Maple Leaf',
  '1F342': 'Fallen Leaves',
  '1F343': 'Leaf Fluttering in Wind',
  '1F344': 'Mushroom',
  '1F345': 'Tomato',
  '1F346': 'Eggplant',
  '1F347': 'Grapes',
  '1F348': 'Melon',
  '1F349': 'Watermelon',
  '1F34A': 'Tangerine',
  '1F34B': 'Lemon',
  '1F34C': 'Banana',
  '1F34D': 'Pineapple',
  '1F34E': 'Red Apple',
  '1F34F': 'Green Apple',
  '1F350': 'Pear',
  '1F351': 'Peach',
  '1F352': 'Cherries',
  '1F353': 'Strawberry',
  '1F354': 'Hamburger',
  '1F355': 'Pizza',
  '1F356': 'Meat on Bone',
  '1F357': 'Poultry Leg',
  '1F358': 'Rice Cracker',
  '1F359': 'Rice Ball',
  '1F35A': 'Cooked Rice',
  '1F35B': 'Curry Rice',
  '1F35C': 'Steaming Bowl',
  '1F35D': 'Spaghetti',
  '1F35E': 'Bread',
  '1F35F': 'French Fries',
  '1F360': 'Roasted Sweet Potato',
  '1F361': 'Dango',
  '1F362': 'Oden',
  '1F363': 'Sushi',
  '1F364': 'Fried Shrimp',
  '1F365': 'Fish Cake with Swirl',
  '1F366': 'Soft Ice Cream',
  '1F367': 'Shaved Ice',
  '1F368': 'Ice Cream',
  '1F369': 'Doughnut',
  '1F36A': 'Cookie',
  '1F36B': 'Chocolate Bar',
  '1F36C': 'Candy',
  '1F36D': 'Lollipop',
  '1F36E': 'Custard',
  '1F36F': 'Honey Pot',
  '1F370': 'Shortcake',
  '1F371': 'Bento Box',
  '1F372': 'Pot of Food',
  '1F373': 'Cooking',
  '1F374': 'Fork and Knife',
  '1F375': 'Teacup Without Handle',
  '1F376': 'Sake',
  '1F377': 'Wine Glass',
  '1F378': 'Cocktail Glass',
  '1F379': 'Tropical Drink',
  '1F37A': 'Beer Mug',
  '1F37B': 'Clinking Beer Mugs',
  '1F37C': 'Baby Bottle',
  
  // Country flags (partial list)
  '1F1FA-1F1F8': 'United States Flag',
  '1F1EC-1F1E7': 'United Kingdom Flag',
  '1F1E8-1F1E6': 'Canada Flag',
  '1F1EB-1F1F7': 'France Flag',
  '1F1E9-1F1EA': 'Germany Flag',
  '1F1EF-1F1F5': 'Japan Flag',
  '1F1E8-1F1F3': 'China Flag',
  '1F1EE-1F1F3': 'India Flag',
  '1F1E6-1F1FA': 'Australia Flag',
  '1F1E7-1F1F7': 'Brazil Flag',
  '1F1F7-1F1FA': 'Russia Flag',
  '1F1F0-1F1F7': 'South Korea Flag',
  '1F1EE-1F1F9': 'Italy Flag',
  '1F1EA-1F1F8': 'Spain Flag',
};

function categorizeEmoji(filename) {
  const baseFilename = filename.replace('.png', '');
  
  // Handle flag combinations (two regional indicators)
  if (baseFilename.includes('-') && baseFilename.match(/^1F1[E-F][0-9A-F]-1F1[E-F][0-9A-F]$/)) {
    return 'flags';
  }
  
  // Get the primary codepoint for categorization
  const primaryCodepoint = baseFilename.split('-')[0];
  
  // Check each category
  for (const [category, pattern] of Object.entries(CATEGORY_MAPPINGS)) {
    if (pattern.test(primaryCodepoint)) {
      return category;
    }
  }
  
  // Fallback categorization based on Unicode blocks
  const code = primaryCodepoint.toUpperCase();
  if (code.startsWith('1F6')) {
    if (code >= '1F600' && code <= '1F64F') return 'emotions';
    if (code >= '1F680' && code <= '1F6FF') return 'travel-places';
  }
  if (code.startsWith('1F3')) {
    if (code >= '1F300' && code <= '1F34F') return 'animals-nature';
    if (code >= '1F350' && code <= '1F37F') return 'food-drink';
    if (code >= '1F380' && code <= '1F3CF') return 'activities';
    if (code >= '1F3D0' && code <= '1F3FF') return 'people';
  }
  if (code.startsWith('1F4')) return 'objects';
  if (code.startsWith('1F5')) return 'objects';
  if (code.startsWith('1F9')) return 'people';
  if (code.startsWith('26') || code.startsWith('27') || code.startsWith('2B')) return 'symbols';
  if (code.startsWith('1F1')) return 'flags';
  
  return 'objects'; // Default fallback
}

function generateName(filename) {
  const baseFilename = filename.replace('.png', '');
  
  // Use exact match from Unicode names database
  if (UNICODE_NAMES[baseFilename]) {
    return UNICODE_NAMES[baseFilename];
  }
  
  // Handle skin tone variants
  const baseName = baseFilename.split('-')[0];
  if (UNICODE_NAMES[baseName]) {
    const skinTones = {
      '1F3FB': ' Light Skin Tone',
      '1F3FC': ' Medium-Light Skin Tone', 
      '1F3FD': ' Medium Skin Tone',
      '1F3FE': ' Medium-Dark Skin Tone',
      '1F3FF': ' Dark Skin Tone'
    };
    
    let name = UNICODE_NAMES[baseName];
    const parts = baseFilename.split('-');
    for (let i = 1; i < parts.length; i++) {
      if (skinTones[parts[i]]) {
        name += skinTones[parts[i]];
      } else if (parts[i] === '200D') {
        // Zero-width joiner sequences
        continue;
      } else if (parts[i] === '2640' || parts[i] === 'FE0F') {
        name += ' ♀️';
      } else if (parts[i] === '2642') {
        name += ' ♂️';
      }
    }
    return name;
  }
  
  // Generate fallback name
  return `Emoji ${baseName}`;
}

function generatePreview(filename) {
  // For PNG emojis, we can try to convert Unicode codepoint to actual emoji
  const baseFilename = filename.replace('.png', '');
  
  try {
    // Handle flag sequences
    if (baseFilename.includes('-') && baseFilename.match(/^1F1[E-F][0-9A-F]-1F1[E-F][0-9A-F]$/)) {
      const [first, second] = baseFilename.split('-');
      const firstChar = String.fromCodePoint(parseInt(first, 16));
      const secondChar = String.fromCodePoint(parseInt(second, 16));
      return firstChar + secondChar;
    }
    
    // Handle complex sequences with ZWJ (Zero Width Joiner)
    if (baseFilename.includes('-')) {
      const parts = baseFilename.split('-');
      let result = '';
      for (const part of parts) {
        if (part === '200D') {
          result += '\u200D'; // Zero Width Joiner
        } else if (part === 'FE0F') {
          result += '\uFE0F'; // Variation Selector
        } else {
          result += String.fromCodePoint(parseInt(part, 16));
        }
      }
      return result;
    }
    
    // Simple single codepoint
    return String.fromCodePoint(parseInt(baseFilename, 16));
  } catch (error) {
    // Fallback to filename
    return baseFilename;
  }
}

async function generateRegistry() {
  const pngDir = path.join(__dirname, '../public/png-emojis');
  
  if (!fs.existsSync(pngDir)) {
    console.error('❌ PNG emoji directory not found:', pngDir);
    process.exit(1);
  }
  
  const files = fs.readdirSync(pngDir)
    .filter(file => file.endsWith('.png') && !file.includes('delete_emoji') && !file.includes('deleted_files'))
    .sort();
  
  console.log(`📁 Found ${files.length} PNG emoji files`);
  
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
  
  console.log('📊 Category distribution:');
  Object.entries(categoryStats)
    .sort(([,a], [,b]) => b - a)
    .forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count} emojis`);
    });
  
  // Generate the TypeScript file
  const registryContent = `/**
 * Auto-generated PNG emoji registry
 * Generated from ${files.length} PNG files on ${new Date().toISOString()}
 * 
 * Categories: ${Object.keys(categoryStats).join(', ')}
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
    name: "${icon.name.replace(/"/g, '\\"')}",
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
  const displayNames: Record<string, string> = {
    'emotions': 'Emotions & Faces',
    'people': 'People & Body',
    'animals-nature': 'Animals & Nature', 
    'food-drink': 'Food & Drink',
    'activities': 'Activities & Sports',
    'travel-places': 'Travel & Places',
    'objects': 'Objects & Symbols',
    'symbols': 'Symbols',
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
export const CATEGORY_STATS = ${JSON.stringify(categoryStats, null, 2)};
export const TOTAL_EMOJIS = ${files.length};
export const GENERATED_AT = "${new Date().toISOString()}";
`;

  // Write the generated file
  const outputPath = path.join(__dirname, '../src/utils/iconRegistry.ts');
  fs.writeFileSync(outputPath, registryContent, 'utf8');
  
  console.log(`✅ Generated ${outputPath} with ${files.length} emojis`);
  console.log(`📋 Categories: ${Object.keys(categoryStats).join(', ')}`);
  console.log('🔄 Registry updated! Restart your dev server to see changes.');
}

generateRegistry().catch(console.error);