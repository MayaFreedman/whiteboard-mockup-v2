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
  | 'sticky-note'
  | 'stamp'
  | 'background'
  | 'fill'
  | 'hexagon'
  | 'star'
  | 'pentagon'
  | 'diamond'
  | 'heart';

export type BrushType = 'paintbrush' | 'chalk' | 'spray' | 'crayon';

export type EraserMode = 'pixel' | 'object';

export interface ToolSettings {
  // Drawing settings
  strokeColor: string;
  opacity: number;
  brushType: BrushType;
  
  // Independent sizes per tool
  pencilSize: number;
  brushSize: number;
  stampSize: number;
  
  // Eraser settings
  eraserMode: EraserMode;
  eraserSize: number;
  eraserOpacity: number;
  
  // Shape settings
  shapeBorderWeight: number;
  
  // Text settings
  fontSize: number;
  fontFamily: string;
  textBold: boolean;
  textItalic: boolean;
  textUnderline: boolean;
  textAlign: 'left' | 'center' | 'right';
  
  // UI settings (removed background settings - now in whiteboardStore)
  
  // Stamp settings
  selectedSticker?: string;
  
  // Sticky note settings
  stickyNoteSize: number;
  stickyNoteBackgroundColor: string;
  
  // Shape properties panel settings
  shapeColorMode: 'fill' | 'stroke';
}

interface ToolStore {
  activeTool: Tool;
  toolSettings: ToolSettings;
  
  // State tracking for multiplayer
  stateVersion: number;
  lastStateUpdate: number;
  toolChangeHistory: Array<{
    tool: Tool;
    timestamp: number;
    settings: ToolSettings;
  }>;
  
  // Auto-switch state for sticky note tool
  autoSwitchedFromTool: Tool | null;
  wasAutoSwitched: boolean;
  
  // Shape tool memory
  lastUsedShapeTool: Tool;
  
  // Actions
  setActiveTool: (tool: Tool) => void;
  updateToolSettings: (settings: Partial<ToolSettings>) => void;
  setAutoSwitchState: (fromTool: Tool | null, wasAutoSwitched: boolean) => void;
  clearAutoSwitchState: () => void;
  
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
  paletteCustomColors: Record<keyof ToolStore['colorPalettes'], string>;
  addCustomColor: (color: string) => void;
  setActiveColorPalette: (palette: keyof ToolStore['colorPalettes']) => void;
  setPaletteCustomColor: (palette: keyof ToolStore['colorPalettes'], color: string) => void;
  getActiveColors: () => string[];
  updateRecentlyUsedColor: (color: string) => void;
  getMostRecentColors: (count: number) => string[];
  
  // Enhanced state tracking for multiplayer
  getToolStateSnapshot: () => {
    activeTool: Tool;
    settings: ToolSettings;
    version: number;
    timestamp: number;
  };
  getToolChangesSince: (timestamp: number) => Array<{
    tool: Tool;
    timestamp: number;
    settings: ToolSettings;
  }>;
  clearToolHistory: () => void;
}

/** Default settings for all tools */
const defaultToolSettings: ToolSettings = {
  strokeColor: '#000000',
  opacity: 1,
  brushType: 'paintbrush',
  
  // Independent defaults
  pencilSize: 4,
  brushSize: 8,
  stampSize: 10,
  
  eraserMode: 'pixel',
  eraserSize: 20,
  eraserOpacity: 1,
  shapeBorderWeight: 2,
  fontSize: 16,
  fontFamily: 'Arial',
  textBold: false,
  textItalic: false,
  textUnderline: false,
  textAlign: 'left',
  selectedSticker: '⭐', // Default to star emoji since it works
  stickyNoteSize: 180,
  stickyNoteBackgroundColor: '#fef3c7',
  shapeColorMode: 'fill'
};

/** Predefined color palettes for the whiteboard */
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

/**
 * Limits the array to a maximum number of items, removing oldest items if necessary
 * @param array - The array to limit
 * @param maxItems - Maximum number of items to keep
 * @returns The limited array
 */
const limitArraySize = <T>(array: T[], maxItems: number): T[] => {
  if (array.length <= maxItems) return array;
  return array.slice(-maxItems);
};

/**
 * Adds an item to the beginning of an array, removing duplicates and limiting size
 * @param array - The array to add to
 * @param item - The item to add
 * @param maxItems - Maximum number of items to keep
 * @returns The updated array
 */
const addToRecentArray = <T>(array: T[], item: T, maxItems: number): T[] => {
  const filtered = array.filter(existingItem => existingItem !== item);
  const newArray = [item, ...filtered];
  return limitArraySize(newArray, maxItems);
};

/**
 * Tool store managing the active tool, settings, and state for multiplayer sync
 */
export const useToolStore = create<ToolStore>((set, get) => ({
  activeTool: 'select',
  toolSettings: defaultToolSettings,
  stateVersion: 0,
  lastStateUpdate: Date.now(),
  toolChangeHistory: [],
  colorPalettes,
  activeColorPalette: 'basic',
  customColors: [],
  recentlyUsedColors: [],
  paletteCustomColors: {
    basic: 'rainbow-gradient',
    vibrant: 'rainbow-gradient', 
    pastel: 'rainbow-gradient',
    professional: 'rainbow-gradient'
  },
  
  // Auto-switch state
  autoSwitchedFromTool: null,
  wasAutoSwitched: false,
  
  // Shape tool memory
  lastUsedShapeTool: 'rectangle',

  setActiveTool: (tool) => {
    console.log('🔧 Setting active tool:', tool);
    
    set((state) => {
      const timestamp = Date.now();
      const newVersion = state.stateVersion + 1;
      
      // Track shape tool usage
      const isShapeTool = ['rectangle', 'circle', 'ellipse', 'triangle', 'hexagon', 'star', 'pentagon', 'diamond', 'heart'].includes(tool);
      const lastUsedShapeTool = isShapeTool ? tool : state.lastUsedShapeTool;
      
      // Clear auto-switch state when user manually changes tools
      // (unless this is part of an auto-switch operation)
      const clearAutoSwitch = !state.wasAutoSwitched;
      
      // Add to history
      const newHistory = limitArraySize([
        ...state.toolChangeHistory,
        { tool, timestamp, settings: state.toolSettings }
      ], 50);
      
      console.log('🔧 Tool state updated:', {
        tool,
        version: newVersion,
        historyLength: newHistory.length,
        clearingAutoSwitch: clearAutoSwitch,
        lastUsedShapeTool
      });
      
      return {
        activeTool: tool,
        lastUsedShapeTool,
        stateVersion: newVersion,
        lastStateUpdate: timestamp,
        toolChangeHistory: newHistory,
        ...(clearAutoSwitch && {
          autoSwitchedFromTool: null,
          wasAutoSwitched: false
        })
      };
    });
  },

  updateToolSettings: (settings) => {
    console.log('🎨 Updating tool settings:', settings);
    
    set((state) => {
      const newSettings = { ...state.toolSettings, ...settings };
      const timestamp = Date.now();
      const newVersion = state.stateVersion + 1;
      
      // If stroke color is being updated, add to recently used
      if (settings.strokeColor) {
        get().updateRecentlyUsedColor(settings.strokeColor);
      }
      
      console.log('🎨 Tool settings updated:', {
        changes: Object.keys(settings),
        version: newVersion,
        newSettings: settings
      });
      
      return {
        toolSettings: newSettings,
        stateVersion: newVersion,
        lastStateUpdate: timestamp
      };
    });
  },

  updateRecentlyUsedColor: (color) => {
    console.log('🎨 Adding recent color:', color);
    
    set((state) => ({
      recentlyUsedColors: addToRecentArray(state.recentlyUsedColors, color, 10)
    }));
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
    console.log('🎨 Adding custom color:', color);
    
    set((state) => {
      const newCustomColors = [...state.customColors];
      if (!newCustomColors.includes(color)) {
        newCustomColors.push(color);
        // Keep only last 10 custom colors
        if (newCustomColors.length > 10) {
          newCustomColors.shift();
        }
      }
      return { 
        customColors: newCustomColors,
        stateVersion: state.stateVersion + 1,
        lastStateUpdate: Date.now()
      };
    });
  },

  setActiveColorPalette: (palette) => {
    console.log('🎨 Setting active color palette:', palette);
    
    set((state) => ({
      activeColorPalette: palette,
      stateVersion: state.stateVersion + 1,
      lastStateUpdate: Date.now()
    }));
  },

  setPaletteCustomColor: (palette, color) => {
    console.log('🎨 Setting custom color for palette:', palette, color);
    
    set((state) => ({
      paletteCustomColors: {
        ...state.paletteCustomColors,
        [palette]: color
      },
      stateVersion: state.stateVersion + 1,
      lastStateUpdate: Date.now()
    }));
  },

  getActiveColors: () => {
    const state = get();
    const paletteColors = state.colorPalettes[state.activeColorPalette];
    const customColor = state.paletteCustomColors[state.activeColorPalette];
    return [...paletteColors, customColor];
  },

  getToolStateSnapshot: () => {
    const state = get();
    return {
      activeTool: state.activeTool,
      settings: state.toolSettings,
      version: state.stateVersion,
      timestamp: state.lastStateUpdate
    };
  },

  getToolChangesSince: (timestamp: number) => {
    const state = get();
    return state.toolChangeHistory.filter(change => change.timestamp > timestamp);
  },

  clearToolHistory: () => {
    console.log('🧹 Clearing tool history');
    set((state) => ({
      toolChangeHistory: [],
      stateVersion: state.stateVersion + 1,
      lastStateUpdate: Date.now()
    }));
  },

  setAutoSwitchState: (fromTool, wasAutoSwitched) => {
    console.log('🔄 Setting auto-switch state:', { fromTool, wasAutoSwitched });
    set({
      autoSwitchedFromTool: fromTool,
      wasAutoSwitched
    });
  },

  clearAutoSwitchState: () => {
    console.log('🔄 Clearing auto-switch state');
    set({
      autoSwitchedFromTool: null,
      wasAutoSwitched: false
    });
  }
}));
