
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
        min: 1,
        max: 10,
        step: 1,
        showValue: true,
        valueFormatter: (value) => `${value * 10}px`
      },
      {
        type: 'grid',
        label: 'Stamp Categories',
        key: 'selectedSticker',
        gridItems: [
          {
            name: 'Animals',
            url: '/src/assets/Animals.svg',
            preview: '/src/assets/Animals.svg'
          },
          {
            name: 'Plants',
            url: '/src/assets/Plants.svg',
            preview: '/src/assets/Plants.svg'
          },
          {
            name: 'Vehicles',
            url: '/src/assets/Vehicles.svg',
            preview: '/src/assets/Vehicles.svg'
          },
          {
            name: 'Fantasy',
            url: '/src/assets/fantasy.svg',
            preview: '/src/assets/fantasy.svg'
          },
          {
            name: 'Religious',
            url: '/src/assets/religious.svg',
            preview: '/src/assets/religious.svg'
          },
          {
            name: 'Sports',
            url: '/src/assets/sports.svg',
            preview: '/src/assets/sports.svg'
          }
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
