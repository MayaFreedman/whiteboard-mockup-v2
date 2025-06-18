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
  ErasePathAction,
  UndoAction,
  RedoAction
} from '../types/whiteboard';
import { erasePointsFromPathBatch, doesPathIntersectEraserBatch } from '../utils/path/pathErasing';
import { pointsToPath, pathToPoints } from '../utils/path/pathConversion';

interface WhiteboardStore extends WhiteboardState {
  // Action history for undo/redo
  actionHistory: WhiteboardAction[];
  currentHistoryIndex: number;
  
  // User-specific action tracking
  userActionHistories: Map<string, WhiteboardAction[]>;
  userHistoryIndices: Map<string, number>;
  
  // State tracking for multiplayer
  stateVersion: number;
  lastStateUpdate: number;
  pendingActions: WhiteboardAction[];
  
  // Actions that will be easily serializable for multiplayer
  dispatch: (action: WhiteboardAction) => void;
  
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
  erasePath: (action: { originalObjectId: string; eraserPath: { x: number; y: number; size: number; path: string }; resultingSegments: Array<{ points: Array<{ x: number; y: number }>; id: string }> }, userId?: string) => void;
  
  // User-specific Undo/Redo
  undo: (userId: string) => void;
  redo: (userId: string) => void;
  canUndo: (userId: string) => boolean;
  canRedo: (userId: string) => boolean;
  
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

    dispatch: (action: WhiteboardAction) => {
      console.log('🔄 Dispatching action:', {
        type: action.type,
        id: action.id,
        userId: action.userId,
        timestamp: action.timestamp,
        payload: action.payload
      });
      
      set((state) => {
        const newState = applyAction(state, action);
        
        // Add to global history (for undo/redo)
        const newHistory = state.actionHistory.slice(0, state.currentHistoryIndex + 1);
        newHistory.push(action);
        
        // Add to user-specific history - but only for non-undo/redo actions
        const userHistories = new Map(state.userActionHistories);
        const userIndices = new Map(state.userHistoryIndices);
        
        if (action.type !== 'UNDO' && action.type !== 'REDO') {
          const userHistory = userHistories.get(action.userId) || [];
          const userIndex = userIndices.get(action.userId) ?? -1;
          
          // Trim user history at current index and add new action
          const newUserHistory = userHistory.slice(0, userIndex + 1);
          newUserHistory.push(action);
          
          userHistories.set(action.userId, newUserHistory);
          userIndices.set(action.userId, newUserHistory.length - 1);
        }
        
        // Update state tracking
        const newVersion = state.stateVersion + 1;
        const timestamp = Date.now();
        
        console.log('📊 State updated:', {
          version: newVersion,
          objectCount: Object.keys(newState.objects || state.objects).length,
          selectedCount: (newState.selectedObjectIds || state.selectedObjectIds).length,
          historyLength: newHistory.length,
          actionType: action.type
        });
        
        return {
          ...newState,
          actionHistory: newHistory,
          currentHistoryIndex: newHistory.length - 1,
          userActionHistories: userHistories,
          userHistoryIndices: userIndices,
          lastAction: action,
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
      
      console.log('➕ Adding object:', { id, type: object.type, position: { x: object.x, y: object.y }, userId });
      
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
      console.log('📝 Updating object:', { id: id.slice(0, 8), updates, userId });
      
      const action: UpdateObjectAction = {
        type: 'UPDATE_OBJECT',
        payload: { id, updates: { ...updates, updatedAt: Date.now() } },
        timestamp: Date.now(),
        id: nanoid(),
        userId
      };
      
      get().dispatch(action);
    },

    deleteObject: (id, userId = getDefaultUserId()) => {
      console.log('🗑️ Deleting object:', { id: id.slice(0, 8), userId });
      
      const action: DeleteObjectAction = {
        type: 'DELETE_OBJECT',
        payload: { id },
        timestamp: Date.now(),
        id: nanoid(),
        userId
      };
      
      get().dispatch(action);
    },

    selectObjects: (objectIds, userId = getDefaultUserId()) => {
      console.log('🎯 Selecting objects:', { count: objectIds.length, ids: objectIds.map(id => id.slice(0, 8)), userId });
      
      const action: SelectObjectsAction = {
        type: 'SELECT_OBJECTS',
        payload: { objectIds },
        timestamp: Date.now(),
        id: nanoid(),
        userId
      };
      
      get().dispatch(action);
    },

    clearSelection: (userId = getDefaultUserId()) => {
      console.log('🎯 Clearing selection');
      get().selectObjects([], userId);
    },

    updateViewport: (viewport, userId = getDefaultUserId()) => {
      console.log('🔍 Updating viewport:', viewport);
      
      const action: UpdateViewportAction = {
        type: 'UPDATE_VIEWPORT',
        payload: viewport,
        timestamp: Date.now(),
        id: nanoid(),
        userId
      };
      
      get().dispatch(action);
    },

    updateSettings: (settings, userId = getDefaultUserId()) => {
      console.log('⚙️ Updating settings:', settings);
      
      const action: UpdateSettingsAction = {
        type: 'UPDATE_SETTINGS',
        payload: settings,
        timestamp: Date.now(),
        id: nanoid(),
        userId
      };
      
      get().dispatch(action);
    },

    clearCanvas: (userId = getDefaultUserId()) => {
      console.log('🧹 Clearing canvas');
      
      const action: ClearCanvasAction = {
        type: 'CLEAR_CANVAS',
        payload: {},
        timestamp: Date.now(),
        id: nanoid(),
        userId
      };
      
      get().dispatch(action);
    },

    batchUpdate: (actions) => {
      console.log('📦 Batch updating:', { actionCount: actions.length });
      
      const action: BatchUpdateAction = {
        type: 'BATCH_UPDATE',
        payload: { actions },
        timestamp: Date.now(),
        id: nanoid(),
        userId: getDefaultUserId()
      };
      
      get().dispatch(action);
    },

    erasePath: (eraserAction: { originalObjectId: string; eraserPath: { x: number; y: number; size: number; path: string }; resultingSegments: Array<{ points: Array<{ x: number; y: number }>; id: string }> }, userId = getDefaultUserId()) => {
      console.log('✂️ Atomic path erase:', { originalObjectId: eraserAction.originalObjectId.slice(0, 8), segmentsCreated: eraserAction.resultingSegments.length });
      
      const action: ErasePathAction = {
        type: 'ERASE_PATH',
        payload: eraserAction,
        timestamp: Date.now(),
        id: nanoid(),
        userId
      };
      
      get().dispatch(action);
    },

    undo: (userId: string) => {
      const state = get();
      if (!state.canUndo(userId)) {
        console.log('↶ Cannot undo for user:', userId);
        return;
      }

      console.log('↶ Undoing action for user:', userId);
      
      const userHistory = state.userActionHistories.get(userId) || [];
      const currentIndex = state.userHistoryIndices.get(userId) ?? -1;
      
      if (currentIndex >= 0) {
        const actionToUndo = userHistory[currentIndex];
        console.log('↶ Undoing action:', actionToUndo.type, actionToUndo.id);
        
        // Create the inverse action
        const inverseAction = createInverseAction(actionToUndo, state);
        if (inverseAction) {
          // Create an UNDO action that will be synchronized across all users
          const undoAction: UndoAction = {
            type: 'UNDO',
            payload: {
              targetUserId: userId,
              inverseAction: inverseAction
            },
            timestamp: Date.now(),
            id: nanoid(),
            userId: userId
          };
          
          // Dispatch the UNDO action through the normal system
          get().dispatch(undoAction);
          console.log('✅ Undo action dispatched for user:', userId);
        } else {
          console.warn('⚠️ Could not create inverse action for:', actionToUndo.type);
        }
      }
    },

    redo: (userId: string) => {
      const state = get();
      if (!state.canRedo(userId)) {
        console.log('↷ Cannot redo for user:', userId);
        return;
      }

      console.log('↷ Redoing action for user:', userId);
      
      const userHistory = state.userActionHistories.get(userId) || [];
      const currentIndex = state.userHistoryIndices.get(userId) ?? -1;
      const newIndex = currentIndex + 1;
      
      if (newIndex < userHistory.length) {
        const actionToRedo = userHistory[newIndex];
        console.log('↷ Redoing action:', actionToRedo.type, actionToRedo.id);
        
        // Check for conflicts before redoing
        if (hasConflict(actionToRedo, state)) {
          console.warn('⚠️ Conflict detected, skipping redo for action:', actionToRedo.id);
          return;
        }
        
        // Create a REDO action that will be synchronized across all users
        const redoAction: RedoAction = {
          type: 'REDO',
          payload: {
            targetUserId: userId,
            redoAction: actionToRedo
          },
          timestamp: Date.now(),
          id: nanoid(),
          userId: userId
        };
        
        // Dispatch the REDO action through the normal system
        get().dispatch(redoAction);
        console.log('✅ Redo action dispatched for user:', userId);
      }
    },

    canUndo: (userId: string) => {
      const state = get();
      const currentIndex = state.userHistoryIndices.get(userId) ?? -1;
      return currentIndex >= 0;
    },

    canRedo: (userId: string) => {
      const state = get();
      const userHistory = state.userActionHistories.get(userId) || [];
      const currentIndex = state.userHistoryIndices.get(userId) ?? -1;
      return currentIndex < userHistory.length - 1;
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
      
      set((state) => {
        // Check for action deduplication - don't apply if we've already seen this action
        const actionExists = state.actionHistory.some(existingAction => existingAction.id === action.id);
        if (actionExists) {
          console.log('🔄 Action already exists in history, skipping:', action.id);
          return state;
        }
        
        // Apply the remote action to the state
        const newState = applyAction(state, action);
        
        // Add to global history in chronological order
        const newHistory = [...state.actionHistory, action].sort((a, b) => a.timestamp - b.timestamp);
        
        // Add to user-specific history for the remote user (only for non-undo/redo actions)
        const userHistories = new Map(state.userActionHistories);
        const userIndices = new Map(state.userHistoryIndices);
        
        if (action.type !== 'UNDO' && action.type !== 'REDO') {
          const userHistory = userHistories.get(action.userId) || [];
          
          // Add to user's history in chronological order and remove duplicates
          const newUserHistory = [...userHistory, action]
            .filter((item, index, arr) => arr.findIndex(a => a.id === item.id) === index)
            .sort((a, b) => a.timestamp - b.timestamp);
          
          userHistories.set(action.userId, newUserHistory);
          
          // Update user's current index to the end of their history
          userIndices.set(action.userId, newUserHistory.length - 1);
        }
        
        console.log('✅ Remote action applied and added to user history:', {
          userId: action.userId,
          actionId: action.id,
          actionType: action.type,
          globalHistoryLength: newHistory.length
        });
        
        return {
          ...newState,
          actionHistory: newHistory,
          currentHistoryIndex: newHistory.length - 1,
          userActionHistories: userHistories,
          userHistoryIndices: userIndices,
          stateVersion: state.stateVersion + 1,
          lastStateUpdate: Date.now()
        };
      });
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

    erasePixels: (eraserPath: { path: string; x: number; y: number; size: number; opacity: number }, userId = getDefaultUserId()) => {
      console.log('🧹 Erasing pixels at:', { x: eraserPath.x, y: eraserPath.y, size: eraserPath.size });
      
      const state = get();
      const eraserRadius = eraserPath.size / 2;
      const eraserPoints = [{ x: eraserPath.x, y: eraserPath.y, radius: eraserRadius }];
      
      // Find all path objects that intersect with the eraser
      const affectedObjects: Array<{ id: string; object: WhiteboardObject; segments: any[] }> = [];
      
      Object.entries(state.objects).forEach(([id, obj]) => {
        if (obj.type === 'path' && obj.data?.path && !obj.data?.isEraser) {
          // Check if this path intersects with the eraser
          const intersects = doesPathIntersectEraserBatch(
            obj.data.path,
            obj.x,
            obj.y,
            eraserPoints,
            obj.strokeWidth || 2
          );
          
          if (intersects) {
            console.log('🎯 Path intersects with eraser, processing:', id.slice(0, 8));
            
            // Convert path to points and erase intersecting points
            const points = pathToPoints(obj.data.path);
            
            // Convert eraser coordinates to path-relative coordinates
            const relativeEraserX = eraserPath.x - obj.x;
            const relativeEraserY = eraserPath.y - obj.y;
            
            // Get remaining segments after erasing
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
          timestamp: Date.now(),
          id: nanoid(),
          userId
        };
        
        get().dispatch(action);
      });
    },

    deleteObjectsInArea: (objectIds: string[], eraserArea: { x: number; y: number; width: number; height: number }, userId = getDefaultUserId()) => {
      console.log('🗑️ Deleting objects in area:', { objectCount: objectIds.length, area: eraserArea });
      
      const action: DeleteObjectsInAreaAction = {
        type: 'DELETE_OBJECTS_IN_AREA',
        payload: { objectIds, eraserArea },
        timestamp: Date.now(),
        id: nanoid(),
        userId
      };
      
      get().dispatch(action);
    },
  }))
);

// Helper function to create inverse actions for undo operations
function createInverseAction(action: WhiteboardAction, state: WhiteboardStore): WhiteboardAction | null {
  switch (action.type) {
    case 'ADD_OBJECT': {
      const { object } = (action as AddObjectAction).payload;
      return {
        type: 'DELETE_OBJECT',
        payload: { id: object.id },
        timestamp: Date.now(),
        id: nanoid(),
        userId: action.userId
      };
    }
    
    case 'DELETE_OBJECT': {
      const { id } = (action as DeleteObjectAction).payload;
      const deletedObject = state.objects[id];
      if (!deletedObject) return null;
      
      return {
        type: 'ADD_OBJECT',
        payload: { object: deletedObject },
        timestamp: Date.now(),
        id: nanoid(),
        userId: action.userId
      };
    }
    
    case 'UPDATE_OBJECT': {
      const { id, updates } = (action as UpdateObjectAction).payload;
      const currentObject = state.objects[id];
      if (!currentObject) return null;
      
      // Create reverse updates by taking the previous values
      const reverseUpdates: Record<string, any> = {};
      Object.keys(updates).forEach(key => {	
        if (key in currentObject) {
          reverseUpdates[key] = (currentObject as any)[key];
        }
      });
      
      return {
        type: 'UPDATE_OBJECT',
        payload: { id, updates: reverseUpdates as Partial<WhiteboardObject> },
        timestamp: Date.now(),
        id: nanoid(),
        userId: action.userId
      };
    }
    
    case 'SELECT_OBJECTS': {
      return {
        type: 'SELECT_OBJECTS',
        payload: { objectIds: state.selectedObjectIds },
        timestamp: Date.now(),
        id: nanoid(),
        userId: action.userId
      };
    }
    
    case 'UPDATE_VIEWPORT': {
      return {
        type: 'UPDATE_VIEWPORT',
        payload: state.viewport,
        timestamp: Date.now(),
        id: nanoid(),
        userId: action.userId
      };
    }
    
    case 'UPDATE_SETTINGS': {
      return {
        type: 'UPDATE_SETTINGS',
        payload: state.settings,
        timestamp: Date.now(),
        id: nanoid(),
        userId: action.userId
      };
    }
    
    case 'CLEAR_CANVAS': {
      // Cannot reliably reverse clear canvas, would need to restore all objects
      console.warn('Cannot create inverse for CLEAR_CANVAS action');
      return null;
    }
    
    case 'ERASE_PATH': {
      // Cannot reliably reverse path erasing
      console.warn('Cannot create inverse for ERASE_PATH action');
      return null;
    }
    
    default:
      console.warn('Unknown action type for inverse creation:', (action as any).type);
      return null;
  }
}

// Helper function to detect conflicts before redoing actions
function hasConflict(action: WhiteboardAction, state: WhiteboardStore): boolean {
  switch (action.type) {
    case 'UPDATE_OBJECT':
    case 'DELETE_OBJECT': {
      const objectId = action.type === 'UPDATE_OBJECT' 
        ? (action as UpdateObjectAction).payload.id
        : (action as DeleteObjectAction).payload.id;
      
      const currentObject = state.objects[objectId];
      if (!currentObject) {
        console.log('🔍 Conflict: Object no longer exists:', objectId);
        return true;
      }
      
      // Check if object was modified by another user after this action
      if (currentObject.updatedAt > action.timestamp) {
        console.log('🔍 Conflict: Object was modified after this action:', objectId);
        return true;
      }
      
      return false;
    }
    
    default:
      return false;
  }
}

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
    
    case 'UNDO': {
      const { targetUserId, inverseAction } = (action as UndoAction).payload;
      console.log('↶ Processing UNDO action for user:', targetUserId);
      
      // Apply the inverse action to undo the original action
      const undoResult = applyAction(state, inverseAction);
      
      // Update the user's history index
      const newIndices = new Map(state.userHistoryIndices);
      const currentIndex = newIndices.get(targetUserId) ?? -1;
      if (currentIndex >= 0) {
        newIndices.set(targetUserId, currentIndex - 1);
      }
      
      return {
        ...undoResult,
        userHistoryIndices: newIndices
      };
    }
    
    case 'REDO': {
      const { targetUserId, redoAction } = (action as RedoAction).payload;
      console.log('↷ Processing REDO action for user:', targetUserId);
      
      // Apply the original action to redo it
      const redoResult = applyAction(state, redoAction);
      
      // Update the user's history index
      const newIndices = new Map(state.userHistoryIndices);
      const currentIndex = newIndices.get(targetUserId) ?? -1;
      const userHistory = state.userActionHistories.get(targetUserId) || [];
      if (currentIndex < userHistory.length - 1) {
        newIndices.set(targetUserId, currentIndex + 1);
      }
      
      return {
        ...redoResult,
        userHistoryIndices: newIndices
      };
    }
    
    case 'ERASE_PATH': {
      const { originalObjectId, resultingSegments } = (action as ErasePathAction).payload;
      const newObjects = { ...state.objects };
      
      // Remove the original object
      delete newObjects[originalObjectId];
      
      // Add all resulting segments atomically
      const newSegmentObjects: WhiteboardObject[] = [];
      resultingSegments.forEach((segment) => {
        if (segment.points.length >= 2) {
          const originalObject = state.objects[originalObjectId];
          if (originalObject) {
            const newPath = pointsToPath(segment.points);
            const newObject: WhiteboardObject = {
              ...originalObject,
              id: segment.id,
              data: {
                ...originalObject.data,
                path: newPath
              },
              updatedAt: Date.now()
            };
            newObjects[segment.id] = newObject;
            newSegmentObjects.push(newObject);
          }
        }
      });
      
      // Update selected objects list to exclude removed object
      const newSelectedObjectIds = state.selectedObjectIds.filter(
        objId => objId !== originalObjectId
      );
      
      console.log('✂️ Atomic path erase completed:', {
        originalObjectId: originalObjectId.slice(0, 8),
        segmentsCreated: newSegmentObjects.length,
        totalObjects: Object.keys(newObjects).length
      });
      
      return {
        objects: newObjects,
        selectedObjectIds: newSelectedObjectIds
      };
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
          const intersects = doesPathIntersectEraserBatch(
            obj.data.path,
            obj.x,
            obj.y,
            [{ x: eraserPath.x, y: eraserPath.y, radius: eraserRadius }],
            obj.strokeWidth || 2
          );
          
          if (intersects) {
            console.log('🎯 Path intersects with eraser, processing:', id.slice(0, 8));
            
            // Convert path to points and erase intersecting points
            const points = pathToPoints(obj.data.path);
            
            // Convert eraser coordinates to path-relative coordinates
            const relativeEraserX = eraserPath.x - obj.x;
            const relativeEraserY = eraserPath.y - obj.y;
            
            // Get remaining segments after erasing
            const segments = erasePointsFromPathBatch(
              points, 
              [{ x: relativeEraserX, y: relativeEraserY, radius: eraserRadius }],
              obj.strokeWidth || 2
            );
            
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
      console.warn('Unknown action type:', (action as any).type);
      return {};
  }
}
