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
  
  // People & Body - More precise mapping
  people: [
    /^1F385/, // Santa Claus
    /^1F46[0-9A-F]/, // People (1F460-1F46F)
    /^1F47[0-9A-F]/, // People and fantasy (1F470-1F47F)
    /^1F481/, // Information desk person
    /^1F482/, // Guardsman
    /^1F486/, // Face massage
    /^1F487/, // Haircut
    /^1F575/, // Detective (man in business suit levitating)
    /^1F57A/, // Man dancing
    /^1F590/, // Raised hand with fingers splayed
    /^1F595/, // Middle finger
    /^1F596/, // Vulcan salute
    /^1F64[0-9A-F]/, // Gestures (1F640-1F64F)
    /^1F6B[4-6]/, // People activities (1F6B4-1F6B6)
    /^1F6C[0-1]/, // Bath, sleeping (1F6C0-1F6C1)
    /^1F926/, // Face palm
    /^1F930/, // Pregnant woman
    /^1F931/, // Breast feeding
    /^1F932/, // Palms up together
    /^1F933/, // Selfie
    /^1F934/, // Prince
    /^1F935/, // Person in tuxedo
    /^1F936/, // Mrs. Claus
    /^1F937/, // Shrug
    /^1F938/, // Person doing cartwheel
    /^1F939/, // Person juggling
    /^1F93A/, // Person fencing
    /^1F93C/, // Wrestlers
    /^1F93D/, // Water polo
    /^1F93E/, // Handball
    /^1F9B[0-3]/, // Hair types (1F9B0-1F9B3)
    /^1F9D[0-9A-F]/, // People with various activities (1F9D0-1F9DF)
    /^1F9DD/, // Elf
    /^1F9DE/, // Genie
    /^1F9DF/, // Zombie
  ],
  
  // Animals & Nature (1F300-1F43F)
  'animals-nature': [
    /^1F3[0-2][0-9A-F]/, // Weather, landscapes (1F300-1F32F)
    /^1F33[0-F]/, // Plants (1F330-1F33F)
    /^1F40[0-9A-F]/, // Animals (1F400-1F40F)
    /^1F41[0-9A-F]/, // Animals (1F410-1F41F)
    /^1F42[0-9A-F]/, // Animals (1F420-1F42F)
    /^1F43[0-9A-F]/, // Animals (1F430-1F43F)
    /^1F54[A-F]/, // Dove, spider, web (1F54A-1F54F)
    /^1F577/, // Spider
    /^1F578/, // Spider web
    /^1F98[0-9A-F]/, // Animals (1F980-1F98F)
    /^1F99[0-9A-F]/, // Animals (1F990-1F99F)
    /^1F9A[0-9A-F]/, // Animals (1F9A0-1F9AF)
    /^1F9B[4-9A-F]/, // Animals (1F9B4-1F9BF)
  ],
  
  // Food & Drink (1F32D-1F37F, 1F950-1F96F)
  'food-drink': [
    /^1F32[D-F]/, // Hot dog, taco, burrito (1F32D-1F32F)
    /^1F34[4-9A-F]/, // Food items (1F344-1F34F)
    /^1F35[0-9A-F]/, // Food items (1F350-1F35F)
    /^1F36[0-9A-F]/, // Food items (1F360-1F36F)
    /^1F37[0-9A-F]/, // Drinks (1F370-1F37F)
    /^1F95[0-9A-F]/, // Food (1F950-1F95F)
    /^1F96[0-9A-F]/, // Food (1F960-1F96F)
    /^1F9C[0-9A-F]/, // Food (1F9C0-1F9CF)
  ],
  
  // Activities & Sports - More precise
  activities: [
    /^1F38[0-9A-F]/, // Celebrations, events (1F380-1F38F)
    /^1F39[0-9A-F]/, // Entertainment (1F390-1F39F)
    /^1F3A[0-9A-F]/, // Entertainment, music (1F3A0-1F3AF)
    /^1F3B[0-9A-F]/, // Music, arts (1F3B0-1F3BF)
    /^1F3C[0-9A-F]/, // Sports (1F3C0-1F3CF)
    /^1F3E[0-9A-F]/, // Buildings (1F3E0-1F3EF)
    /^1F3F[0-9A-F]/, // Flags, buildings (1F3F0-1F3FF)
    /^1F94[0-6]/, // Sports (1F940-1F946)
    /^1F947/, // Sports medals (1F947)
    /^1F948/, // Sports medals (1F948)
    /^1F949/, // Sports medals (1F949)
    /^1F94A/, // Boxing glove (1F94A)
    /^1F94B/, // Martial arts uniform (1F94B)
    /^1F94C/, // Curling stone (1F94C)
    /^1F94D/, // Lacrosse (1F94D)
    /^1F94E/, // Softball (1F94E)
    /^1F94F/, // Flying disc (1F94F)
    /^1F6F7/, // Sled (1F6F7)
    /^1F6F8/, // Flying saucer (1F6F8)
    /^1F945/, // Goal net (1F945)
  ],
  
  // Travel & Places (1F680-1F6FF)
  'travel-places': [
    /^1F68[0-9A-F]/, // Vehicles (1F680-1F68F)
    /^1F69[0-9A-F]/, // Vehicles (1F690-1F69F)
    /^1F6A[0-9A-F]/, // Transport signs (1F6A0-1F6AF)
    /^1F6B[0-3]/, // Transport (1F6B0-1F6B3)
    /^1F6B[7-9A-F]/, // Transport (1F6B7-1F6BF)
    /^1F6C[2-5]/, // Transport (1F6C2-1F6C5)
    /^1F6D[0-9A-F]/, // Transport (1F6D0-1F6DF)
    /^1F6E[0-9A-F]/, // Transport (1F6E0-1F6EF)
    /^1F6F[0-9A-F]/, // Transport (1F6F0-1F6FF)
    /^1F9F[0-9A-F]/, // Various vehicles (1F9F0-1F9FF)
  ],
  
  // Objects & Symbols (1F4A0-1F5FF, various others)
  objects: [
    /^1F4[A-F][0-9A-F]/, // Objects (1F4A0-1F4FF)
    /^1F50[0-9A-F]/, // Objects (1F500-1F50F)
    /^1F51[0-9A-F]/, // Objects (1F510-1F51F)
    /^1F52[0-9A-F]/, // Objects (1F520-1F52F)
    /^1F53[0-9A-F]/, // Objects (1F530-1F53F)
    /^1F56[0-9A-F]/, // Objects (1F560-1F56F)
    /^1F57[0-9]/, // Clock faces (1F570-1F579)
    /^1F576/, // Sunglasses
    /^1F579/, // Joystick
    /^1F587/, // Linked paperclips
    /^1F58[A-D]/, // Pen, pencil (1F58A-1F58D)
    /^1F590/, // Hand (moved to people above)
    /^1F5A[4-5]/, // Printer, trackball (1F5A4-1F5A5)
    /^1F5A8/, // Computer mouse (1F5A8)
    /^1F5B[1-2]/, // File folders (1F5B1-1F5B2)
    /^1F5BC/, // Frame with picture (1F5BC)
    /^1F5C[2-4]/, // File cabinets (1F5C2-1F5C4)
    /^1F5D[1-3]/, // File folders (1F5D1-1F5D3)
    /^1F5DC/, // Compression (1F5DC)
    /^1F5DD/, // Old key (1F5DD)
    /^1F5DE/, // Rolled up newspaper (1F5DE)
    /^1F5E[1-3]/, // Newspaper, calendar (1F5E1-1F5E3)
    /^1F5E8/, // Left speech bubble (1F5E8)
    /^1F5EF/, // Right anger bubble (1F5EF)
    /^1F5F3/, // Ballot box (1F5F3)
    /^1F5FA/, // World map (1F5FA)
    /^1F5FB/, // Mount Fuji (1F5FB)
    /^1F5FC/, // Tokyo Tower (1F5FC)
    /^1F5FD/, // Statue of Liberty (1F5FD)
    /^1F5FE/, // Silhouette of Japan (1F5FE)
    /^1F5FF/, // Moyai (1F5FF)
    /^1F97[0-9A-F]/, // Various objects (1F970-1F97F)
  ],
  
  // Country Flags (1F1E6-1F1FF combinations)
  flags: /^1F1[E-F][0-9A-F](-1F1[E-F][0-9A-F])?$/,
  
  // Math & Symbols (2000-2BFF, various)
  symbols: [
    /^(2[0-9A-F][0-9A-F][0-9A-F]|00[0-9A-F][0-9A-F])/,
    /^1F19[0-9A-F]/, // Squared symbols (1F190-1F19F)
    /^1F20[0-9A-F]/, // Squared symbols (1F200-1F20F)
    /^1F21[0-9A-F]/, // Squared symbols (1F210-1F21F)
    /^1F22[0-9A-F]/, // Squared symbols (1F220-1F22F)
    /^1F23[0-9A-F]/, // Squared symbols (1F230-1F23F)
    /^1F25[0-9A-F]/, // Transport symbols (1F250-1F25F)
    /^1F30[0-9A-F]/, // Miscellaneous symbols (overlaps removed)
  ],
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
  
  // Check each category with array support
  for (const [category, patterns] of Object.entries(CATEGORY_MAPPINGS)) {
    if (Array.isArray(patterns)) {
      // Check each pattern in the array
      for (const pattern of patterns) {
        if (pattern.test(primaryCodepoint)) {
          return category;
        }
      }
    } else {
      // Single pattern
      if (patterns.test(primaryCodepoint)) {
        return category;
      }
    }
  }
  
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