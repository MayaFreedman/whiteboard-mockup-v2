/**
 * Icon registry for stamp icons
 * Maps icon names to their file paths for dynamic loading
 */

export interface IconInfo {
  name: string;
  category: string;
  path: string;
  preview: string; // Path to preview image or emoji character
}

// Helper function to create OpenMoji emoji paths (relative to public folder)
const emojiPath = (code: string) => `./assets/emojis/openmoji-svg-color/${code}.svg`;

// Base icon registry with existing working icons
export const iconRegistry: IconInfo[] = [
  // Emotions - use emoji codes for OpenMoji
  { name: 'Grinning Face', category: 'emotions', path: emojiPath('1F600'), preview: '😀' },
  { name: 'Grinning Face with Eyes', category: 'emotions', path: emojiPath('1F601'), preview: '😁' },
  { name: 'Face with Tears of Joy', category: 'emotions', path: emojiPath('1F602'), preview: '😂' },
  { name: 'Smiling Face with Open Mouth', category: 'emotions', path: emojiPath('1F603'), preview: '😃' },
  { name: 'Heart Eyes', category: 'emotions', path: emojiPath('1F60D'), preview: '😍' },
  { name: 'Winking Face', category: 'emotions', path: emojiPath('1F609'), preview: '😉' },
  { name: 'Smiling Face with Sunglasses', category: 'emotions', path: emojiPath('1F60E'), preview: '😎' },
  { name: 'Kissing Face', category: 'emotions', path: emojiPath('1F617'), preview: '😗' },
  { name: 'Thinking Face', category: 'emotions', path: emojiPath('1F914'), preview: '🤔' },
  { name: 'Crying Face', category: 'emotions', path: emojiPath('1F622'), preview: '😢' },

  // Animals - use emoji codes  
  { name: 'Dog Face', category: 'animals', path: emojiPath('1F436'), preview: '🐶' },
  { name: 'Cat Face', category: 'animals', path: emojiPath('1F431'), preview: '🐱' },
  { name: 'Mouse Face', category: 'animals', path: emojiPath('1F42D'), preview: '🐭' },
  { name: 'Bear Face', category: 'animals', path: emojiPath('1F43B'), preview: '🐻' },
  { name: 'Panda Face', category: 'animals', path: emojiPath('1F43C'), preview: '🐼' },
  { name: 'Lion Face', category: 'animals', path: emojiPath('1F981'), preview: '🦁' },
  { name: 'Tiger Face', category: 'animals', path: emojiPath('1F42F'), preview: '🐯' },
  { name: 'Monkey Face', category: 'animals', path: emojiPath('1F435'), preview: '🐵' },

  // Food - use emoji codes
  { name: 'Apple', category: 'food', path: emojiPath('1F34E'), preview: '🍎' },
  { name: 'Banana', category: 'food', path: emojiPath('1F34C'), preview: '🍌' },
  { name: 'Orange', category: 'food', path: emojiPath('1F34A'), preview: '🍊' },
  { name: 'Strawberry', category: 'food', path: emojiPath('1F353'), preview: '🍓' },
  { name: 'Pizza', category: 'food', path: emojiPath('1F355'), preview: '🍕' },
  { name: 'Hamburger', category: 'food', path: emojiPath('1F354'), preview: '🍔' },
  { name: 'Birthday Cake', category: 'food', path: emojiPath('1F382'), preview: '🎂' },
  { name: 'Ice Cream', category: 'food', path: emojiPath('1F366'), preview: '🍦' },

  // Nature - use emoji codes
  { name: 'Sun', category: 'nature', path: emojiPath('2600'), preview: '☀️' },
  { name: 'Moon', category: 'nature', path: emojiPath('1F319'), preview: '🌙' },
  { name: 'Star', category: 'nature', path: emojiPath('2B50'), preview: '⭐' },
  { name: 'Tree', category: 'nature', path: emojiPath('1F333'), preview: '🌳' },
  { name: 'Flower', category: 'nature', path: emojiPath('1F337'), preview: '🌷' },
  { name: 'Rainbow', category: 'nature', path: emojiPath('1F308'), preview: '🌈' },
  { name: 'Lightning', category: 'nature', path: emojiPath('26A1'), preview: '⚡' },
  { name: 'Fire', category: 'nature', path: emojiPath('1F525'), preview: '🔥' },

  // Objects - use emoji codes
  { name: 'Heart', category: 'objects', path: emojiPath('2764'), preview: '❤️' },
  { name: 'Check Mark', category: 'objects', path: emojiPath('2705'), preview: '✅' },
  { name: 'Cross Mark', category: 'objects', path: emojiPath('274C'), preview: '❌' },
  { name: 'Thumbs Up', category: 'objects', path: emojiPath('1F44D'), preview: '👍' },
  { name: 'Thumbs Down', category: 'objects', path: emojiPath('1F44E'), preview: '👎' },
  { name: 'Trophy', category: 'objects', path: emojiPath('1F3C6'), preview: '🏆' },
  { name: 'Gift', category: 'objects', path: emojiPath('1F381'), preview: '🎁' },
  { name: 'Crown', category: 'objects', path: emojiPath('1F451'), preview: '👑' },

  // Activities - use emoji codes
  { name: 'Soccer Ball', category: 'activities', path: emojiPath('26BD'), preview: '⚽' },
  { name: 'Basketball', category: 'activities', path: emojiPath('1F3C0'), preview: '🏀' },
  { name: 'Tennis Ball', category: 'activities', path: emojiPath('1F3BE'), preview: '🎾' },
  { name: 'Musical Note', category: 'activities', path: emojiPath('1F3B5'), preview: '🎵' },
  { name: 'Guitar', category: 'activities', path: emojiPath('1F3B8'), preview: '🎸' },
  { name: 'Game Controller', category: 'activities', path: emojiPath('1F3AE'), preview: '🎮' },
  { name: 'Balloon', category: 'activities', path: emojiPath('1F388'), preview: '🎈' },
  { name: 'Party Popper', category: 'activities', path: emojiPath('1F389'), preview: '🎉' },

  // Travel - use emoji codes  
  { name: 'Car', category: 'travel', path: emojiPath('1F697'), preview: '🚗' },
  { name: 'Airplane', category: 'travel', path: emojiPath('2708'), preview: '✈️' },
  { name: 'Rocket', category: 'travel', path: emojiPath('1F680'), preview: '🚀' },
  { name: 'House', category: 'travel', path: emojiPath('1F3E0'), preview: '🏠' },
  { name: 'Castle', category: 'travel', path: emojiPath('1F3F0'), preview: '🏰' },
  { name: 'Beach Umbrella', category: 'travel', path: emojiPath('1F3D6'), preview: '🏖️' },
  { name: 'Mountain', category: 'travel', path: emojiPath('26F0'), preview: '⛰️' },
  { name: 'Earth', category: 'travel', path: emojiPath('1F30D'), preview: '🌍' },

  // Symbols - use emoji codes
  { name: 'Plus', category: 'symbols', path: emojiPath('2795'), preview: '➕' },
  { name: 'Minus', category: 'symbols', path: emojiPath('2796'), preview: '➖' },
  { name: 'Question Mark', category: 'symbols', path: emojiPath('2753'), preview: '❓' },
  { name: 'Exclamation Mark', category: 'symbols', path: emojiPath('2757'), preview: '❗' },
  { name: 'Up Arrow', category: 'symbols', path: emojiPath('2B06'), preview: '⬆️' },
  { name: 'Down Arrow', category: 'symbols', path: emojiPath('2B07'), preview: '⬇️' },
  { name: 'Left Arrow', category: 'symbols', path: emojiPath('2B05'), preview: '⬅️' },
  { name: 'Right Arrow', category: 'symbols', path: emojiPath('27A1'), preview: '➡️' }
];

/**
 * Get icon by path
 */
export const getIconByPath = (path: string): IconInfo | undefined => {
  return iconRegistry.find(icon => icon.path === path);
};

/**
 * Get icons by category
 */
export const getIconsByCategory = (category: string): IconInfo[] => {
  return iconRegistry.filter(icon => icon.category === category);
};

/**
 * Get all categories
 */
export const getCategories = (): string[] => {
  return [...new Set(iconRegistry.map(icon => icon.category))];
};

/**
 * Gets human-readable category name
 */
export const getCategoryDisplayName = (category: string): string => {
  const categoryMap: Record<string, string> = {
    'emotions': 'Emotions & Faces',
    'animals': 'Animals',
    'food': 'Food & Drink',
    'nature': 'Nature',
    'objects': 'Objects',
    'symbols': 'Symbols',
    'activities': 'Activities & Sports',
    'travel': 'Travel & Places',
    'weather': 'Weather',
    'hands': 'Hands & People',
    'fantasy': 'Fantasy & Religion'
  };
  
  return categoryMap[category] || category.charAt(0).toUpperCase() + category.slice(1);
};