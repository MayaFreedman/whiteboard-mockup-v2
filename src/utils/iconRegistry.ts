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

// Use the existing icon assets that are known to work
export const iconRegistry: IconInfo[] = [
  // Emotions - use original icons and emoji characters
  {
    name: "Happy",
    category: "emotions",
    path: "./assets/emojis/openmoji-svg-color/E09C.svg",
    preview: "😊",
  },
  {
    name: "Sad",
    category: "emotions",
    path: "/src/assets/icons/emotions/sad.svg",
    preview: "😢",
  },
  {
    name: "Love",
    category: "emotions",
    path: "./assets/icons/emotions/love.svg",
    preview: "😍",
  },
  {
    name: "Angry",
    category: "emotions",
    path: "/src/assets/icons/emotions/angry.svg",
    preview: "😠",
  },
  {
    name: "Surprised",
    category: "emotions",
    path: "/src/assets/icons/emotions/surprised.svg",
    preview: "😮",
  },

  // Animals
  {
    name: "Dog",
    category: "animals",
    path: "/src/assets/icons/animals/dog.svg",
    preview: "🐶",
  },
  {
    name: "Cat",
    category: "animals",
    path: "/src/assets/icons/animals/cat.svg",
    preview: "🐱",
  },
  {
    name: "Bird",
    category: "animals",
    path: "/src/assets/icons/animals/bird.svg",
    preview: "🐦",
  },
  {
    name: "Fish",
    category: "animals",
    path: "/src/assets/icons/animals/fish.svg",
    preview: "🐟",
  },

  // Nature
  {
    name: "Sun",
    category: "nature",
    path: "/src/assets/icons/nature/sun.svg",
    preview: "☀️",
  },
  {
    name: "Moon",
    category: "nature",
    path: "/src/assets/icons/nature/moon.svg",
    preview: "🌙",
  },
  {
    name: "Tree",
    category: "nature",
    path: "/src/assets/icons/nature/tree.svg",
    preview: "🌳",
  },
  {
    name: "Flower",
    category: "nature",
    path: "/src/assets/icons/nature/flower.svg",
    preview: "🌸",
  },

  // Objects
  {
    name: "Heart",
    category: "objects",
    path: "/src/assets/icons/objects/heart.svg",
    preview: "❤️",
  },
  {
    name: "Star",
    category: "objects",
    path: "/src/assets/icons/objects/star.svg",
    preview: "⭐",
  },
  {
    name: "Lightning",
    category: "objects",
    path: "/src/assets/icons/objects/lightning.svg",
    preview: "⚡",
  },
  {
    name: "Check Mark",
    category: "objects",
    path: "/src/assets/icons/objects/checkmark.svg",
    preview: "✅",
  },
  {
    name: "X Mark",
    category: "objects",
    path: "/src/assets/icons/objects/x-mark.svg",
    preview: "❌",
  },
  {
    name: "Question",
    category: "objects",
    path: "/src/assets/icons/objects/question.svg",
    preview: "❓",
  },
  {
    name: "Exclamation",
    category: "objects",
    path: "/src/assets/icons/objects/exclamation.svg",
    preview: "❗",
  },
  {
    name: "Thumbs Up",
    category: "objects",
    path: "/src/assets/icons/objects/thumbs-up.svg",
    preview: "👍",
  },
  {
    name: "Thumbs Down",
    category: "objects",
    path: "/src/assets/icons/objects/thumbs-down.svg",
    preview: "👎",
  },

  // Symbols
  {
    name: "Plus",
    category: "symbols",
    path: "/src/assets/icons/symbols/plus.svg",
    preview: "➕",
  },
  {
    name: "Minus",
    category: "symbols",
    path: "/src/assets/icons/symbols/minus.svg",
    preview: "➖",
  },
  {
    name: "Up Arrow",
    category: "symbols",
    path: "/src/assets/icons/arrows/up.svg",
    preview: "⬆️",
  },
  {
    name: "Down Arrow",
    category: "symbols",
    path: "/src/assets/icons/arrows/down.svg",
    preview: "⬇️",
  },
  {
    name: "Left Arrow",
    category: "symbols",
    path: "/src/assets/icons/arrows/left.svg",
    preview: "⬅️",
  },
  {
    name: "Right Arrow",
    category: "symbols",
    path: "/src/assets/icons/arrows/right.svg",
    preview: "➡️",
  },

  // Fantasy SVGs
  {
    name: "Fantasy Collection",
    category: "fantasy",
    path: "./assets/.svg",
    preview: "",
  },

  ///src/assets/fantasy.svg', preview: '🧙' },
  {
    name: "Religious Collection",
    category: "fantasy",
    path: "/src/assets/religious.svg",
    preview: "⛪",
  },
  {
    name: "Sports Collection",
    category: "activities",
    path: "/src/assets/sports.svg",
    preview: "⚽",
  },
  {
    name: "Animals Collection",
    category: "animals",
    path: "/src/assets/Animals.svg",
    preview: "🦁",
  },
  {
    name: "Plants Collection",
    category: "nature",
    path: "/src/assets/Plants.svg",
    preview: "🌿",
  },
  {
    name: "Vehicles Collection",
    category: "travel",
    path: "/src/assets/Vehicles.svg",
    preview: "🚗",
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
