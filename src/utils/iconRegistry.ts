import { getCustomStamps } from './customStamps';

// Import local SVG icons
import angryIcon from '../assets/icons/emotions/angry.svg';
import happyIcon from '../assets/icons/emotions/happy.svg';
import loveIcon from '../assets/icons/emotions/love.svg';
import sadIcon from '../assets/icons/emotions/sad.svg';
import surprisedIcon from '../assets/icons/emotions/surprised.svg';

import birdIcon from '../assets/icons/animals/bird.svg';
import catIcon from '../assets/icons/animals/cat.svg';
import dogIcon from '../assets/icons/animals/dog.svg';
import fishIcon from '../assets/icons/animals/fish.svg';

import flowerIcon from '../assets/icons/nature/flower.svg';
import moonIcon from '../assets/icons/nature/moon.svg';
import sunIcon from '../assets/icons/nature/sun.svg';
import treeIcon from '../assets/icons/nature/tree.svg';

import checkmarkIcon from '../assets/icons/objects/checkmark.svg';
import exclamationIcon from '../assets/icons/objects/exclamation.svg';
import heartIcon from '../assets/icons/objects/heart.svg';
import lightningIcon from '../assets/icons/objects/lightning.svg';
import questionIcon from '../assets/icons/objects/question.svg';
import starIcon from '../assets/icons/objects/star.svg';
import thumbsDownIcon from '../assets/icons/objects/thumbs-down.svg';
import thumbsUpIcon from '../assets/icons/objects/thumbs-up.svg';
import xMarkIcon from '../assets/icons/objects/x-mark.svg';

import minusIcon from '../assets/icons/symbols/minus.svg';
import plusIcon from '../assets/icons/symbols/plus.svg';

import downIcon from '../assets/icons/arrows/down.svg';
import leftIcon from '../assets/icons/arrows/left.svg';
import rightIcon from '../assets/icons/arrows/right.svg';
import upIcon from '../assets/icons/arrows/up.svg';

// Define the structure for each icon entry
interface IconEntry {
  name: string;
  category:
    | 'emotions'
    | 'animals'
    | 'nature'
    | 'objects'
    | 'symbols'
    | 'arrows'
    | 'custom';
  path: string; // SVG path or URL
  preview: string; // SVG path for preview
}

// Define the local icon registry
export const iconRegistry: IconEntry[] = [
  // Emotions
  { name: 'Angry', category: 'emotions', path: angryIcon, preview: angryIcon },
  { name: 'Happy', category: 'emotions', path: happyIcon, preview: happyIcon },
  { name: 'Love', category: 'emotions', path: loveIcon, preview: loveIcon },
  { name: 'Sad', category: 'emotions', path: sadIcon, preview: sadIcon },
  { name: 'Surprised', category: 'emotions', path: surprisedIcon, preview: surprisedIcon },

  // Animals
  { name: 'Bird', category: 'animals', path: birdIcon, preview: birdIcon },
  { name: 'Cat', category: 'animals', path: catIcon, preview: catIcon },
  { name: 'Dog', category: 'animals', path: dogIcon, preview: dogIcon },
  { name: 'Fish', category: 'animals', path: fishIcon, preview: fishIcon },

  // Nature
  { name: 'Flower', category: 'nature', path: flowerIcon, preview: flowerIcon },
  { name: 'Moon', category: 'nature', path: moonIcon, preview: moonIcon },
  { name: 'Sun', category: 'nature', path: sunIcon, preview: sunIcon },
  { name: 'Tree', category: 'nature', path: treeIcon, preview: treeIcon },

  // Objects
  { name: 'Checkmark', category: 'objects', path: checkmarkIcon, preview: checkmarkIcon },
  { name: 'Exclamation', category: 'objects', path: exclamationIcon, preview: exclamationIcon },
  { name: 'Heart', category: 'objects', path: heartIcon, preview: heartIcon },
  { name: 'Lightning', category: 'objects', path: lightningIcon, preview: lightningIcon },
  { name: 'Question', category: 'objects', path: questionIcon, preview: questionIcon },
  { name: 'Star', category: 'objects', path: starIcon, preview: starIcon },
  { name: 'Thumbs Down', category: 'objects', path: thumbsDownIcon, preview: thumbsDownIcon },
  { name: 'Thumbs Up', category: 'objects', path: thumbsUpIcon, preview: thumbsUpIcon },
  { name: 'X Mark', category: 'objects', path: xMarkIcon, preview: xMarkIcon },

  // Symbols
  { name: 'Minus', category: 'symbols', path: minusIcon, preview: minusIcon },
  { name: 'Plus', category: 'symbols', path: plusIcon, preview: plusIcon },

  // Arrows
  { name: 'Down', category: 'arrows', path: downIcon, preview: downIcon },
  { name: 'Left', category: 'arrows', path: leftIcon, preview: leftIcon },
  { name: 'Right', category: 'arrows', path: rightIcon, preview: rightIcon },
  { name: 'Up', category: 'arrows', path: upIcon, preview: upIcon },
];

/**
 * Get all available categories including custom if there are custom stamps
 */
export function getCategories(): string[] {
  const baseCategories = [...new Set(iconRegistry.map(icon => icon.category))];
  const customStamps = getCustomStamps();
  
  if (customStamps.length > 0) {
    return [...baseCategories, 'custom'];
  }
  
  return baseCategories;
}

/**
 * Get icons by category, including custom stamps
 */
export function getIconsByCategory(category: string) {
  if (category === 'custom') {
    const customStamps = getCustomStamps();
    return customStamps.map(stamp => ({
      name: stamp.name,
      category: 'custom' as const,
      path: stamp.dataUrl,
      preview: stamp.preview
    }));
  }
  
  return iconRegistry.filter(icon => icon.category === category);
}

/**
 * Get display name for category
 */
export function getCategoryDisplayName(category: string): string {
  const displayNames: Record<string, string> = {
    emotions: 'Emotions',
    animals: 'Animals',
    nature: 'Nature',
    objects: 'Objects',
    symbols: 'Symbols',
    arrows: 'Arrows',
    custom: 'Custom'
  };
  
  return displayNames[category] || category.charAt(0).toUpperCase() + category.slice(1);
}
