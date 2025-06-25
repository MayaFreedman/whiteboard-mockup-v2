import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { Viewport } from '../types/viewport';
import { WhiteboardAction, WhiteboardObject } from '../types/whiteboard';
import { brushEffectCache } from '../utils/brushCache';
import { actionManager } from '../services/ActionManager';
import { historyManager } from '../services/HistoryManager';
import { batchManager } from '../services/BatchManager';

export interface WhiteboardSettings {
  gridVisible: boolean;
  linedPaperVisible: boolean;
  backgroundColor: string;
}

export interface WhiteboardStore {
  objects: Record<string, WhiteboardObject>;
  selectedObjectIds: string[];
  viewport: Viewport;
  settings: WhiteboardSettings;
  lastAction?: WhiteboardAction;
  
  // Track object relationships for conflict resolution
  objectRelationships: Map<string, { originalId?: string; segmentIds?: string[] }>;

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
  clearSelection: (userId?: string) => void;
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
  
  // Conflict detection utilities
  checkObjectExists: (objectId: string) => boolean;
  getObjectRelationship: (objectId: string) => { originalId?: string; segmentIds?: string[] } | undefined;
  
  // History management (delegated to HistoryManager)
  canUndo: (userId: string) => boolean;
  canRedo: (userId: string) => boolean;
  getUserHistory: (userId: string) => WhiteboardAction[];
  getUserHistoryIndex: (userId: string) => number;
  
  // Batch management (delegated to BatchManager)
  startActionBatch: (actionType: string, objectId: string, userId?: string) => string;
  endActionBatch: () => void;
  addToBatch: (action: WhiteboardAction) => void;
  getCurrentBatch: () => any;
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
  lastAction: undefined,
  objectRelationships: new Map(),

  recordAction: (action) => {
    // Use ActionManager to validate if action should be recorded
    if (!actionManager.shouldRecordAction(action)) {
      console.log('🔒 Action filtered from recording:', action.type);
      return;
    }

    // Check if we can add to current batch
    if (batchManager.hasActiveBatch() && batchManager.addToBatch(action)) {
      return; // Action was added to batch, don't record individually
    }

    // End any existing batch if it couldn't accommodate this action
    if (batchManager.hasActiveBatch()) {
      const completedBatch = batchManager.endBatch();
      if (completedBatch) {
        // Record the completed batch
        historyManager.addToUserHistory(completedBatch, completedBatch.userId);
        historyManager.addToGlobalHistory(completedBatch);
        
        set((state) => ({
          lastAction: completedBatch
        }));
      }
    }
    
    // Record individual action normally
    historyManager.addToUserHistory(action, action.userId);
    historyManager.addToGlobalHistory(action);
    
    set((state) => ({
      lastAction: action
    }));
  },

  // Delegate history management to HistoryManager
  canUndo: (userId: string) => historyManager.canUndo(userId),
  canRedo: (userId: string) => historyManager.canRedo(userId),
  getUserHistory: (userId: string) => historyManager.getUserHistory(userId),
  getUserHistoryIndex: (userId: string) => historyManager.getUserHistoryIndex(userId),

  // Delegate batch management to BatchManager
  startActionBatch: (actionType, objectId, userId = 'local') => {
    return batchManager.startBatch(actionType, objectId, userId);
  },
  endActionBatch: () => {
    const completedBatch = batchManager.endBatch();
    if (completedBatch) {
      historyManager.addToUserHistory(completedBatch, completedBatch.userId);
      historyManager.addToGlobalHistory(completedBatch);
      
      set((state) => ({
        lastAction: completedBatch
      }));
    }
  },
  addToBatch: (action) => {
    batchManager.addToBatch(action);
  },
  getCurrentBatch: () => batchManager.getCurrentBatch(),

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

    const action = actionManager.createAction<WhiteboardAction>(
      'ADD_OBJECT',
      { object: newObject },
      userId
    );

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

    const action = actionManager.createAction<WhiteboardAction>(
      'UPDATE_OBJECT',
      { id, updates },
      userId,
      { object: existingObject }
    );

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

    const action = actionManager.createAction<WhiteboardAction>(
      'DELETE_OBJECT',
      { id },
      userId,
      { object: objectToDelete }
    );

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
    
    const action = actionManager.createAction<WhiteboardAction>(
      'CLEAR_CANVAS',
      {},
      userId,
      {
        objects: state.objects,
        selectedObjectIds: state.selectedObjectIds,
      }
    );

    set({ objects: {}, selectedObjectIds: [] });
    get().recordAction(action);
  },

  selectObjects: (ids, userId = 'local') => {
    const state = get();
    
    const action = actionManager.createAction<WhiteboardAction>(
      'SELECT_OBJECTS',
      { objectIds: ids },
      userId,
      { selectedObjectIds: state.selectedObjectIds }
    );

    set({ selectedObjectIds: ids });
    get().recordAction(action);
  },

  clearSelection: (userId = 'local') => {
    const state = get();
    
    const action = actionManager.createAction<WhiteboardAction>(
      'CLEAR_SELECTION',
      {},
      userId,
      { selectedObjectIds: state.selectedObjectIds }
    );

    set({ selectedObjectIds: [] });
    get().recordAction(action);
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

    const whiteboardAction = actionManager.createAction<WhiteboardAction>(
      'ERASE_PATH',
      {
        originalObjectId,
        eraserPath,
        resultingSegments,
      },
      userId,
      { object: originalObject }
    );
    
    set((state) => {
      const newObjects = { ...state.objects };
      const newRelationships = new Map(state.objectRelationships);
      
      // Remove the original object
      delete newObjects[originalObjectId];
      
      // Track relationships for conflict resolution
      const segmentIds = resultingSegments.map(s => s.id);
      segmentIds.forEach(segmentId => {
        newRelationships.set(segmentId, { originalId: originalObjectId });
      });
      
      // Add resulting segments as new objects with preserved brush metadata
      resultingSegments.forEach((segment) => {
        if (segment.points.length >= 2) {
          // Convert points back to path string
          const pathString = segment.points.reduce((path, point, index) => {
            const command = index === 0 ? 'M' : 'L';
            return `${path} ${command} ${point.x} ${point.y}`;
          }, '');
          
          // Create new object with preserved metadata
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
              brushType: originalObjectMetadata?.brushType || originalObject.data?.brushType,
              isEraser: false
            }
          };
        }
      });
      
      return {
        objects: newObjects,
        objectRelationships: newRelationships,
        selectedObjectIds: state.selectedObjectIds.filter(id => id !== originalObjectId)
      };
    });

    get().recordAction(whiteboardAction);
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
  getStateSnapshot: () => {
    const state = get()
    return {
      objects: { ...state.objects },
      viewport: { ...state.viewport },
      settings: { ...state.settings },
      actionCount: historyManager.getHistorySnapshot().globalActionHistory.length,
      timestamp: Date.now()
    }
  },
  getActionsSince: (timestamp) => {
    return historyManager.getActionsSince(timestamp);
  },
  
  applyRemoteAction: (action) => {
    console.log('🔄 Applying remote action:', action.type, action.id);
    
    // Handle SYNC actions specially
    if (action.type === 'SYNC_UNDO' || action.type === 'SYNC_REDO') {
      console.log('🔄 Applying SYNC action state change:', action.type);
      if (action.payload.stateChange) {
        set((state) => ({
          ...state,
          ...action.payload.stateChange
        }));
      }
      
      const originalUserId = action.payload.originalUserId || action.userId;
      const currentIndex = historyManager.getUserHistoryIndex(originalUserId);
      
      if (action.type === 'SYNC_UNDO') {
        historyManager.updateUserHistoryIndex(originalUserId, currentIndex - 1);
      } else if (action.type === 'SYNC_REDO') {
        historyManager.updateUserHistoryIndex(originalUserId, currentIndex + 1);
      }
      
      return;
    }
    
    // Execute the action logic based on action type for non-SYNC actions
    switch (action.type) {
      case 'ADD_OBJECT':
        if (action.payload.object) {
          set((state) => ({
            objects: {
              ...state.objects,
              [action.payload.object.id]: action.payload.object,
            },
          }));
        }
        break;
        
      case 'UPDATE_OBJECT':
        if (action.payload.id && action.payload.updates) {
          set((state) => {
            const existingObject = state.objects[action.payload.id];
            if (existingObject) {
              return {
                objects: {
                  ...state.objects,
                  [action.payload.id]: {
                    ...existingObject,
                    ...action.payload.updates,
                    updatedAt: Date.now(),
                  },
                },
              };
            }
            return state;
          });
        }
        break;
        
      case 'DELETE_OBJECT':
        if (action.payload.id) {
          set((state) => {
            const newObjects = { ...state.objects };
            delete newObjects[action.payload.id];
            return {
              objects: newObjects,
              selectedObjectIds: state.selectedObjectIds.filter((objId) => objId !== action.payload.id),
            };
          });
        }
        break;
        
      case 'SELECT_OBJECTS':
      case 'CLEAR_SELECTION':
        console.log('🔄 Skipping remote selection action - selections are local');
        return;
        
      case 'CLEAR_CANVAS':
        set({ objects: {}, selectedObjectIds: [] });
        break;
        
      case 'ERASE_PATH':
        if (action.payload.originalObjectId && action.payload.resultingSegments) {
          const { originalObjectId, resultingSegments } = action.payload;
          const originalObject = get().objects[originalObjectId];
          
          if (originalObject) {
            const originalObjectMetadata = (action as any).payload.originalObjectMetadata || {
              brushType: originalObject.data?.brushType,
              stroke: originalObject.stroke,
              strokeWidth: originalObject.strokeWidth,
              opacity: originalObject.opacity,
              fill: originalObject.fill
            };
            
            set((state) => {
              const newObjects = { ...state.objects };
              const newRelationships = new Map(state.objectRelationships);
              
              const brushType = originalObjectMetadata?.brushType;
              if (brushType && (brushType === 'spray' || brushType === 'chalk')) {
                brushEffectCache.transferToSegments(originalObjectId, brushType, resultingSegments);
                brushEffectCache.remove(originalObjectId, brushType);
              }
              
              delete newObjects[originalObjectId];
              
              const segmentIds = resultingSegments.map(s => s.id);
              segmentIds.forEach(segmentId => {
                newRelationships.set(segmentId, { originalId: originalObjectId });
              });
              
              resultingSegments.forEach((segment) => {
                if (segment.points.length >= 2) {
                  const pathString = segment.points.reduce((path, point, index) => {
                    const command = index === 0 ? 'M' : 'L';
                    return `${path} ${command} ${point.x} ${point.y}`;
                  }, '');
                  
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
                      brushType: originalObjectMetadata?.brushType || originalObject.data?.brushType,
                      isEraser: false
                    }
                  };
                }
              });
              
              return {
                objects: newObjects,
                objectRelationships: newRelationships,
                selectedObjectIds: state.selectedObjectIds.filter(id => id !== originalObjectId)
              };
            });
          }
        }
        break;
        
      default:
        console.log('🔄 Unknown action type for remote application:', action.type);
        break;
    }
    
    // Record the action for the remote user's history
    historyManager.addToUserHistory(action, action.userId);
    historyManager.addToGlobalHistory(action);
    
    set({
      lastAction: action
    });
  },
  
  batchUpdate: (actions) => {
    console.log('Applying batch update:', actions.length, 'actions');
    actions.forEach(action => get().applyRemoteAction(action));
  },

  updateLocalUserHistoryIndex: (userId, index) => {
    historyManager.updateUserHistoryIndex(userId, index);
  },

  applyStateChange: (stateChange) => {
    set((state) => ({ ...state, ...stateChange }));
  },
  
  // Conflict detection utilities
  checkObjectExists: (objectId) => {
    return !!get().objects[objectId];
  },
  getObjectRelationship: (objectId) => {
    return get().objectRelationships.get(objectId);
  },
}));
