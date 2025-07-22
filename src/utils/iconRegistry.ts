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

// Helper function to get emoji path
const emojiPath = (code: string) => `/src/assets/emojis/openmoji-svg-color/${code}.svg`;

export const iconRegistry: IconInfo[] = [
  // Emotions & Faces
  { name: 'Grinning Face', category: 'emotions', path: emojiPath('1F600'), preview: emojiPath('1F600') },
  { name: 'Beaming Face with Smiling Eyes', category: 'emotions', path: emojiPath('1F601'), preview: emojiPath('1F601') },
  { name: 'Face with Tears of Joy', category: 'emotions', path: emojiPath('1F602'), preview: emojiPath('1F602') },
  { name: 'Smiling Face with Heart-Eyes', category: 'emotions', path: emojiPath('1F60D'), preview: emojiPath('1F60D') },
  { name: 'Thinking Face', category: 'emotions', path: emojiPath('1F914'), preview: emojiPath('1F914') },
  { name: 'Winking Face', category: 'emotions', path: emojiPath('1F609'), preview: emojiPath('1F609') },
  { name: 'Worried Face', category: 'emotions', path: emojiPath('1F61F'), preview: emojiPath('1F61F') },
  { name: 'Angry Face', category: 'emotions', path: emojiPath('1F620'), preview: emojiPath('1F620') },
  { name: 'Crying Face', category: 'emotions', path: emojiPath('1F622'), preview: emojiPath('1F622') },
  { name: 'Face with Medical Mask', category: 'emotions', path: emojiPath('1F637'), preview: emojiPath('1F637') },
  { name: 'Face with Monocle', category: 'emotions', path: emojiPath('1F9D0'), preview: emojiPath('1F9D0') },
  { name: 'Sleeping Face', category: 'emotions', path: emojiPath('1F634'), preview: emojiPath('1F634') },
  
  // Animals
  { name: 'Cat Face', category: 'animals', path: emojiPath('1F431'), preview: emojiPath('1F431') },
  { name: 'Dog Face', category: 'animals', path: emojiPath('1F436'), preview: emojiPath('1F436') },
  { name: 'Fox Face', category: 'animals', path: emojiPath('1F98A'), preview: emojiPath('1F98A') },
  { name: 'Lion', category: 'animals', path: emojiPath('1F981'), preview: emojiPath('1F981') },
  { name: 'Tiger Face', category: 'animals', path: emojiPath('1F42F'), preview: emojiPath('1F42F') },
  { name: 'Horse Face', category: 'animals', path: emojiPath('1F434'), preview: emojiPath('1F434') },
  { name: 'Cow Face', category: 'animals', path: emojiPath('1F42E'), preview: emojiPath('1F42E') },
  { name: 'Monkey Face', category: 'animals', path: emojiPath('1F435'), preview: emojiPath('1F435') },
  { name: 'Panda Face', category: 'animals', path: emojiPath('1F43C'), preview: emojiPath('1F43C') },
  { name: 'Penguin', category: 'animals', path: emojiPath('1F427'), preview: emojiPath('1F427') },
  { name: 'Bird', category: 'animals', path: emojiPath('1F426'), preview: emojiPath('1F426') },
  { name: 'Frog Face', category: 'animals', path: emojiPath('1F438'), preview: emojiPath('1F438') },
  { name: 'Turtle', category: 'animals', path: emojiPath('1F422'), preview: emojiPath('1F422') },
  { name: 'Fish', category: 'animals', path: emojiPath('1F41F'), preview: emojiPath('1F41F') },
  { name: 'Octopus', category: 'animals', path: emojiPath('1F419'), preview: emojiPath('1F419') },
  { name: 'Butterfly', category: 'animals', path: emojiPath('1F98B'), preview: emojiPath('1F98B') },
  
  // Food & Drink
  { name: 'Red Apple', category: 'food', path: emojiPath('1F34E'), preview: emojiPath('1F34E') },
  { name: 'Green Apple', category: 'food', path: emojiPath('1F34F'), preview: emojiPath('1F34F') },
  { name: 'Banana', category: 'food', path: emojiPath('1F34C'), preview: emojiPath('1F34C') },
  { name: 'Grapes', category: 'food', path: emojiPath('1F347'), preview: emojiPath('1F347') },
  { name: 'Watermelon', category: 'food', path: emojiPath('1F349'), preview: emojiPath('1F349') },
  { name: 'Strawberry', category: 'food', path: emojiPath('1F353'), preview: emojiPath('1F353') },
  { name: 'Pizza', category: 'food', path: emojiPath('1F355'), preview: emojiPath('1F355') },
  { name: 'Hamburger', category: 'food', path: emojiPath('1F354'), preview: emojiPath('1F354') },
  { name: 'Popcorn', category: 'food', path: emojiPath('1F37F'), preview: emojiPath('1F37F') },
  { name: 'Birthday Cake', category: 'food', path: emojiPath('1F382'), preview: emojiPath('1F382') },
  { name: 'Cookie', category: 'food', path: emojiPath('1F36A'), preview: emojiPath('1F36A') },
  { name: 'Hot Beverage', category: 'food', path: emojiPath('2615'), preview: emojiPath('2615') },
  
  // Nature
  { name: 'Seedling', category: 'nature', path: emojiPath('1F331'), preview: emojiPath('1F331') },
  { name: 'Evergreen Tree', category: 'nature', path: emojiPath('1F332'), preview: emojiPath('1F332') },
  { name: 'Palm Tree', category: 'nature', path: emojiPath('1F334'), preview: emojiPath('1F334') },
  { name: 'Cactus', category: 'nature', path: emojiPath('1F335'), preview: emojiPath('1F335') },
  { name: 'Tulip', category: 'nature', path: emojiPath('1F337'), preview: emojiPath('1F337') },
  { name: 'Cherry Blossom', category: 'nature', path: emojiPath('1F338'), preview: emojiPath('1F338') },
  { name: 'Rose', category: 'nature', path: emojiPath('1F339'), preview: emojiPath('1F339') },
  { name: 'Hibiscus', category: 'nature', path: emojiPath('1F33A'), preview: emojiPath('1F33A') },
  { name: 'Sunflower', category: 'nature', path: emojiPath('1F33B'), preview: emojiPath('1F33B') },
  { name: 'Sun', category: 'nature', path: emojiPath('2600'), preview: emojiPath('2600') },
  { name: 'Crescent Moon', category: 'nature', path: emojiPath('1F319'), preview: emojiPath('1F319') },
  { name: 'Cloud', category: 'nature', path: emojiPath('2601'), preview: emojiPath('2601') },
  { name: 'Rainbow', category: 'nature', path: emojiPath('1F308'), preview: emojiPath('1F308') },
  
  // Objects
  { name: 'Gift', category: 'objects', path: emojiPath('1F381'), preview: emojiPath('1F381') },
  { name: 'Balloon', category: 'objects', path: emojiPath('1F388'), preview: emojiPath('1F388') },
  { name: 'Party Popper', category: 'objects', path: emojiPath('1F389'), preview: emojiPath('1F389') },
  { name: 'Wrapped Gift', category: 'objects', path: emojiPath('1F381'), preview: emojiPath('1F381') },
  { name: 'Light Bulb', category: 'objects', path: emojiPath('1F4A1'), preview: emojiPath('1F4A1') },
  { name: 'Locked', category: 'objects', path: emojiPath('1F512'), preview: emojiPath('1F512') },
  { name: 'Unlocked', category: 'objects', path: emojiPath('1F513'), preview: emojiPath('1F513') },
  { name: 'Key', category: 'objects', path: emojiPath('1F511'), preview: emojiPath('1F511') },
  { name: 'Magnifying Glass', category: 'objects', path: emojiPath('1F50D'), preview: emojiPath('1F50D') },
  { name: 'Bomb', category: 'objects', path: emojiPath('1F4A3'), preview: emojiPath('1F4A3') },
  { name: 'Pill', category: 'objects', path: emojiPath('1F48A'), preview: emojiPath('1F48A') },
  { name: 'Syringe', category: 'objects', path: emojiPath('1F489'), preview: emojiPath('1F489') },
  { name: 'Microscope', category: 'objects', path: emojiPath('1F52C'), preview: emojiPath('1F52C') },
  { name: 'Telescope', category: 'objects', path: emojiPath('1F52D'), preview: emojiPath('1F52D') },
  
  // Activities
  { name: 'Soccer Ball', category: 'activities', path: emojiPath('26BD'), preview: emojiPath('26BD') },
  { name: 'Baseball', category: 'activities', path: emojiPath('26BE'), preview: emojiPath('26BE') },
  { name: 'Basketball', category: 'activities', path: emojiPath('1F3C0'), preview: emojiPath('1F3C0') },
  { name: 'Football', category: 'activities', path: emojiPath('1F3C8'), preview: emojiPath('1F3C8') },
  { name: 'Tennis', category: 'activities', path: emojiPath('1F3BE'), preview: emojiPath('1F3BE') },
  { name: 'Bowling', category: 'activities', path: emojiPath('1F3B3'), preview: emojiPath('1F3B3') },
  { name: 'Trophy', category: 'activities', path: emojiPath('1F3C6'), preview: emojiPath('1F3C6') },
  { name: 'Medal', category: 'activities', path: emojiPath('1F3C5'), preview: emojiPath('1F3C5') },
  { name: 'Ticket', category: 'activities', path: emojiPath('1F3AB'), preview: emojiPath('1F3AB') },
  { name: 'Musical Note', category: 'activities', path: emojiPath('1F3B5'), preview: emojiPath('1F3B5') },
  { name: 'Guitar', category: 'activities', path: emojiPath('1F3B8'), preview: emojiPath('1F3B8') },
  
  // Symbols
  { name: 'Red Heart', category: 'symbols', path: emojiPath('2764'), preview: emojiPath('2764') },
  { name: 'Green Heart', category: 'symbols', path: emojiPath('1F49A'), preview: emojiPath('1F49A') },
  { name: 'Blue Heart', category: 'symbols', path: emojiPath('1F499'), preview: emojiPath('1F499') },
  { name: 'Sparkles', category: 'symbols', path: emojiPath('2728'), preview: emojiPath('2728') },
  { name: 'Star', category: 'symbols', path: emojiPath('2B50'), preview: emojiPath('2B50') },
  { name: 'Lightning Bolt', category: 'symbols', path: emojiPath('26A1'), preview: emojiPath('26A1') },
  { name: 'Check Mark', category: 'symbols', path: emojiPath('2714'), preview: emojiPath('2714') },
  { name: 'Cross Mark', category: 'symbols', path: emojiPath('274C'), preview: emojiPath('274C') },
  { name: 'Question Mark', category: 'symbols', path: emojiPath('2753'), preview: emojiPath('2753') },
  { name: 'Exclamation Mark', category: 'symbols', path: emojiPath('2757'), preview: emojiPath('2757') },
  { name: 'Warning', category: 'symbols', path: emojiPath('26A0'), preview: emojiPath('26A0') },
  { name: 'Recycling Symbol', category: 'symbols', path: emojiPath('267B'), preview: emojiPath('267B') },
  { name: 'Prohibited', category: 'symbols', path: emojiPath('1F6AB'), preview: emojiPath('1F6AB') },
  
  // Travel & Places
  { name: 'Rocket', category: 'travel', path: emojiPath('1F680'), preview: emojiPath('1F680') },
  { name: 'Airplane', category: 'travel', path: emojiPath('2708'), preview: emojiPath('2708') },
  { name: 'Automobile', category: 'travel', path: emojiPath('1F697'), preview: emojiPath('1F697') },
  { name: 'Bus', category: 'travel', path: emojiPath('1F68C'), preview: emojiPath('1F68C') },
  { name: 'Train', category: 'travel', path: emojiPath('1F686'), preview: emojiPath('1F686') },
  { name: 'Bicycle', category: 'travel', path: emojiPath('1F6B2'), preview: emojiPath('1F6B2') },
  { name: 'Motorcycle', category: 'travel', path: emojiPath('1F3CD'), preview: emojiPath('1F3CD') },
  { name: 'Ship', category: 'travel', path: emojiPath('1F6A2'), preview: emojiPath('1F6A2') },
  
  // Weather
  { name: 'Umbrella', category: 'weather', path: emojiPath('2614'), preview: emojiPath('2614') },
  { name: 'Snowflake', category: 'weather', path: emojiPath('2744'), preview: emojiPath('2744') },
  { name: 'Snowman', category: 'weather', path: emojiPath('2603'), preview: emojiPath('2603') },
  { name: 'Comet', category: 'weather', path: emojiPath('2604'), preview: emojiPath('2604') },
  { name: 'Fire', category: 'weather', path: emojiPath('1F525'), preview: emojiPath('1F525') },
  { name: 'Droplet', category: 'weather', path: emojiPath('1F4A7'), preview: emojiPath('1F4A7') },
  { name: 'Thunder Cloud and Rain', category: 'weather', path: emojiPath('26C8'), preview: emojiPath('26C8') },
  
  // Hands & People
  { name: 'Thumbs Up', category: 'hands', path: emojiPath('1F44D'), preview: emojiPath('1F44D') },
  { name: 'Thumbs Down', category: 'hands', path: emojiPath('1F44E'), preview: emojiPath('1F44E') },
  { name: 'Clapping Hands', category: 'hands', path: emojiPath('1F44F'), preview: emojiPath('1F44F') },
  { name: 'Raised Hand', category: 'hands', path: emojiPath('270B'), preview: emojiPath('270B') },
  { name: 'OK Hand', category: 'hands', path: emojiPath('1F44C'), preview: emojiPath('1F44C') },
  { name: 'Victory Hand', category: 'hands', path: emojiPath('270C'), preview: emojiPath('270C') },
  { name: 'Waving Hand', category: 'hands', path: emojiPath('1F44B'), preview: emojiPath('1F44B') },
  
  // Keep some of the original icons as a backup
  { name: 'Star (Original)', category: 'original', path: '/icons/objects/star.svg', preview: '⭐' },
  { name: 'Heart (Original)', category: 'original', path: '/icons/objects/heart.svg', preview: '❤️' },
  { name: 'Lightning (Original)', category: 'original', path: '/icons/objects/lightning.svg', preview: '⚡' },
  { name: 'Check Mark (Original)', category: 'original', path: '/icons/objects/checkmark.svg', preview: '✅' },
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
    'original': 'Original Icons'
  };
  
  return categoryMap[category] || category.charAt(0).toUpperCase() + category.slice(1);
};
