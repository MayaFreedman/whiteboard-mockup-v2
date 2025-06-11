
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import {
  WhiteboardState,
  WhiteboardAction,
  WhiteboardObject,
  AddObjectAction,
  UpdateObjectAction,
  DeleteObjectAction,
  SelectObjectsAction,
  UpdateViewportAction,
  UpdateSettingsAction,
  ClearCanvasAction,
  BatchUpdateAction
} from '../types/whiteboard';

interface WhiteboardStore extends WhiteboardState {
  // Action history for undo/redo
  actionHistory: WhiteboardAction[];
  currentHistoryIndex: number;
  
  // Actions that will be easily serializable for multiplayer
  dispatch: (action: WhiteboardAction) => void;
  
  // Convenience methods for common operations
  addObject: (object: Omit<WhiteboardObject, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateObject: (id: string, updates: Partial<WhiteboardObject>) => void;
  deleteObject: (id: string) => void;
  selectObjects: (objectIds: string[]) => void;
  clearSelection: () => void;
  updateViewport: (viewport: Partial<WhiteboardState['viewport']>) => void;
  updateSettings: (settings: Partial<WhiteboardState['settings']>) => void;
  clearCanvas: () => void;
  
  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // State serialization for multiplayer
  getSerializableState: () => Omit<WhiteboardState, 'lastAction'>;
  applyRemoteAction: (action: WhiteboardAction) => void;
  
  // Batch operations for performance
  batchUpdate: (actions: WhiteboardAction[]) => void;
}

const initialState: WhiteboardState = {
  objects: {},
  selectedObjectIds: [],
  viewport: {
    x: 0,
    y: 0,
    zoom: 1
  },
  settings: {
    gridVisible: false,
    linedPaperVisible: false,
    backgroundColor: '#ffffff'
  }
};

export const useWhiteboardStore = create<WhiteboardStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,
    actionHistory: [],
    currentHistoryIndex: -1,

    dispatch: (action: WhiteboardAction) => {
      console.log('Dispatching action:', action);
      
      set((state) => {
        const newState = applyAction(state, action);
        
        // Add to history (for undo/redo)
        const newHistory = state.actionHistory.slice(0, state.currentHistoryIndex + 1);
        newHistory.push(action);
        
        return {
          ...newState,
          actionHistory: newHistory,
          currentHistoryIndex: newHistory.length - 1,
          lastAction: action
        };
      });
    },

    addObject: (objectData) => {
      const id = nanoid();
      const object: WhiteboardObject = {
        ...objectData,
        id,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      const action: AddObjectAction = {
        type: 'ADD_OBJECT',
        payload: { object },
        timestamp: Date.now(),
        id: nanoid()
      };
      
      get().dispatch(action);
      return id;
    },

    updateObject: (id, updates) => {
      const action: UpdateObjectAction = {
        type: 'UPDATE_OBJECT',
        payload: { id, updates: { ...updates, updatedAt: Date.now() } },
        timestamp: Date.now(),
        id: nanoid()
      };
      
      get().dispatch(action);
    },

    deleteObject: (id) => {
      const action: DeleteObjectAction = {
        type: 'DELETE_OBJECT',
        payload: { id },
        timestamp: Date.now(),
        id: nanoid()
      };
      
      get().dispatch(action);
    },

    selectObjects: (objectIds) => {
      const action: SelectObjectsAction = {
        type: 'SELECT_OBJECTS',
        payload: { objectIds },
        timestamp: Date.now(),
        id: nanoid()
      };
      
      get().dispatch(action);
    },

    clearSelection: () => {
      get().selectObjects([]);
    },

    updateViewport: (viewport) => {
      const action: UpdateViewportAction = {
        type: 'UPDATE_VIEWPORT',
        payload: viewport,
        timestamp: Date.now(),
        id: nanoid()
      };
      
      get().dispatch(action);
    },

    updateSettings: (settings) => {
      const action: UpdateSettingsAction = {
        type: 'UPDATE_SETTINGS',
        payload: settings,
        timestamp: Date.now(),
        id: nanoid()
      };
      
      get().dispatch(action);
    },

    clearCanvas: () => {
      const action: ClearCanvasAction = {
        type: 'CLEAR_CANVAS',
        payload: {},
        timestamp: Date.now(),
        id: nanoid()
      };
      
      get().dispatch(action);
    },

    batchUpdate: (actions) => {
      const action: BatchUpdateAction = {
        type: 'BATCH_UPDATE',
        payload: { actions },
        timestamp: Date.now(),
        id: nanoid()
      };
      
      get().dispatch(action);
    },

    undo: () => {
      const state = get();
      if (state.canUndo()) {
        set((prevState) => ({
          ...prevState,
          currentHistoryIndex: prevState.currentHistoryIndex - 1
        }));
        
        // Rebuild state from history
        const newIndex = state.currentHistoryIndex - 1;
        const newState = rebuildStateFromHistory(state.actionHistory.slice(0, newIndex + 1));
        
        set((prevState) => ({
          ...prevState,
          ...newState,
          currentHistoryIndex: newIndex
        }));
      }
    },

    redo: () => {
      const state = get();
      if (state.canRedo()) {
        const newIndex = state.currentHistoryIndex + 1;
        const action = state.actionHistory[newIndex];
        
        set((prevState) => {
          const newState = applyAction(prevState, action);
          return {
            ...newState,
            currentHistoryIndex: newIndex
          };
        });
      }
    },

    canUndo: () => {
      const state = get();
      return state.currentHistoryIndex >= 0;
    },

    canRedo: () => {
      const state = get();
      return state.currentHistoryIndex < state.actionHistory.length - 1;
    },

    getSerializableState: () => {
      const state = get();
      return {
        objects: state.objects,
        selectedObjectIds: state.selectedObjectIds,
        viewport: state.viewport,
        settings: state.settings
      };
    },

    applyRemoteAction: (action) => {
      // Apply remote action without adding to local history
      set((state) => applyAction(state, action));
    }
  }))
);

// Helper function to apply an action to the state
function applyAction(state: WhiteboardStore, action: WhiteboardAction): Partial<WhiteboardStore> {
  switch (action.type) {
    case 'ADD_OBJECT': {
      const { object } = (action as AddObjectAction).payload;
      return {
        objects: {
          ...state.objects,
          [object.id]: object
        }
      };
    }
    
    case 'UPDATE_OBJECT': {
      const { id, updates } = (action as UpdateObjectAction).payload;
      const existingObject = state.objects[id];
      if (!existingObject) return {};
      
      return {
        objects: {
          ...state.objects,
          [id]: {
            ...existingObject,
            ...updates
          }
        }
      };
    }
    
    case 'DELETE_OBJECT': {
      const { id } = (action as DeleteObjectAction).payload;
      const newObjects = { ...state.objects };
      delete newObjects[id];
      
      return {
        objects: newObjects,
        selectedObjectIds: state.selectedObjectIds.filter(objId => objId !== id)
      };
    }
    
    case 'SELECT_OBJECTS': {
      const { objectIds } = (action as SelectObjectsAction).payload;
      return {
        selectedObjectIds: objectIds
      };
    }
    
    case 'UPDATE_VIEWPORT': {
      const viewportUpdates = (action as UpdateViewportAction).payload;
      return {
        viewport: {
          ...state.viewport,
          ...viewportUpdates
        }
      };
    }
    
    case 'UPDATE_SETTINGS': {
      const settingsUpdates = (action as UpdateSettingsAction).payload;
      return {
        settings: {
          ...state.settings,
          ...settingsUpdates
        }
      };
    }
    
    case 'CLEAR_CANVAS': {
      return {
        objects: {},
        selectedObjectIds: []
      };
    }
    
    case 'BATCH_UPDATE': {
      const { actions } = (action as BatchUpdateAction).payload;
      let newState = { ...state };
      
      for (const subAction of actions) {
        newState = { ...newState, ...applyAction(newState as WhiteboardStore, subAction) };
      }
      
      return newState;
    }
    
    default:
      console.warn('Unknown action type:', action.type);
      return {};
  }
}

// Helper function to rebuild state from action history
function rebuildStateFromHistory(history: WhiteboardAction[]): Partial<WhiteboardStore> {
  let state = { ...initialState };
  
  for (const action of history) {
    state = { ...state, ...applyAction(state as WhiteboardStore, action) };
  }
  
  return state;
}
