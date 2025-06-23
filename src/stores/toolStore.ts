import { create } from 'zustand';
import { preloadStampImages } from '../utils/imageCache';

interface ToolState {
  activeTool: string;
  toolSettings: any;
  version: number;
  history: Array<{ action: string; data: any; timestamp: number }>;
  future: Array<{ action: string; data: any; timestamp: number }>;
  undo: () => void;
  redo: () => void;
  setToolSettings: (settings: any) => void;
  setActiveTool: (tool: string) => void;
  resetToolSettings: () => void;
  clearHistory: () => void;
}

const initialState = {
  activeTool: 'select',
  toolSettings: {
    strokeColor: '#000000',
    strokeWidth: 2,
    opacity: 1,
    fillColor: 'transparent',
    fontFamily: 'Arial',
    fontSize: 24,
    textAlign: 'left',
    fontWeight: 'normal',
    isEraser: false,
    brushType: 'pencil',
    gridVisible: false,
    showLinedPaper: false,
    showDots: false
  },
  version: 0,
  history: [],
  future: []
};

export const useToolStore = create<ToolState>((set, get) => ({
  ...initialState,

  undo: () => {
    set((state) => {
      if (state.history.length === 0) return state;

      const previous = state.history[state.history.length - 1];
      const newHistory = state.history.slice(0, state.history.length - 1);

      // Revert the state based on the action type
      switch (previous.action) {
        case 'SET_TOOL_SETTINGS':
          // Revert to the tool settings before the action
          return {
            ...state,
            toolSettings: previous.data.previousSettings,
            history: newHistory,
            future: [previous, ...state.future],
            version: state.version - 1
          };
        case 'SET_ACTIVE_TOOL':
          return {
            ...state,
            activeTool: previous.data.previousTool,
            history: newHistory,
            future: [previous, ...state.future],
            version: state.version - 1
          };
        default:
          return {
            ...state,
            history: newHistory,
            future: [previous, ...state.future],
            version: state.version - 1
          };
      }
    });
  },

  redo: () => {
    set((state) => {
      if (state.future.length === 0) return state;

      const next = state.future[0];
      const newFuture = state.future.slice(1);

      // Apply the state based on the action type
      switch (next.action) {
        case 'SET_TOOL_SETTINGS':
          // Apply the tool settings from the action
          return {
            ...state,
            toolSettings: next.data.settings,
            history: [...state.history, next],
            future: newFuture,
            version: state.version + 1
          };
        case 'SET_ACTIVE_TOOL':
          return {
            ...state,
            activeTool: next.data.tool,
            history: [...state.history, next],
            future: newFuture,
            version: state.version + 1
          };
        default:
          return {
            ...state,
            history: [...state.history, next],
            future: newFuture,
            version: state.version + 1
          };
      }
    });
  },

  setToolSettings: (settings: any) => {
    set((state) => {
      const previousSettings = { ...state.toolSettings };
      const newSettings = { ...state.toolSettings, ...settings };
      
      return {
        toolSettings: newSettings,
        version: state.version + 1,
        history: [...state.history, { 
          action: 'SET_TOOL_SETTINGS', 
          data: { settings: newSettings, previousSettings }, 
          timestamp: Date.now() 
        }],
        future: []
      };
    });
  },

  setActiveTool: (tool: string) => {
    const currentTool = get().activeTool;
    
    // Preload stamp images when stamp tool is selected
    if (tool === 'stamp' && currentTool !== 'stamp') {
      console.log('🏷️ Stamp tool selected - preloading images');
      preloadStampImages().catch(error => {
        console.warn('Failed to preload stamp images:', error);
      });
    }
    
    set((state) => ({
      activeTool: tool,
      version: state.version + 1,
      history: [...state.history, { 
        action: 'SET_ACTIVE_TOOL', 
        data: { tool, previousTool: currentTool }, 
        timestamp: Date.now() 
      }]
    }));
    
    console.log('🔧 Setting active tool:', tool);
    console.log('🔧 Tool state updated:', {
      tool,
      version: get().version,
      historyLength: get().history.length
    });
  },

  resetToolSettings: () => {
    set((state) => ({
      toolSettings: initialState.toolSettings,
      version: state.version + 1,
      history: [...state.history, { action: 'RESET_TOOL_SETTINGS', data: {}, timestamp: Date.now() }],
      future: []
    }));
  },

  clearHistory: () => {
    set((state) => ({
      history: [],
      future: [],
      version: state.version + 1
    }));
  }
}));
