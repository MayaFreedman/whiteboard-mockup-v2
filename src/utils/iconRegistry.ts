
/**
 * Icon registry for stamp icons
 * Maps icon names to their file paths for dynamic loading
 * Uses authentic OpenMoji SVG files
 */

export interface IconInfo {
  name: string;
  category: string;
  path: string;
  preview: string; // Path to preview image or emoji character
}

// Use only authentic OpenMoji files from the user's collection
export const iconRegistry: IconInfo[] = [
  // Emotions - using correct Unicode codepoints
  {
    name: "Grinning Face",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F600.svg",
    preview: "😀",
  },
  {
    name: "Beaming Face",
    category: "emotions", 
    path: "/emojis/openmoji-svg-color (1)/1F601.svg",
    preview: "😁",
  },
  {
    name: "Face with Tears of Joy",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F602.svg",
    preview: "😂",
  },
  {
    name: "Grinning Face with Big Eyes",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F603.svg",
    preview: "😃",
  },
  {
    name: "Smiling Face with Smiling Eyes",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F60A.svg",
    preview: "😊",
  },
  {
    name: "Winking Face",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F609.svg",
    preview: "😉",
  },
  {
    name: "Smiling Face with Heart-Eyes",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F60D.svg",
    preview: "😍",
  },
  {
    name: "Smiling Face with Sunglasses",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F60E.svg",
    preview: "😎",
  },
  {
    name: "Face Blowing a Kiss",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F617.svg",
    preview: "😗",
  },
  {
    name: "Thinking Face",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F914.svg",
    preview: "🤔",
  },
  {
    name: "Crying Face",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F622.svg",
    preview: "😢",
  },
  {
    name: "Angry Face",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F620.svg",
    preview: "😠",
  },
  {
    name: "Astonished Face",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F632.svg",
    preview: "😲",
  },
  {
    name: "Neutral Face",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F610.svg",
    preview: "😐",
  },
  {
    name: "Confused Face",
    category: "emotions",
    path: "/emojis/openmoji-svg-color (1)/1F615.svg",
    preview: "😕",
  },

  // Animals
  {
    name: "Dog Face",
    category: "animals",
    path: "/emojis/openmoji-svg-color (1)/1F436.svg",
    preview: "🐶",
  },
  {
    name: "Cat Face",
    category: "animals",
    path: "/emojis/openmoji-svg-color (1)/1F431.svg",
    preview: "🐱",
  },
  {
    name: "Mouse Face",
    category: "animals",
    path: "/emojis/openmoji-svg-color (1)/1F42D.svg",
    preview: "🐭",
  },
  {
    name: "Hamster Face",
    category: "animals",
    path: "/emojis/openmoji-svg-color (1)/1F439.svg",
    preview: "🐹",
  },
  {
    name: "Rabbit Face",
    category: "animals",
    path: "/emojis/openmoji-svg-color (1)/1F430.svg",
    preview: "🐰",
  },
  {
    name: "Fox Face",
    category: "animals",
    path: "/emojis/openmoji-svg-color (1)/1F98A.svg",
    preview: "🦊",
  },
  {
    name: "Bear Face",
    category: "animals",
    path: "/emojis/openmoji-svg-color (1)/1F43B.svg",
    preview: "🐻",
  },
  {
    name: "Panda Face",
    category: "animals",
    path: "/emojis/openmoji-svg-color (1)/1F43C.svg",
    preview: "🐼",
  },
  {
    name: "Monkey Face",
    category: "animals",
    path: "/emojis/openmoji-svg-color (1)/1F435.svg",
    preview: "🐵",
  },
  {
    name: "Chicken",
    category: "animals",
    path: "/emojis/openmoji-svg-color (1)/1F414.svg",
    preview: "🐔",
  },
  {
    name: "Penguin",
    category: "animals",
    path: "/emojis/openmoji-svg-color (1)/1F427.svg",
    preview: "🐧",
  },
  {
    name: "Fish",
    category: "animals",
    path: "/emojis/openmoji-svg-color (1)/1F41F.svg",
    preview: "🐟",
  },

  // Nature
  {
    name: "Sun",
    category: "nature",
    path: "/emojis/openmoji-svg-color (1)/2600.svg",
    preview: "☀️",
  },
  {
    name: "Crescent Moon",
    category: "nature",
    path: "/emojis/openmoji-svg-color (1)/1F319.svg",
    preview: "🌙",
  },
  {
    name: "Full Moon",
    category: "nature",
    path: "/emojis/openmoji-svg-color (1)/1F315.svg",
    preview: "🌕",
  },
  {
    name: "Deciduous Tree",
    category: "nature",
    path: "/emojis/openmoji-svg-color (1)/1F333.svg",
    preview: "🌳",
  },
  {
    name: "Evergreen Tree",
    category: "nature",
    path: "/emojis/openmoji-svg-color (1)/1F332.svg",
    preview: "🌲",
  },
  {
    name: "Tulip",
    category: "nature",
    path: "/emojis/openmoji-svg-color (1)/1F337.svg",
    preview: "🌷",
  },
  {
    name: "Rose",
    category: "nature",
    path: "/emojis/openmoji-svg-color (1)/1F339.svg",
    preview: "🌹",
  },
  {
    name: "Sunflower",
    category: "nature",
    path: "/emojis/openmoji-svg-color (1)/1F33B.svg",
    preview: "🌻",
  },
  {
    name: "Blossom",
    category: "nature",
    path: "/emojis/openmoji-svg-color (1)/1F33C.svg",
    preview: "🌼",
  },
  {
    name: "Rainbow",
    category: "nature",
    path: "/emojis/openmoji-svg-color (1)/1F308.svg",
    preview: "🌈",
  },
  {
    name: "Cloud",
    category: "nature",
    path: "/emojis/openmoji-svg-color (1)/2601.svg",
    preview: "☁️",
  },
  {
    name: "Lightning",
    category: "nature",
    path: "/emojis/openmoji-svg-color (1)/26A1.svg",
    preview: "⚡",
  },

  // Objects & Symbols
  {
    name: "Red Heart",
    category: "objects",
    path: "/emojis/openmoji-svg-color (1)/2764.svg",
    preview: "❤️",
  },
  {
    name: "Blue Heart",
    category: "objects",
    path: "/emojis/openmoji-svg-color (1)/1F499.svg",
    preview: "💙",
  },
  {
    name: "Green Heart",
    category: "objects",
    path: "/emojis/openmoji-svg-color (1)/1F49A.svg",
    preview: "💚",
  },
  {
    name: "Yellow Heart",
    category: "objects",
    path: "/emojis/openmoji-svg-color (1)/1F49B.svg",
    preview: "💛",
  },
  {
    name: "Gift",
    category: "objects",
    path: "/emojis/openmoji-svg-color (1)/1F381.svg",
    preview: "🎁",
  },
  {
    name: "Birthday Cake",
    category: "objects",
    path: "/emojis/openmoji-svg-color (1)/1F382.svg",
    preview: "🎂",
  },
  {
    name: "Trophy",
    category: "objects",
    path: "/emojis/openmoji-svg-color (1)/1F3C6.svg",
    preview: "🏆",
  },
  {
    name: "Crown",
    category: "objects",
    path: "/emojis/openmoji-svg-color (1)/1F451.svg",
    preview: "👑",
  },
  {
    name: "Key",
    category: "objects",
    path: "/emojis/openmoji-svg-color (1)/1F511.svg",
    preview: "🔑",
  },
  {
    name: "Gem Stone",
    category: "objects",
    path: "/emojis/openmoji-svg-color (1)/1F48E.svg",
    preview: "💎",
  },

  // Symbols
  {
    name: "Star",
    category: "symbols",
    path: "/emojis/openmoji-svg-color (1)/2B50.svg",
    preview: "⭐",
  },
  {
    name: "Sparkles",
    category: "symbols",
    path: "/emojis/openmoji-svg-color (1)/2728.svg",
    preview: "✨",
  },
  {
    name: "Fire",
    category: "symbols",
    path: "/emojis/openmoji-svg-color (1)/1F525.svg",
    preview: "🔥",
  },
  {
    name: "Check Mark",
    category: "symbols",
    path: "/emojis/openmoji-svg-color (1)/2714.svg",
    preview: "✔️",
  },
  {
    name: "Cross Mark",
    category: "symbols",
    path: "/emojis/openmoji-svg-color (1)/274C.svg",
    preview: "❌",
  },
  {
    name: "Question Mark",
    category: "symbols",
    path: "/emojis/openmoji-svg-color (1)/2753.svg",
    preview: "❓",
  },
  {
    name: "Exclamation Mark",
    category: "symbols",
    path: "/emojis/openmoji-svg-color (1)/2757.svg",
    preview: "❗",
  },
  {
    name: "Musical Note",
    category: "symbols",
    path: "/emojis/openmoji-svg-color (1)/1F3B5.svg",
    preview: "🎵",
  },

  // Travel & Places
  {
    name: "Airplane",
    category: "travel",
    path: "/emojis/openmoji-svg-color (1)/2708.svg",
    preview: "✈️",
  },
  {
    name: "Castle",
    category: "travel",
    path: "/emojis/openmoji-svg-color (1)/1F3F0.svg",
    preview: "🏰",
  },
  {
    name: "House",
    category: "travel",
    path: "/emojis/openmoji-svg-color (1)/1F3E0.svg",
    preview: "🏠",
  },
  {
    name: "School",
    category: "travel",
    path: "/emojis/openmoji-svg-color (1)/1F3EB.svg",
    preview: "🏫",
  },
  {
    name: "Car",
    category: "travel",
    path: "/emojis/openmoji-svg-color (1)/1F697.svg",
    preview: "🚗",
  },
  {
    name: "Bicycle",
    category: "travel",
    path: "/emojis/openmoji-svg-color (1)/1F6B2.svg",
    preview: "🚲",
  },
  {
    name: "Ship",
    category: "travel",
    path: "/emojis/openmoji-svg-color (1)/1F6A2.svg",
    preview: "🚢",
  },
  {
    name: "Rocket",
    category: "travel",
    path: "/emojis/openmoji-svg-color (1)/1F680.svg",
    preview: "🚀",
  },
  {
    name: "Mountain",
    category: "travel",
    path: "/emojis/openmoji-svg-color (1)/26F0.svg",
    preview: "⛰️",
  },
  {
    name: "Beach",
    category: "travel",
    path: "/emojis/openmoji-svg-color (1)/1F3D6.svg",
    preview: "🏖️",
  },

  // Food & Drink
  {
    name: "Apple",
    category: "food",
    path: "/emojis/openmoji-svg-color (1)/1F34E.svg",
    preview: "🍎",
  },
  {
    name: "Banana",
    category: "food",
    path: "/emojis/openmoji-svg-color (1)/1F34C.svg",
    preview: "🍌",
  },
  {
    name: "Orange",
    category: "food",
    path: "/emojis/openmoji-svg-color (1)/1F34A.svg",
    preview: "🍊",
  },
  {
    name: "Grapes",
    category: "food",
    path: "/emojis/openmoji-svg-color (1)/1F347.svg",
    preview: "🍇",
  },
  {
    name: "Strawberry",
    category: "food",
    path: "/emojis/openmoji-svg-color (1)/1F353.svg",
    preview: "🍓",
  },
  {
    name: "Pizza",
    category: "food",
    path: "/emojis/openmoji-svg-color (1)/1F355.svg",
    preview: "🍕",
  },
  {
    name: "Hamburger",
    category: "food",
    path: "/emojis/openmoji-svg-color (1)/1F354.svg",
    preview: "🍔",
  },
  {
    name: "Hot Dog",
    category: "food",
    path: "/emojis/openmoji-svg-color (1)/1F32D.svg",
    preview: "🌭",
  },
  {
    name: "Ice Cream",
    category: "food",
    path: "/emojis/openmoji-svg-color (1)/1F366.svg",
    preview: "🍦",
  },
  {
    name: "Coffee",
    category: "food",
    path: "/emojis/openmoji-svg-color (1)/2615.svg",
    preview: "☕",
  },
];

/**
 * Get icon by path
 */
export const getIconByPath = (path: string): IconInfo | undefined => {
  return iconRegistry.find((icon) => icon.path === path);
};

/**
 * Get icons by category
 */
export const getIconsByCategory = (category: string): IconInfo[] => {
  return iconRegistry.filter((icon) => icon.category === category);
};

/**
 * Get all categories
 */
export const getCategories = (): string[] => {
  return [...new Set(iconRegistry.map((icon) => icon.category))];
};

/**
 * Gets human-readable category name
 */
export const getCategoryDisplayName = (category: string): string => {
  const categoryMap: Record<string, string> = {
    emotions: "Emotions & Faces",
    animals: "Animals",
    food: "Food & Drink",
    nature: "Nature",
    objects: "Objects",
    symbols: "Symbols",
    activities: "Activities & Sports",
    travel: "Travel & Places",
    weather: "Weather",
    hands: "Hands & People",
    fantasy: "Fantasy & Religion",
  };

  return (
    categoryMap[category] ||
    category.charAt(0).toUpperCase() + category.slice(1)
  );
};
