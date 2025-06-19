import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { Viewport } from '../types/viewport';
import { WhiteboardAction } from '../types/whiteboard';

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

// Micro-batching utility for rapid updates
const createMicroBatcher = (batchSize: number = 5, timeWindow: number = 16) => {
  let updateQueue: Array<() => void> = [];
  let timeoutId: number | null = null;
  
  return (updateFn: () => void) => {
    updateQueue.push(updateFn);
    
    if (updateQueue.length >= batchSize) {
      // Execute immediately if batch is full
      const updates = updateQueue.splice(0);
      updates.forEach(fn => fn());
    } else if (!timeoutId) {
      // Schedule execution if not already scheduled
      timeoutId = window.setTimeout(() => {
        const updates = updateQueue.splice(0);
        updates.forEach(fn => fn());
        timeoutId = null;
      }, timeWindow);
    }
  };
};

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

  // Action recording
  recordAction: (action: WhiteboardAction) => void;

  // Viewport Actions
  setViewport: (viewport: Viewport) => void;
  resetViewport: () => void;

  // Settings Actions
  setSettings: (settings: WhiteboardSettings) => void;
  updateSettings: (updates: Partial<WhiteboardSettings>) => void;

  // Actions
  addObject: (object: Omit<WhiteboardObject, 'id' | 'createdAt' | 'updatedAt'>, userId?: string) => string;
  updateObject: (id: string, updates: Partial<WhiteboardObject>, userId?: string) => void;
  deleteObject: (id: string, userId?: string) => void;
  clearObjects: () => void;
  clearCanvas: (userId?: string) => void;
  selectObjects: (ids: string[], userId?: string) => void;
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
  }, userId?: string) => void;
  
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

export const useWhiteboardStore = create<WhiteboardStore>((set, get) => {
  // Initialize micro-batcher for rapid updates (like eraser operations)
  const microBatcher = createMicroBatcher(3, 8); // Smaller batch size, faster execution
  
  return {
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

    recordAction: (action) => {
      // Use micro-batching for rapid action recording to reduce state thrashing
      microBatcher(() => {
        set((state) => {
          const newUserHistories = new Map(state.userActionHistories);
          const newUserIndices = new Map(state.userHistoryIndices);
          
          // Get or create user history
          const userHistory = newUserHistories.get(action.userId) || [];
          const currentIndex = newUserIndices.get(action.userId) ?? -1;
          
          // Add action to user's history (truncate future actions if we're not at the end)
          const newUserHistory = [...userHistory.slice(0, currentIndex + 1), action];
          newUserHistories.set(action.userId, newUserHistory);
          newUserIndices.set(action.userId, newUserHistory.length - 1);
          
          return {
            ...state,
            actionHistory: [...state.actionHistory, action],
            currentHistoryIndex: state.actionHistory.length,
            lastAction: action,
            userActionHistories: newUserHistories,
            userHistoryIndices: newUserIndices,
          };
        });
      });
    },

    setViewport: (viewport) => set({ viewport }),
    resetViewport: () => set({ viewport: { x: 0, y: 0, zoom: 1 } }),

    setSettings: (settings) => set({ settings }),
    updateSettings: (updates) => set((state) => ({ 
      settings: { ...state.settings, ...updates } 
    })),

    addObject: (object, userId = 'local') => {
      const id = nanoid();
      const now = Date.now();
      const newObject = {
        id,
        ...object,
        createdAt: now,
        updatedAt: now,
      };

      const action: WhiteboardAction = {
        type: 'ADD_OBJECT',
        payload: { object: newObject },
        timestamp: now,
        id: nanoid(),
        userId,
      };

      set((state) => ({
        objects: {
          ...state.objects,
          [id]: newObject,
        },
      }));

      get().recordAction(action);
      return id;
    },

    updateObject: (id, updates, userId = 'local') => {
      const state = get();
      const existingObject = state.objects[id];
      if (!existingObject) return;

      const action: WhiteboardAction = {
        type: 'UPDATE_OBJECT',
        payload: { id, updates },
        timestamp: Date.now(),
        id: nanoid(),
        userId,
        previousState: { object: existingObject },
      };

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

      get().recordAction(action);
    },

    deleteObject: (id, userId = 'local') => {
      const state = get();
      const objectToDelete = state.objects[id];
      if (!objectToDelete) return;

      const action: WhiteboardAction = {
        type: 'DELETE_OBJECT',
        payload: { id },
        timestamp: Date.now(),
        id: nanoid(),
        userId,
        previousState: { object: objectToDelete },
      };

      set((state) => {
        const newObjects = { ...state.objects };
        delete newObjects[id];
        return {
          ...state,
          objects: newObjects,
          selectedObjectIds: state.selectedObjectIds.filter((objId) => objId !== id),
        };
      });

      get().recordAction(action);
    },

    clearObjects: () => {
      set({ objects: {}, selectedObjectIds: [] });
    },

    clearCanvas: (userId = 'local') => {
      const state = get();
      
      const action: WhiteboardAction = {
        type: 'CLEAR_CANVAS',
        payload: {},
        timestamp: Date.now(),
        id: nanoid(),
        userId,
        previousState: {
          objects: state.objects,
          selectedObjectIds: state.selectedObjectIds,
        },
      };

      set({ objects: {}, selectedObjectIds: [] });
      get().recordAction(action);
    },

    selectObjects: (ids, userId = 'local') => {
      const state = get();
      
      const action: WhiteboardAction = {
        type: 'SELECT_OBJECTS',
        payload: { objectIds: ids },
        timestamp: Date.now(),
        id: nanoid(),
        userId,
        previousState: { selectedObjectIds: state.selectedObjectIds },
      };

      set({ selectedObjectIds: ids });
      get().recordAction(action);
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
    
    erasePath: (action, userId = 'local') => {
      const { originalObjectId, eraserPath, resultingSegments, originalObjectMetadata } = action;
      const originalObject = get().objects[originalObjectId];
      
      if (!originalObject) return;

      const whiteboardAction: WhiteboardAction = {
        type: 'ERASE_PATH',
        payload: {
          originalObjectId,
          eraserPath,
          resultingSegments,
        },
        timestamp: Date.now(),
        id: nanoid(),
        userId,
        previousState: { object: originalObject },
      };
      
      // Use micro-batching for eraser operations to reduce state thrashing
      microBatcher(() => {
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
      });

      get().recordAction(whiteboardAction);
      
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
      // Apply remote action without adding to local user's history
      console.log('Applying remote action:', action.type, action.id);
      
      // Record the action for the remote user's history
      const state = get();
      const newUserHistories = new Map(state.userActionHistories);
      const newUserIndices = new Map(state.userHistoryIndices);
      
      const userHistory = newUserHistories.get(action.userId) || [];
      const newUserHistory = [...userHistory, action];
      newUserHistories.set(action.userId, newUserHistory);
      newUserIndices.set(action.userId, newUserHistory.length - 1);
      
      set({
        actionHistory: [...state.actionHistory, action],
        currentHistoryIndex: state.actionHistory.length,
        lastAction: action,
        userActionHistories: newUserHistories,
        userHistoryIndices: newUserIndices,
      });
    },
    batchUpdate: (actions) => {
      // Apply batch of actions
      console.log('Applying batch update:', actions.length, 'actions');
      actions.forEach(action => get().applyRemoteAction(action));
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
  };
});
