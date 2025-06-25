
export interface ToolSettingConfig {
  type: 'slider' | 'badges' | 'select' | 'toggleGroup' | 'grid' | 'text';
  label: string;
  key: string;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ value: string; label: string }>;
  items?: Array<{ value: string; label: string; icon?: string }>;
  gridItems?: Array<{ name: string; url: string; preview: string }>;
  showValue?: boolean;
  valueFormatter?: (value: any) => string;
}

export interface ToolConfig {
  name: string;
  displayName: string;
  description?: string;
  settings: ToolSettingConfig[];
  hasPropertiesPanel?: boolean;
}

export const toolsConfig: Record<string, ToolConfig> = {
  pencil: {
    name: 'pencil',
    displayName: 'Pencil',
    settings: [
      {
        type: 'slider',
        label: 'Stroke Width',
        key: 'strokeWidth',
        min: 1,
        max: 20,
        step: 1,
        showValue: true,
        valueFormatter: (value) => `${value}px`
      },
      {
        type: 'slider',
        label: 'Opacity',
        key: 'opacity',
        min: 0.1,
        max: 1,
        step: 0.1,
        showValue: true,
        valueFormatter: (value) => `${Math.round(value * 100)}%`
      }
    ]
  },
  brush: {
    name: 'brush',
    displayName: 'Brush',
    settings: [
      {
        type: 'badges',
        label: 'Brush Type',
        key: 'brushType',
        items: [
          { value: 'paintbrush', label: 'paintbrush' },
          { value: 'chalk', label: 'chalk' },
          { value: 'spray', label: 'spray' },
          { value: 'crayon', label: 'crayon' }
        ]
      },
      {
        type: 'slider',
        label: 'Stroke Width',
        key: 'strokeWidth',
        min: 1,
        max: 20,
        step: 1,
        showValue: true,
        valueFormatter: (value) => `${value}px`
      },
      {
        type: 'slider',
        label: 'Opacity',
        key: 'opacity',
        min: 0.1,
        max: 1,
        step: 0.1,
        showValue: true,
        valueFormatter: (value) => `${Math.round(value * 100)}%`
      }
    ]
  },
  text: {
    name: 'text',
    displayName: 'Text',
    settings: [
      {
        type: 'slider',
        label: 'Font Size',
        key: 'fontSize',
        min: 8,
        max: 72,
        step: 2,
        showValue: true,
        valueFormatter: (value) => `${value}px`
      },
      {
        type: 'select',
        label: 'Font Family',
        key: 'fontFamily',
        options: [
          { value: 'Arial', label: 'Arial' },
          { value: 'Helvetica', label: 'Helvetica' },
          { value: 'Times New Roman', label: 'Times New Roman' },
          { value: 'Courier New', label: 'Courier New' },
          { value: 'Georgia', label: 'Georgia' },
          { value: 'Verdana', label: 'Verdana' }
        ]
      },
      {
        type: 'toggleGroup',
        label: 'Text Formatting',
        key: 'textFormatting',
        items: [
          { value: 'textBold', label: 'Bold', icon: 'Bold' },
          { value: 'textItalic', label: 'Italic', icon: 'Italic' },
          { value: 'textUnderline', label: 'Underline', icon: 'Underline' }
        ]
      }
    ]
  },
  stamp: {
    name: 'stamp',
    displayName: 'Stamp',
    settings: [
      {
        type: 'slider',
        label: 'Stamp Size',
        key: 'strokeWidth',
        min: 5,
        max: 20,
        step: 1,
        showValue: true,
        valueFormatter: (value) => `${value * 10}px`
      },
      {
        type: 'grid',
        label: 'Emoji Stamps',
        key: 'selectedSticker',
        gridItems: [
          // Faces & Emotions
          { name: 'Happy Face', url: '😊', preview: '😊' },
          { name: 'Laughing', url: '😂', preview: '😂' },
          { name: 'Heart Eyes', url: '😍', preview: '😍' },
          { name: 'Cool', url: '😎', preview: '😎' },
          { name: 'Wink', url: '😉', preview: '😉' },
          { name: 'Thinking', url: '🤔', preview: '🤔' },
          { name: 'Shocked', url: '😱', preview: '😱' },
          { name: 'Crying', url: '😭', preview: '😭' },
          { name: 'Angry', url: '😡', preview: '😡' },
          { name: 'Sleepy', url: '😴', preview: '😴' },
          
          // Hearts & Symbols
          { name: 'Red Heart', url: '❤️', preview: '❤️' },
          { name: 'Star', url: '⭐', preview: '⭐' },
          { name: 'Lightning', url: '⚡', preview: '⚡' },
          { name: 'Fire', url: '🔥', preview: '🔥' },
          { name: 'Sparkles', url: '✨', preview: '✨' },
          { name: 'Check Mark', url: '✅', preview: '✅' },
          { name: 'Cross Mark', url: '❌', preview: '❌' },
          { name: 'Question Mark', url: '❓', preview: '❓' },
          { name: 'Exclamation', url: '❗', preview: '❗' },
          { name: 'Warning', url: '⚠️', preview: '⚠️' },
          
          // Animals
          { name: 'Cat', url: '🐱', preview: '🐱' },
          { name: 'Dog', url: '🐶', preview: '🐶' },
          { name: 'Bear', url: '🐻', preview: '🐻' },
          { name: 'Tiger', url: '🐯', preview: '🐯' },
          { name: 'Lion', url: '🦁', preview: '🦁' },
          { name: 'Monkey', url: '🐵', preview: '🐵' },
          { name: 'Panda', url: '🐼', preview: '🐼' },
          { name: 'Unicorn', url: '🦄', preview: '🦄' },
          { name: 'Elephant', url: '🐘', preview: '🐘' },
          { name: 'Penguin', url: '🐧', preview: '🐧' },
          
          // Food & Drinks
          { name: 'Pizza', url: '🍕', preview: '🍕' },
          { name: 'Burger', url: '🍔', preview: '🍔' },
          { name: 'Coffee', url: '☕', preview: '☕' },
          { name: 'Ice Cream', url: '🍦', preview: '🍦' },
          { name: 'Cake', url: '🎂', preview: '🎂' },
          { name: 'Apple', url: '🍎', preview: '🍎' },
          { name: 'Banana', url: '🍌', preview: '🍌' },
          { name: 'Strawberry', url: '🍓', preview: '🍓' },
          { name: 'Avocado', url: '🥑', preview: '🥑' },
          { name: 'Taco', url: '🌮', preview: '🌮' },
          
          // Activities & Objects
          { name: 'Soccer Ball', url: '⚽', preview: '⚽' },
          { name: 'Basketball', url: '🏀', preview: '🏀' },
          { name: 'Guitar', url: '🎸', preview: '🎸' },
          { name: 'Camera', url: '📷', preview: '📷' },
          { name: 'Phone', url: '📱', preview: '📱' },
          { name: 'Computer', url: '💻', preview: '💻' },
          { name: 'Book', url: '📚', preview: '📚' },
          { name: 'Pencil', url: '✏️', preview: '✏️' },
          { name: 'Lightbulb', url: '💡', preview: '💡' },
          { name: 'Gift', url: '🎁', preview: '🎁' },
          
          // Nature & Weather
          { name: 'Sun', url: '☀️', preview: '☀️' },
          { name: 'Moon', url: '🌙', preview: '🌙' },
          { name: 'Cloud', url: '☁️', preview: '☁️' },
          { name: 'Rainbow', url: '🌈', preview: '🌈' },
          { name: 'Tree', url: '🌳', preview: '🌳' },
          { name: 'Flower', url: '🌸', preview: '🌸' },
          { name: 'Rose', url: '🌹', preview: '🌹' },
          { name: 'Cactus', url: '🌵', preview: '🌵' },
          { name: 'Ocean Wave', url: '🌊', preview: '🌊' },
          { name: 'Mountain', url: '⛰️', preview: '⛰️' },
          
          // Transportation
          { name: 'Car', url: '🚗', preview: '🚗' },
          { name: 'Bicycle', url: '🚲', preview: '🚲' },
          { name: 'Airplane', url: '✈️', preview: '✈️' },
          { name: 'Rocket', url: '🚀', preview: '🚀' },
          { name: 'Train', url: '🚂', preview: '🚂' },
          { name: 'Ship', url: '🚢', preview: '🚢' }
        ]
      }
    ]
  },
  rectangle: {
    name: 'rectangle',
    displayName: 'Rectangle',
    settings: [
      {
        type: 'slider',
        label: 'Border Weight',
        key: 'shapeBorderWeight',
        min: 1,
        max: 10,
        step: 1,
        showValue: true,
        valueFormatter: (value) => `${value}px`
      },
      {
        type: 'slider',
        label: 'Opacity',
        key: 'opacity',
        min: 0.1,
        max: 1,
        step: 0.1,
        showValue: true,
        valueFormatter: (value) => `${Math.round(value * 100)}%`
      },
      {
        type: 'text',
        label: '',
        key: 'shapeHint',
        showValue: false
      }
    ]
  }
};

// Add other shape tools with same config as rectangle
['circle', 'triangle', 'hexagon', 'star', 'pentagon', 'diamond'].forEach(shape => {
  toolsConfig[shape] = {
    ...toolsConfig.rectangle,
    name: shape,
    displayName: shape.charAt(0).toUpperCase() + shape.slice(1)
  };
});

// Simple tools with just descriptions
export const simpleToolsConfig: Record<string, { displayName: string; description: string }> = {
  select: {
    displayName: 'Select',
    description: 'Click and drag to select objects on the canvas.'
  },
  hand: {
    displayName: 'Hand',
    description: 'Click and drag to pan around the canvas.'
  },
  fill: {
    displayName: 'Fill',
    description: 'Click on shapes to fill them with the selected color.'
  }
};
