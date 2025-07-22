
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
    name: "Deciduous Tree",
    category: "nature",
    path: "/emojis/openmoji-svg-color (1)/1F333.svg",
    preview: "🌳",
  },
  {
    name: "Tulip",
    category: "nature",
    path: "/emojis/openmoji-svg-color (1)/1F337.svg",
    preview: "🌷",
  },

  // Objects & Symbols
  {
    name: "Red Heart",
    category: "objects",
    path: "/emojis/openmoji-svg-color (1)/2764.svg",
    preview: "❤️",
  },
  {
    name: "Star",
    category: "symbols",
    path: "/emojis/openmoji-svg-color (1)/2B50.svg",
    preview: "⭐",
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
