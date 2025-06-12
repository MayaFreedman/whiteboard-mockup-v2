
import { create } from 'zustand';

export type Tool = 
  | 'select'
  | 'hand' 
  | 'pencil'
  | 'brush'
  | 'eraser'
  | 'rectangle'
  | 'circle'
  | 'ellipse'
  | 'line'
  | 'triangle'
  | 'text'
  | 'stamp'
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
  showDots: boolean;
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
  activeColorPalette: keyof ToolStore['colorPalettes'];
  customColors: string[];
  recentlyUsedColors: string[];
  addCustomColor: (color: string) => void;
  setActiveColorPalette: (palette: keyof ToolStore['colorPalettes']) => void;
  getActiveColors: () => string[];
  updateRecentlyUsedColor: (color: string) => void;
  getMostRecentColors: (count: number) => string[];
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
  showLinedPaper: false,
  showDots: false
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
    '#1e3a8a', '#dc2626', '#059669', '#d97706', '#7c2d12',
    '#1f2937', '#374151', '#6b7280', '#0f172a', '#1e293b',
    '#0c4a6e', '#991b1b', '#064e3b', '#92400e', '#451a03'
  ]
};

export const useToolStore = create<ToolStore>((set, get) => ({
  activeTool: 'select',
  toolSettings: defaultToolSettings,
  colorPalettes,
  activeColorPalette: 'basic',
  customColors: [],
  recentlyUsedColors: [],

  setActiveTool: (tool) => {
    console.log('Setting active tool:', tool);
    set({ activeTool: tool });
  },

  updateToolSettings: (settings) => {
    console.log('Updating tool settings:', settings);
    set((state) => {
      const newSettings = {
        ...state.toolSettings,
        ...settings
      };
      
      // If stroke color is being updated, add to recently used
      if (settings.strokeColor) {
        get().updateRecentlyUsedColor(settings.strokeColor);
      }
      
      return {
        toolSettings: newSettings
      };
    });
  },

  updateRecentlyUsedColor: (color) => {
    set((state) => {
      const newRecentColors = [color, ...state.recentlyUsedColors.filter(c => c !== color)];
      // Keep only the last 10 recent colors
      if (newRecentColors.length > 10) {
        newRecentColors.pop();
      }
      return { recentlyUsedColors: newRecentColors };
    });
  },

  getMostRecentColors: (count) => {
    const state = get();
    const paletteColors = state.colorPalettes[state.activeColorPalette];
    const recentColors = state.recentlyUsedColors.filter(color => 
      paletteColors.includes(color)
    );
    
    // Fill remaining slots with palette colors that haven't been used recently
    const remainingColors = paletteColors.filter(color => 
      !recentColors.includes(color)
    );
    
    return [...recentColors, ...remainingColors].slice(0, count);
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
  },

  setActiveColorPalette: (palette) => {
    console.log('Setting active color palette:', palette);
    set({ activeColorPalette: palette });
  },

  getActiveColors: () => {
    const state = get();
    return state.colorPalettes[state.activeColorPalette];
  }
}));
