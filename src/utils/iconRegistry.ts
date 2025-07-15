/**
 * Icon registry for stamp icons
 * Maps icon names to their file paths for dynamic loading
 */

export interface IconInfo {
  name: string;
  category: string;
  path: string;
  preview: string; // For grid display
}

export const iconRegistry: IconInfo[] = [
  // Emotions
  { name: 'Happy', category: 'emotions', path: '/icons/emotions/happy.svg', preview: '😊' },
  { name: 'Sad', category: 'emotions', path: '/icons/emotions/sad.svg', preview: '😢' },
  { name: 'Angry', category: 'emotions', path: '/icons/emotions/angry.svg', preview: '😠' },
  { name: 'Surprised', category: 'emotions', path: '/icons/emotions/surprised.svg', preview: '😲' },
  { name: 'Love', category: 'emotions', path: '/icons/emotions/love.svg', preview: '😍' },
  
  // Objects
  { name: 'Star', category: 'objects', path: '/icons/objects/star.svg', preview: '⭐' },
  { name: 'Heart', category: 'objects', path: '/icons/objects/heart.svg', preview: '❤️' },
  { name: 'Lightning', category: 'objects', path: '/icons/objects/lightning.svg', preview: '⚡' },
  { name: 'Check Mark', category: 'objects', path: '/icons/objects/checkmark.svg', preview: '✅' },
  { name: 'X Mark', category: 'objects', path: '/icons/objects/x-mark.svg', preview: '❌' },
  { name: 'Question', category: 'objects', path: '/icons/objects/question.svg', preview: '❓' },
  { name: 'Exclamation', category: 'objects', path: '/icons/objects/exclamation.svg', preview: '❗' },
  { name: 'Thumbs Up', category: 'objects', path: '/icons/objects/thumbs-up.svg', preview: '👍' },
  { name: 'Thumbs Down', category: 'objects', path: '/icons/objects/thumbs-down.svg', preview: '👎' },
  
  // Animals
  { name: 'Cat', category: 'animals', path: '/icons/animals/cat.svg', preview: '🐱' },
  { name: 'Dog', category: 'animals', path: '/icons/animals/dog.svg', preview: '🐶' },
  { name: 'Bird', category: 'animals', path: '/icons/animals/bird.svg', preview: '🐦' },
  { name: 'Fish', category: 'animals', path: '/icons/animals/fish.svg', preview: '🐟' },
  
  // Nature
  { name: 'Sun', category: 'nature', path: '/icons/nature/sun.svg', preview: '☀️' },
  { name: 'Moon', category: 'nature', path: '/icons/nature/moon.svg', preview: '🌙' },
  { name: 'Tree', category: 'nature', path: '/icons/nature/tree.svg', preview: '🌳' },
  { name: 'Flower', category: 'nature', path: '/icons/nature/flower.svg', preview: '🌸' },
  
  // Arrows
  { name: 'Arrow Up', category: 'arrows', path: '/icons/arrows/up.svg', preview: '⬆️' },
  { name: 'Arrow Down', category: 'arrows', path: '/icons/arrows/down.svg', preview: '⬇️' },
  { name: 'Arrow Left', category: 'arrows', path: '/icons/arrows/left.svg', preview: '⬅️' },
  { name: 'Arrow Right', category: 'arrows', path: '/icons/arrows/right.svg', preview: '➡️' },
  
  // Symbols
  { name: 'Plus', category: 'symbols', path: '/icons/symbols/plus.svg', preview: '➕' },
  { name: 'Minus', category: 'symbols', path: '/icons/symbols/minus.svg', preview: '➖' },
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