import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { Viewport } from '../types/viewport';

export type WhiteboardObject = {
  id: string;
  type: 'path' | 'rectangle' | 'circle' | 'triangle' | 'diamond' | 'pentagon' | 'hexagon' | 'star' | 'heart' | 'text';
  x: number;
  y: number;
  width?: number;
  height?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  data?: any;
  createdAt: number;
  updatedAt: number;
};

export interface WhiteboardSettings {
  gridVisible: boolean;
  linedPaperVisible: boolean;
  backgroundColor: string;
}

export interface WhiteboardAction {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  userId: string;
}

export interface WhiteboardStore {
  objects: Record<string, WhiteboardObject>;
  selectedObjectIds: string[];
  viewport: Viewport;
  settings: WhiteboardSettings;
  actionHistory: WhiteboardAction[];
  currentHistoryIndex: number;
  lastAction?: WhiteboardAction;
  
  // User-specific action histories for undo/redo
  userActionHistories: Map<string, WhiteboardAction[]>;
  userHistoryIndices: Map<string, number>;

  // Viewport Actions
  setViewport: (viewport: Viewport) => void;
  resetViewport: () => void;

  // Settings Actions
  setSettings: (settings: WhiteboardSettings) => void;
  updateSettings: (updates: Partial<WhiteboardSettings>) => void;

  // Actions
  addObject: (object: Omit<WhiteboardObject, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateObject: (id: string, updates: Partial<WhiteboardObject>) => void;
  deleteObject: (id: string) => void;
  clearObjects: () => void;
  clearCanvas: () => void;
  selectObjects: (ids: string[]) => void;
  clearSelection: () => void;
  updateObjectPosition: (id: string, x: number, y: number) => void;
  updateObjectSize: (id: string, width: number, height: number) => void;
  
  // Enhanced eraser action with metadata preservation
  erasePath: (action: {
    originalObjectId: string;
    eraserPath: {
      x: number;
      y: number;
      size: number;
      path: string;
    };
    resultingSegments: Array<{
      points: Array<{ x: number; y: number }>;
      id: string;
    }>;
    originalObjectMetadata?: {
      brushType?: string;
      stroke?: string;
      strokeWidth?: number;
      opacity?: number;
      fill?: string;
    };
  }) => void;
  
  // Zoom & Pan
  zoomIn: () => void;
  zoomOut: () => void;
  pan: (deltaX: number, deltaY: number) => void;

  // State management
  getState: () => any;
  getStateSnapshot: () => any;
  getActionsSince: (timestamp: number) => WhiteboardAction[];
  applyRemoteAction: (action: WhiteboardAction) => void;
  batchUpdate: (actions: WhiteboardAction[]) => void;
  updateLocalUserHistoryIndex: (userId: string, index: number) => void;
  applyStateChange: (stateChange: any) => void;
}

export const useWhiteboardStore = create<WhiteboardStore>((set, get) => ({
  objects: {},
  selectedObjectIds: [],
  viewport: {
    x: 0,
    y: 0,
    zoom: 1,
  },
  settings: {
    gridVisible: false,
    linedPaperVisible: false,
    backgroundColor: '#ffffff',
  },
  actionHistory: [],
  currentHistoryIndex: -1,
  lastAction: undefined,
  
  // Initialize user-specific histories
  userActionHistories: new Map(),
  userHistoryIndices: new Map(),

  setViewport: (viewport) => set({ viewport }),
  resetViewport: () => set({ viewport: { x: 0, y: 0, zoom: 1 } }),

  setSettings: (settings) => set({ settings }),
  updateSettings: (updates) => set((state) => ({ 
    settings: { ...state.settings, ...updates } 
  })),

  addObject: (object) => {
    const id = nanoid();
    const now = Date.now();
    set((state) => ({
      objects: {
        ...state.objects,
        [id]: {
          id,
          ...object,
          createdAt: now,
          updatedAt: now,
        },
      },
    }));
    return id;
  },
  updateObject: (id, updates) => {
    set((state) => ({
      objects: {
        ...state.objects,
        [id]: {
          ...state.objects[id],
          ...updates,
          updatedAt: Date.now(),
        },
      },
    }));
  },
  deleteObject: (id) => {
    set((state) => {
      const newObjects = { ...state.objects };
      delete newObjects[id];
      return {
        ...state,
        objects: newObjects,
        selectedObjectIds: state.selectedObjectIds.filter((objId) => objId !== id),
      };
    });
  },
  clearObjects: () => {
    set({ objects: {}, selectedObjectIds: [] });
  },
  clearCanvas: () => {
    set({ objects: {}, selectedObjectIds: [] });
  },
  selectObjects: (ids) => {
    set({ selectedObjectIds: ids });
  },
  clearSelection: () => {
    set({ selectedObjectIds: [] });
  },
  updateObjectPosition: (id, x, y) => {
    set((state) => ({
      objects: {
        ...state.objects,
        [id]: {
          ...state.objects[id],
          x,
          y,
          updatedAt: Date.now(),
        },
      },
    }));
  },
  updateObjectSize: (id, width, height) => {
    set((state) => ({
      objects: {
        ...state.objects,
        [id]: {
          ...state.objects[id],
          width,
          height,
          updatedAt: Date.now(),
        },
      },
    }));
  },
  
  erasePath: (action) => {
    const { originalObjectId, eraserPath, resultingSegments, originalObjectMetadata } = action;
    const originalObject = get().objects[originalObjectId];
    
    if (!originalObject) return;
    
    set((state) => {
      const newObjects = { ...state.objects };
      
      // Remove the original object
      delete newObjects[originalObjectId];
      
      // Add resulting segments as new objects with preserved brush metadata
      resultingSegments.forEach((segment) => {
        if (segment.points.length >= 2) {
          // Convert points back to path string
          const pathString = segment.points.reduce((path, point, index) => {
            const command = index === 0 ? 'M' : 'L';
            return `${path} ${command} ${point.x} ${point.y}`;
          }, '');
          
          // Create new object with preserved metadata - fix the metadata override bug
          newObjects[segment.id] = {
            id: segment.id,
            type: 'path',
            x: originalObject.x,
            y: originalObject.y,
            stroke: originalObjectMetadata?.stroke || originalObject.stroke || '#000000',
            strokeWidth: originalObjectMetadata?.strokeWidth || originalObject.strokeWidth || 2,
            opacity: originalObjectMetadata?.opacity || originalObject.opacity || 1,
            fill: originalObjectMetadata?.fill || originalObject.fill,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            data: {
              path: pathString,
              // Only preserve the essential brush metadata - no spreading of original data
              brushType: originalObjectMetadata?.brushType || originalObject.data?.brushType,
              isEraser: false // Ensure segments are not marked as eraser
            }
          };
        }
      });
      
      return {
        ...state,
        objects: newObjects,
        selectedObjectIds: state.selectedObjectIds.filter(id => id !== originalObjectId)
      };
    });
    
    console.log('✂️ Erased path with preserved brush metadata:', {
      originalId: originalObjectId.slice(0, 8),
      segments: resultingSegments.length,
      brushType: originalObjectMetadata?.brushType || originalObject.data?.brushType,
      preservedMetadata: originalObjectMetadata
    });
  },
  
  zoomIn: () => {
    set((state) => ({
      viewport: {
        ...state.viewport,
        zoom: Math.min(state.viewport.zoom * 1.2, 5),
      },
    }));
  },
  zoomOut: () => {
    set((state) => ({
      viewport: {
        ...state.viewport,
        zoom: Math.max(state.viewport.zoom / 1.2, 0.2),
      },
    }));
  },
  pan: (deltaX, deltaY) => {
    set((state) => ({
      viewport: {
        ...state.viewport,
        x: state.viewport.x + deltaX,
        y: state.viewport.y + deltaY,
      },
    }));
  },

  // State management methods
  getState: () => get(),
  getStateSnapshot: () => ({
    objects: get().objects,
    viewport: get().viewport,
    settings: get().settings,
    actionCount: get().actionHistory.length,
  }),
  getActionsSince: (timestamp) => {
    return get().actionHistory.filter(action => action.timestamp > timestamp);
  },
  applyRemoteAction: (action) => {
    // Apply remote action without adding to history
    console.log('Applying remote action:', action);
  },
  batchUpdate: (actions) => {
    // Apply batch of actions
    console.log('Applying batch update:', actions);
  },
  updateLocalUserHistoryIndex: (userId, index) => {
    set((state) => {
      const newIndices = new Map(state.userHistoryIndices);
      newIndices.set(userId, index);
      return { userHistoryIndices: newIndices };
    });
  },
  applyStateChange: (stateChange) => {
    set((state) => ({ ...state, ...stateChange }));
  },
}));
