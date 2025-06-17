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
  BatchUpdateAction,
  ErasePixelsAction,
  DeleteObjectsInAreaAction
} from '../types/whiteboard';
import { erasePointsFromPath, pointsToPath, doesPathIntersectEraser, pathToPoints } from '../utils/pathUtils';

interface WhiteboardStore extends WhiteboardState {
  // Action history for undo/redo
  actionHistory: WhiteboardAction[];
  currentHistoryIndex: number;
  
  // State tracking for multiplayer
  stateVersion: number;
  lastStateUpdate: number;
  pendingActions: WhiteboardAction[];
  
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
  
  // Eraser methods
  erasePixels: (eraserPath: { path: string; x: number; y: number; size: number; opacity: number }) => void;
  deleteObjectsInArea: (objectIds: string[], eraserArea: { x: number; y: number; width: number; height: number }) => void;
  
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
  
  // Enhanced state tracking
  getStateSnapshot: () => {
    state: WhiteboardState;
    version: number;
    timestamp: number;
    actionCount: number;
  };
  getActionsSince: (timestamp: number) => WhiteboardAction[];
  clearActionHistory: () => void;
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
    stateVersion: 0,
    lastStateUpdate: Date.now(),
    pendingActions: [],

    dispatch: (action: WhiteboardAction) => {
      console.log('🔄 Dispatching action:', {
        type: action.type,
        id: action.id,
        timestamp: action.timestamp,
        payload: action.payload
      });
      
      set((state) => {
        const newState = applyAction(state, action);
        
        // Add to history (for undo/redo)
        const newHistory = state.actionHistory.slice(0, state.currentHistoryIndex + 1);
        newHistory.push(action);
        
        // Update state tracking
        const newVersion = state.stateVersion + 1;
        const timestamp = Date.now();
        
        console.log('📊 State updated:', {
          version: newVersion,
          objectCount: Object.keys(newState.objects || state.objects).length,
          selectedCount: (newState.selectedObjectIds || state.selectedObjectIds).length,
          historyLength: newHistory.length
        });
        
        return {
          ...newState,
          actionHistory: newHistory,
          currentHistoryIndex: newHistory.length - 1,
          lastAction: action,
          stateVersion: newVersion,
          lastStateUpdate: timestamp
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
      
      console.log('➕ Adding object:', { id, type: object.type, position: { x: object.x, y: object.y } });
      
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
      console.log('📝 Updating object:', { id: id.slice(0, 8), updates });
      
      const action: UpdateObjectAction = {
        type: 'UPDATE_OBJECT',
        payload: { id, updates: { ...updates, updatedAt: Date.now() } },
        timestamp: Date.now(),
        id: nanoid()
      };
      
      get().dispatch(action);
    },

    deleteObject: (id) => {
      console.log('🗑️ Deleting object:', { id: id.slice(0, 8) });
      
      const action: DeleteObjectAction = {
        type: 'DELETE_OBJECT',
        payload: { id },
        timestamp: Date.now(),
        id: nanoid()
      };
      
      get().dispatch(action);
    },

    selectObjects: (objectIds) => {
      console.log('🎯 Selecting objects:', { count: objectIds.length, ids: objectIds.map(id => id.slice(0, 8)) });
      
      const action: SelectObjectsAction = {
        type: 'SELECT_OBJECTS',
        payload: { objectIds },
        timestamp: Date.now(),
        id: nanoid()
      };
      
      get().dispatch(action);
    },

    clearSelection: () => {
      console.log('🎯 Clearing selection');
      get().selectObjects([]);
    },

    updateViewport: (viewport) => {
      console.log('🔍 Updating viewport:', viewport);
      
      const action: UpdateViewportAction = {
        type: 'UPDATE_VIEWPORT',
        payload: viewport,
        timestamp: Date.now(),
        id: nanoid()
      };
      
      get().dispatch(action);
    },

    updateSettings: (settings) => {
      console.log('⚙️ Updating settings:', settings);
      
      const action: UpdateSettingsAction = {
        type: 'UPDATE_SETTINGS',
        payload: settings,
        timestamp: Date.now(),
        id: nanoid()
      };
      
      get().dispatch(action);
    },

    clearCanvas: () => {
      console.log('🧹 Clearing canvas');
      
      const action: ClearCanvasAction = {
        type: 'CLEAR_CANVAS',
        payload: {},
        timestamp: Date.now(),
        id: nanoid()
      };
      
      get().dispatch(action);
    },

    batchUpdate: (actions) => {
      console.log('📦 Batch updating:', { actionCount: actions.length });
      
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
        console.log('↶ Undoing action');
        
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
          currentHistoryIndex: newIndex,
          stateVersion: prevState.stateVersion + 1,
          lastStateUpdate: Date.now()
        }));
      }
    },

    redo: () => {
      const state = get();
      if (state.canRedo()) {
        console.log('↷ Redoing action');
        
        const newIndex = state.currentHistoryIndex + 1;
        const action = state.actionHistory[newIndex];
        
        set((prevState) => {
          const newState = applyAction(prevState, action);
          return {
            ...newState,
            currentHistoryIndex: newIndex,
            stateVersion: prevState.stateVersion + 1,
            lastStateUpdate: Date.now()
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
      console.log('🌐 Applying remote action:', { type: action.type, id: action.id });
      // Apply remote action without adding to local history
      set((state) => ({
        ...applyAction(state, action),
        stateVersion: state.stateVersion + 1,
        lastStateUpdate: Date.now()
      }));
    },

    getStateSnapshot: () => {
      const state = get();
      return {
        state: {
          objects: state.objects,
          selectedObjectIds: state.selectedObjectIds,
          viewport: state.viewport,
          settings: state.settings
        },
        version: state.stateVersion,
        timestamp: state.lastStateUpdate,
        actionCount: state.actionHistory.length
      };
    },

    getActionsSince: (timestamp: number) => {
      const state = get();
      return state.actionHistory.filter(action => action.timestamp > timestamp);
    },

    clearActionHistory: () => {
      console.log('🧹 Clearing action history');
      set((state) => ({
        ...state,
        actionHistory: [],
        currentHistoryIndex: -1,
        stateVersion: state.stateVersion + 1,
        lastStateUpdate: Date.now()
      }));
    },

    erasePixels: (eraserPath: { path: string; x: number; y: number; size: number; opacity: number }) => {
      console.log('🧹 Erasing pixels at:', { x: eraserPath.x, y: eraserPath.y, size: eraserPath.size });
      
      const action: ErasePixelsAction = {
        type: 'ERASE_PIXELS',
        payload: { eraserPath },
        timestamp: Date.now(),
        id: nanoid()
      };
      
      get().dispatch(action);
    },

    deleteObjectsInArea: (objectIds: string[], eraserArea: { x: number; y: number; width: number; height: number }) => {
      console.log('🗑️ Deleting objects in area:', { objectCount: objectIds.length, area: eraserArea });
      
      const action: DeleteObjectsInAreaAction = {
        type: 'DELETE_OBJECTS_IN_AREA',
        payload: { objectIds, eraserArea },
        timestamp: Date.now(),
        id: nanoid()
      };
      
      get().dispatch(action);
    },
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
    
    case 'ERASE_PIXELS': {
      const { eraserPath } = (action as ErasePixelsAction).payload;
      const eraserRadius = eraserPath.size / 2;
      
      const newObjects = { ...state.objects };
      const objectsToRemove: string[] = [];
      const objectsToAdd: WhiteboardObject[] = [];
      
      // Process each path object that might intersect with the eraser
      Object.entries(state.objects).forEach(([id, obj]) => {
        if (obj.type === 'path' && obj.data?.path && !obj.data?.isEraser) {
          // Check if this path intersects with the eraser
          const intersects = doesPathIntersectEraser(
            obj.data.path,
            obj.x,
            obj.y,
            eraserPath.x,
            eraserPath.y,
            eraserRadius
          );
          
          if (intersects) {
            console.log('🎯 Path intersects with eraser, processing:', id.slice(0, 8));
            
            // Convert path to points and erase intersecting points
            const points = pathToPoints(obj.data.path);
            
            // Convert eraser coordinates to path-relative coordinates
            const relativeEraserX = eraserPath.x - obj.x;
            const relativeEraserY = eraserPath.y - obj.y;
            
            // Get remaining segments after erasing
            const segments = erasePointsFromPath(points, relativeEraserX, relativeEraserY, eraserRadius);
            
            // Mark original object for removal
            objectsToRemove.push(id);
            
            // Create new objects for each remaining segment
            segments.forEach((segment, index) => {
              if (segment.points.length >= 2) {
                const newPath = pointsToPath(segment.points);
                const newObject: WhiteboardObject = {
                  ...obj,
                  id: nanoid(),
                  data: {
                    ...obj.data,
                    path: newPath
                  },
                  updatedAt: Date.now()
                };
                objectsToAdd.push(newObject);
                console.log('➕ Created path segment:', newObject.id.slice(0, 8), 'with', segment.points.length, 'points');
              }
            });
          }
        }
      });
      
      // Apply changes: remove original objects and add new segments
      objectsToRemove.forEach(id => {
        delete newObjects[id];
      });
      
      objectsToAdd.forEach(obj => {
        newObjects[obj.id] = obj;
      });
      
      // Update selected objects list to exclude removed objects
      const newSelectedObjectIds = state.selectedObjectIds.filter(
        objId => !objectsToRemove.includes(objId)
      );
      
      console.log('✂️ Pixel erase completed:', {
        removed: objectsToRemove.length,
        added: objectsToAdd.length,
        totalObjects: Object.keys(newObjects).length
      });
      
      return {
        objects: newObjects,
        selectedObjectIds: newSelectedObjectIds
      };
    }
    
    case 'DELETE_OBJECTS_IN_AREA': {
      const { objectIds } = (action as DeleteObjectsInAreaAction).payload;
      const newObjects = { ...state.objects };
      
      objectIds.forEach(id => {
        delete newObjects[id];
      });
      
      return {
        objects: newObjects,
        selectedObjectIds: state.selectedObjectIds.filter(objId => !objectIds.includes(objId))
      };
    }
    
    default:
      console.warn('Unknown action type:', action.type);
      return {};
  }
}

function rebuildStateFromHistory(history: WhiteboardAction[]): Partial<WhiteboardStore> {
  let state = { ...initialState };
  
  for (const action of history) {
    state = { ...state, ...applyAction(state as WhiteboardStore, action) };
  }
  
  return state;
}
