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
  DeleteObjectsInAreaAction,
  ErasePathAction
} from '../types/whiteboard';
import { erasePointsFromPathBatch, doesPathIntersectEraserBatch } from '../utils/path/pathErasing';
import { pointsToPath, pathToPoints } from '../utils/path/pathConversion';

interface WhiteboardStore extends WhiteboardState {
  // Action history for undo/redo
  actionHistory: WhiteboardAction[];
  currentHistoryIndex: number;
  
  // User-specific action tracking (local only, not synced)
  userActionHistories: Map<string, WhiteboardAction[]>;
  userHistoryIndices: Map<string, number>;
  
  // State tracking for multiplayer
  stateVersion: number;
  lastStateUpdate: number;
  pendingActions: WhiteboardAction[];
  
  // Actions that will be easily serializable for multiplayer
  dispatch: (action: WhiteboardAction, isRemote?: boolean) => void;
  
  // Direct state manipulation methods (for undo/redo)
  applyStateChange: (stateChange: Partial<WhiteboardState>) => void;
  
  // Safe user history index updates (only for local user)
  updateLocalUserHistoryIndex: (userId: string, newIndex: number) => void;
  
  // Convenience methods for common operations
  addObject: (object: Omit<WhiteboardObject, 'id' | 'createdAt' | 'updatedAt'>, userId?: string) => string;
  updateObject: (id: string, updates: Partial<WhiteboardObject>, userId?: string) => void;
  deleteObject: (id: string, userId?: string) => void;
  selectObjects: (objectIds: string[], userId?: string) => void;
  clearSelection: (userId?: string) => void;
  updateViewport: (viewport: Partial<WhiteboardState['viewport']>, userId?: string) => void;
  updateSettings: (settings: Partial<WhiteboardState['settings']>, userId?: string) => void;
  clearCanvas: (userId?: string) => void;
  
  // Eraser methods
  erasePixels: (eraserPath: { path: string; x: number; y: number; size: number; opacity: number }, userId?: string) => void;
  deleteObjectsInArea: (objectIds: string[], eraserArea: { x: number; y: number; width: number; height: number }, userId?: string) => void;
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
  }) => void;
  
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
  
  // Direct state access for undo/redo hook
  getState: () => WhiteboardStore;
  setState: (updater: (state: WhiteboardStore) => WhiteboardStore) => void;
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

// Get a default user ID for when no user context is available
const getDefaultUserId = () => {
  let userId = localStorage.getItem('whiteboard-user-id');
  if (!userId) {
    userId = nanoid();
    localStorage.setItem('whiteboard-user-id', userId);
  }
  return userId;
};

export const useWhiteboardStore = create<WhiteboardStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,
    actionHistory: [],
    currentHistoryIndex: -1,
    userActionHistories: new Map(),
    userHistoryIndices: new Map(),
    stateVersion: 0,
    lastStateUpdate: Date.now(),
    pendingActions: [],

    // Direct state access methods for undo/redo hook
    getState: () => get(),
    setState: (updater) => set(updater),

    // Safe user history index updates (only for local user)
    updateLocalUserHistoryIndex: (userId: string, newIndex: number) => {
      console.log('🔒 Updating LOCAL user history index:', { userId, newIndex });
      set((state) => {
        const newIndices = new Map(state.userHistoryIndices);
        newIndices.set(userId, newIndex);
        return {
          ...state,
          userHistoryIndices: newIndices
        };
      });
    },

    // Direct state manipulation for undo/redo (bypasses action history)
    applyStateChange: (stateChange: Partial<WhiteboardState>) => {
      console.log('🔄 Applying direct state change:', Object.keys(stateChange));
      set((state) => ({
        ...state,
        ...stateChange,
        stateVersion: state.stateVersion + 1,
        lastStateUpdate: Date.now()
      }));
    },

    dispatch: (action: WhiteboardAction, isRemote: boolean = false) => {
      console.log('🔄 Dispatching action:', {
        type: action.type,
        id: action.id,
        userId: action.userId,
        isRemote,
        timestamp: action.timestamp
      });
      
      // Check if this is a sync action
      const isSyncAction = action.type === 'SYNC_UNDO' || action.type === 'SYNC_REDO';
      
      set((state) => {
        const newState = applyAction(state, action);
        
        // Initialize history tracking variables
        let newHistory = state.actionHistory;
        let newHistoryIndex = state.currentHistoryIndex;
        let userHistories = new Map(state.userActionHistories);
        let userIndices = new Map(state.userHistoryIndices);
        
        // Only add non-sync actions to global history
        if (!isSyncAction) {
          newHistory = [...state.actionHistory, action];
          newHistoryIndex = newHistory.length - 1;
        }
        
        // Handle user-specific history ONLY for local actions, not remote or sync actions
        if (!isRemote && !isSyncAction) {
          console.log('📊 Adding LOCAL action to user history:', { type: action.type, userId: action.userId });
          
          const userHistory = userHistories.get(action.userId) || [];
          const userIndex = userIndices.get(action.userId) ?? -1;
          
          // Check for duplicates
          const isDuplicate = userHistory.some(existingAction => existingAction.id === action.id);
          if (!isDuplicate) {
            // Trim user history at current index and add new action
            const newUserHistory = userHistory.slice(0, userIndex + 1);
            newUserHistory.push(action);
            
            userHistories.set(action.userId, newUserHistory);
            userIndices.set(action.userId, newUserHistory.length - 1);
            
            console.log('📊 Updated LOCAL user history:', {
              userId: action.userId,
              length: newUserHistory.length,
              index: newUserHistory.length - 1
            });
          }
        } else if (isRemote && !isSyncAction) {
          console.log('🌐 Adding REMOTE action to user history:', { type: action.type, userId: action.userId });
          
          const userHistory = userHistories.get(action.userId) || [];
          
          // Check for duplicates
          const isDuplicate = userHistory.some(existingAction => existingAction.id === action.id);
          if (!isDuplicate) {
            const newUserHistory = [...userHistory, action].sort((a, b) => a.timestamp - b.timestamp);
            userHistories.set(action.userId, newUserHistory);
            // DO NOT update the remote user's history index - that's managed locally by each client
            
            console.log('📊 Added REMOTE action to user history (no index update):', {
              userId: action.userId,
              actionId: action.id,
              historyLength: newUserHistory.length
            });
          }
        } else if (isSyncAction) {
          console.log('🔄 SYNC action - skipping ALL history updates:', action.type);
        }
        
        // Update state tracking
        const newVersion = state.stateVersion + 1;
        const timestamp = Date.now();
        
        return {
          ...newState,
          actionHistory: newHistory,
          currentHistoryIndex: newHistoryIndex,
          userActionHistories: userHistories,
          userHistoryIndices: userIndices,
          lastAction: isSyncAction ? state.lastAction : action, // Don't overwrite lastAction with sync actions
          stateVersion: newVersion,
          lastStateUpdate: timestamp
        };
      });
    },

    addObject: (objectData, userId = getDefaultUserId()) => {
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
        id: nanoid(),
        userId
      };
      
      get().dispatch(action);
      return id;
    },

    updateObject: (id, updates, userId = getDefaultUserId()) => {
      const state = get();
      const existingObject = state.objects[id];
      
      if (!existingObject) {
        console.warn('⚠️ Cannot update non-existent object:', id);
        return;
      }
      
      const action: UpdateObjectAction = {
        type: 'UPDATE_OBJECT',
        payload: { id, updates: { ...updates, updatedAt: Date.now() } },
        previousState: { object: existingObject }, // Store previous state for undo
        timestamp: Date.now(),
        id: nanoid(),
        userId
      };
      
      get().dispatch(action);
    },

    deleteObject: (id, userId = getDefaultUserId()) => {
      const state = get();
      const existingObject = state.objects[id];
      
      if (!existingObject) {
        console.warn('⚠️ Cannot delete non-existent object:', id);
        return;
      }
      
      const action: DeleteObjectAction = {
        type: 'DELETE_OBJECT',
        payload: { id },
        previousState: { object: existingObject }, // Store previous state for undo
        timestamp: Date.now(),
        id: nanoid(),
        userId
      };
      
      get().dispatch(action);
    },

    selectObjects: (objectIds, userId = getDefaultUserId()) => {
      const state = get();
      
      const action: SelectObjectsAction = {
        type: 'SELECT_OBJECTS',
        payload: { objectIds },
        previousState: { selectedObjectIds: state.selectedObjectIds }, // Store previous state for undo
        timestamp: Date.now(),
        id: nanoid(),
        userId
      };
      
      get().dispatch(action);
    },

    clearSelection: (userId = getDefaultUserId()) => {
      get().selectObjects([], userId);
    },

    updateViewport: (viewport, userId = getDefaultUserId()) => {
      const state = get();
      
      const action: UpdateViewportAction = {
        type: 'UPDATE_VIEWPORT',
        payload: viewport,
        previousState: { viewport: state.viewport }, // Store previous state for undo
        timestamp: Date.now(),
        id: nanoid(),
        userId
      };
      
      get().dispatch(action);
    },

    updateSettings: (settings, userId = getDefaultUserId()) => {
      const state = get();
      
      const action: UpdateSettingsAction = {
        type: 'UPDATE_SETTINGS',
        payload: settings,
        previousState: { settings: state.settings }, // Store previous state for undo
        timestamp: Date.now(),
        id: nanoid(),
        userId
      };
      
      get().dispatch(action);
    },

    clearCanvas: (userId = getDefaultUserId()) => {
      const state = get();
      
      const action: ClearCanvasAction = {
        type: 'CLEAR_CANVAS',
        payload: {}, // Store previous state for undo
        previousState: { 
          objects: state.objects, 
          selectedObjectIds: state.selectedObjectIds 
        },
        timestamp: Date.now(),
        id: nanoid(),
        userId
      };
      
      get().dispatch(action);
    },

    batchUpdate: (actions) => {
      const action: BatchUpdateAction = {
        type: 'BATCH_UPDATE',
        payload: { actions },
        timestamp: Date.now(),
        id: nanoid(),
        userId: getDefaultUserId()
      };
      
      get().dispatch(action);
    },

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
    }) => {
      set((state) => {
        const newObjects = { ...state.objects };
        const originalObject = newObjects[action.originalObjectId];
        
        if (originalObject) {
          // Store the original object for undo
          const eraseAction: ErasePathAction = {
            type: 'ERASE_PATH',
            payload: action,
            timestamp: Date.now(),
            id: nanoid(),
            userId: get().getCurrentUserId(),
            previousState: {
              object: originalObject
            }
          };
          
          // Remove the original object
          delete newObjects[action.originalObjectId];
          
          // Create new path objects from the resulting segments
          action.resultingSegments.forEach((segment) => {
            if (segment.points.length >= 2) {
              // Convert points back to path string
              const pathString = segment.points.reduce((path, point, index) => {
                const command = index === 0 ? 'M' : 'L';
                return `${path} ${command} ${point.x} ${point.y}`;
              }, '');
              
              // Create new path object with original properties but new path data
              const newPathObject: WhiteboardObject = {
                id: nanoid(),
                type: 'path',
                x: originalObject.x,
                y: originalObject.y,
                stroke: originalObject.stroke || '#000000',
                strokeWidth: originalObject.strokeWidth || 2,
                fill: originalObject.fill || 'none',
                opacity: originalObject.opacity || 1,
                data: {
                  path: pathString,
                  isShape: false // Mark as non-shape since it's been erased
                },
                createdAt: Date.now(),
                updatedAt: Date.now()
              };
              
              newObjects[newPathObject.id] = newPathObject;
            }
          });
          
          console.log('🧹 Erased path:', {
            originalId: action.originalObjectId.slice(0, 8),
            originalType: originalObject.type,
            resultingSegments: action.resultingSegments.length,
            newObjectCount: Object.keys(newObjects).length
          });
          
          return {
            objects: newObjects,
            lastAction: eraseAction,
            stateVersion: state.stateVersion + 1,
            lastStateUpdate: Date.now()
          };
        }
        
        return state;
      });
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
      console.log('🌐 Applying remote action:', { type: action.type, id: action.id, userId: action.userId });
      
      // Use the dispatch method with isRemote flag
      get().dispatch(action, true);
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
        userActionHistories: new Map(),
        userHistoryIndices: new Map(),
        stateVersion: state.stateVersion + 1,
        lastStateUpdate: Date.now()
      }));
    },

    erasePixels: (eraserPath, userId = getDefaultUserId()) => {
      const state = get();
      const eraserRadius = eraserPath.size / 2;
      const eraserPoints = [{ x: eraserPath.x, y: eraserPath.y, radius: eraserRadius }];
      
      // Find all path objects that intersect with the eraser
      const affectedObjects: Array<{ id: string; object: WhiteboardObject; segments: any[] }> = [];
      
      Object.entries(state.objects).forEach(([id, obj]) => {
        if (obj.type === 'path' && obj.data?.path && !obj.data?.isEraser) {
          const intersects = doesPathIntersectEraserBatch(
            obj.data.path,
            obj.x,
            obj.y,
            eraserPoints,
            obj.strokeWidth || 2
          );
          
          if (intersects) {
            const points = pathToPoints(obj.data.path);
            const relativeEraserX = eraserPath.x - obj.x;
            const relativeEraserY = eraserPath.y - obj.y;
            
            const segments = erasePointsFromPathBatch(
              points, 
              [{ x: relativeEraserX, y: relativeEraserY, radius: eraserRadius }],
              obj.strokeWidth || 2
            );
            
            affectedObjects.push({ id, object: obj, segments });
          }
        }
      });
      
      // Create atomic erase actions for each affected object
      affectedObjects.forEach(({ id, object, segments }) => {
        const action: ErasePathAction = {
          type: 'ERASE_PATH',
          payload: {
            originalObjectId: id,
            eraserPath: {
              x: eraserPath.x,
              y: eraserPath.y,
              size: eraserPath.size,
              path: eraserPath.path
            },
            resultingSegments: segments
          },
          previousState: { object }, // Store original object for undo
          timestamp: Date.now(),
          id: nanoid(),
          userId
        };
        
        get().dispatch(action);
      });
    },

    deleteObjectsInArea: (objectIds, eraserArea, userId = getDefaultUserId()) => {
      const state = get();
      
      // Store all deleted objects for potential undo
      const deletedObjects: { [id: string]: WhiteboardObject } = {};
      objectIds.forEach(id => {
        if (state.objects[id]) {
          deletedObjects[id] = state.objects[id];
        }
      });
      
      const action: DeleteObjectsInAreaAction = {
        type: 'DELETE_OBJECTS_IN_AREA',
        payload: { objectIds, eraserArea },
        previousState: { objects: deletedObjects },
        timestamp: Date.now(),
        id: nanoid(),
        userId
      };
      
      get().dispatch(action);
    },
  }))
);

// Helper function to apply an action to the state
function applyAction(state: WhiteboardStore, action: WhiteboardAction): Partial<WhiteboardStore> {
  switch (action.type) {
    case 'ADD_OBJECT': {
      const { object } = action.payload;
      return {
        objects: {
          ...state.objects,
          [object.id]: object
        }
      };
    }
    
    case 'UPDATE_OBJECT': {
      const { id, updates } = action.payload;
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
      const { id } = action.payload;
      const newObjects = { ...state.objects };
      delete newObjects[id];
      
      return {
        objects: newObjects,
        selectedObjectIds: state.selectedObjectIds.filter(objId => objId !== id)
      };
    }
    
    case 'SELECT_OBJECTS': {
      const { objectIds } = action.payload;
      return {
        selectedObjectIds: objectIds
      };
    }
    
    case 'UPDATE_VIEWPORT': {
      const viewportUpdates = action.payload;
      return {
        viewport: {
          ...state.viewport,
          ...viewportUpdates
        }
      };
    }
    
    case 'UPDATE_SETTINGS': {
      const settingsUpdates = action.payload;
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
      const { actions } = action.payload;
      let newState = { ...state };
      
      for (const subAction of actions) {
        newState = { ...newState, ...applyAction(newState as WhiteboardStore, subAction) };
      }
      
      return newState;
    }
    
    case 'ERASE_PATH': {
      const { originalObjectId, resultingSegments } = action.payload;
      const newObjects = { ...state.objects };
      const originalObject = state.objects[originalObjectId];
      
      // Remove the original object
      delete newObjects[originalObjectId];
      
      // Add all resulting segments atomically
      resultingSegments.forEach((segment) => {
        if (segment.points.length >= 2) {
          if (originalObject) {
            const newPath = pointsToPath(segment.points);
            const newObject: WhiteboardObject = {
              ...originalObject,
              id: segment.id,
              data: {
                ...originalObject.data,
                path: newPath,
                // IMPORTANT: Set isShape to false for erased segments
                isShape: false,
                // Remove shapeType since it's no longer a complete shape
                shapeType: undefined
              },
              updatedAt: Date.now()
            };
            newObjects[segment.id] = newObject;
          }
        }
      });
      
      return {
        objects: newObjects,
        selectedObjectIds: state.selectedObjectIds.filter(objId => objId !== originalObjectId)
      };
    }
    
    case 'DELETE_OBJECTS_IN_AREA': {
      const { objectIds } = action.payload;
      const newObjects = { ...state.objects };
      
      objectIds.forEach(id => {
        delete newObjects[id];
      });
      
      return {
        objects: newObjects,
        selectedObjectIds: state.selectedObjectIds.filter(objId => !objectIds.includes(objId))
      };
    }
    
    // Handle undo/redo sync actions (apply state directly without adding to history)
    case 'SYNC_UNDO':
    case 'SYNC_REDO': {
      console.log('🔄 Applying SYNC action state change:', action.type);
      const { stateChange } = action.payload;
      return stateChange;
    }
    
    default:
      console.warn('Unknown action type:', (action as any).type);
      return {};
  }
}
