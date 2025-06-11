import { create } from 'zustand';

export type Tool = 
  | 'select'
  | 'hand' 
  | 'pencil'
  | 'eraser'
  | 'rectangle'
  | 'circle'
  | 'ellipse'
  | 'line'
  | 'triangle'
  | 'text'
  | 'fill'
  | 'hexagon'
  | 'star'
  | 'pentagon'
  | 'diamond';

export type BrushType = 'pencil' | 'chalk' | 'spray' | 'crayon';

export interface ToolSettings {
  // Drawing settings
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  opacity: number;
  brushType: BrushType;
  
  // Text settings
  fontSize: number;
  fontFamily: string;
  
  // UI settings
  showGrid: boolean;
  showLinedPaper: boolean;
}

interface ToolStore {
  activeTool: Tool;
  toolSettings: ToolSettings;
  
  // Actions
  setActiveTool: (tool: Tool) => void;
  updateToolSettings: (settings: Partial<ToolSettings>) => void;
  
  // Color palette management
  colorPalettes: {
    basic: string[];
    vibrant: string[];
    pastel: string[];
    professional: string[];
  };
  customColors: string[];
  addCustomColor: (color: string) => void;
}

const defaultToolSettings: ToolSettings = {
  strokeColor: '#000000',
  fillColor: '#ffffff',
  strokeWidth: 2,
  opacity: 1,
  brushType: 'pencil',
  fontSize: 16,
  fontFamily: 'Arial',
  showGrid: false,
  showLinedPaper: false
};

const colorPalettes = {
  basic: [
    '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
    '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#800080'
  ],
  vibrant: [
    '#ff1744', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5',
    '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50',
    '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800'
  ],
  pastel: [
    '#ffcdd2', '#f8bbd9', '#e1bee7', '#d1c4e9', '#c5cae9',
    '#bbdefb', '#b3e5fc', '#b2ebf2', '#b2dfdb', '#c8e6c9',
    '#dcedc8', '#f0f4c3', '#fff9c4', '#ffecb3', '#ffe0b2'
  ],
  professional: [
    '#263238', '#37474f', '#455a64', '#546e7a', '#607d8b',
    '#78909c', '#90a4ae', '#b0bec5', '#cfd8dc', '#eceff1',
    '#1976d2', '#388e3c', '#f57c00', '#e64a19', '#7b1fa2'
  ]
};

export const useToolStore = create<ToolStore>((set, get) => ({
  activeTool: 'select',
  toolSettings: defaultToolSettings,
  colorPalettes,
  customColors: [],

  setActiveTool: (tool) => {
    console.log('Setting active tool:', tool);
    set({ activeTool: tool });
  },

  updateToolSettings: (settings) => {
    console.log('Updating tool settings:', settings);
    set((state) => ({
      toolSettings: {
        ...state.toolSettings,
        ...settings
      }
    }));
  },

  addCustomColor: (color) => {
    set((state) => {
      const newCustomColors = [...state.customColors];
      if (!newCustomColors.includes(color)) {
        newCustomColors.push(color);
        // Keep only last 10 custom colors
        if (newCustomColors.length > 10) {
          newCustomColors.shift();
        }
      }
      return { customColors: newCustomColors };
    });
  }
}));
