import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { Viewport } from '../types/viewport';
import { WhiteboardAction, WhiteboardObject } from '../types/whiteboard';
import { brushEffectCache, precalculateSprayEffect, precalculateChalkEffect, pathToPointsForBrush } from '../utils/brushCache';

export interface WhiteboardSettings {
  gridVisible: boolean;
  linedPaperVisible: boolean;
  showDots: boolean;
  backgroundColor: string;
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
  
  // Track object relationships for conflict resolution
  objectRelationships: Map<string, { originalId?: string; segmentIds?: string[] }>;
  
  // Track processed batch IDs to prevent duplicate processing
  processedBatchIds: Set<string>;
  
  // Timestamp to trigger canvas redraws after batch updates
  lastBatchUpdateTime?: number;

  // Action recording
  recordAction: (action: WhiteboardAction) => void;

  // Viewport Actions
  setViewport: (viewport: Viewport) => void;
  resetViewport: () => void;

  // Settings Actions
  setSettings: (settings: WhiteboardSettings) => void;
  updateSettings: (updates: Partial<WhiteboardSettings>, userId?: string) => void;

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
  updateBackgroundSettings: (backgroundType: 'grid' | 'lines' | 'dots' | 'none', userId?: string) => void;
  
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
  restoreHistoryState: (historyState: {
    actionHistory: WhiteboardAction[];
    userActionHistories: Record<string, WhiteboardAction[]>;
    userHistoryIndices: Record<string, number>;
    currentHistoryIndex: number;
    objectRelationships: Record<string, { originalId?: string; segmentIds?: string[] }>;
  }) => void;
  
  // Conflict detection utilities
  checkObjectExists: (objectId: string) => boolean;
  getObjectRelationship: (objectId: string) => { originalId?: string; segmentIds?: string[] } | undefined;
  
  // Soft-locks for advisory concurrency control
  locks: Map<string, { userId: string; expiresAt: number }>;
  setLock: (objectId: string, userId: string, ttlMs: number) => void;
  clearLock: (objectId: string, userId?: string) => void;
  isLockedByOther: (objectId: string, userId: string) => boolean;
  
  // Action batching for undo/redo grouping
  currentBatch: {
    id: string | null;
    userId: string | null;
    actionType: string | null;
    objectId: string | null;
    startTime: number | null;
    actions: WhiteboardAction[];
  };
  
  // Batch management
  startActionBatch: (actionType: string, objectId: string, userId?: string) => string;
  endActionBatch: () => void;
  addToBatch: (action: WhiteboardAction) => void;
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
    showDots: false,
    backgroundColor: '#ffffff',
  },
  actionHistory: [],
  currentHistoryIndex: -1,
  lastAction: undefined,
  
  // Initialize user-specific histories
  userActionHistories: new Map(),
  userHistoryIndices: new Map(),
  objectRelationships: new Map(),
  
  // Track processed batch IDs to prevent duplicate processing
  processedBatchIds: new Set(),
  
  // Advisory locks for objects
  locks: new Map(),
  
  // Initialize currentBatch
  currentBatch: {
    id: null,
    userId: null,
    actionType: null,
    objectId: null,
    startTime: null,
    actions: [],
  },

  recordAction: (action) => {
    const state = get();
    
    // Enhanced batching logic for eraser strokes and multi-operations
    const canAddToBatch = state.currentBatch.id && 
                         state.currentBatch.actionType === action.type &&
                         state.currentBatch.userId === action.userId &&
                         (
                           // Same object ID OR eraser stroke (which can affect multiple objects)
                           state.currentBatch.objectId === getActionObjectId(action) ||
                           (state.currentBatch.actionType === 'ERASE_PATH' && action.type === 'ERASE_PATH') ||
                           // Multi-delete batch: allow any DELETE_OBJECT to be added
                           (state.currentBatch.objectId === 'multi-delete' && action.type === 'DELETE_OBJECT') ||
                           // Drag completion batch: allow any UPDATE_OBJECT for multi-object drags
                           (state.currentBatch.actionType === 'DRAG_COMPLETE' && action.type === 'UPDATE_OBJECT')
                         ) &&
                         (Date.now() - (state.currentBatch.startTime || 0)) < 10000; // 10 second timeout
    
    if (canAddToBatch) {
      get().addToBatch(action);
      return;
    }
    
    // End current batch if exists and record it
    if (state.currentBatch.id && state.currentBatch.actions.length > 0) {
      get().endActionBatch();
    }
    
    // Record individual action normally
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
  },

  startActionBatch: (actionType, objectId, userId = 'local') => {
    const batchId = nanoid();
    console.log('🎯 Starting action batch:', { batchId, actionType, objectId, userId });
    
    set((state) => ({
      currentBatch: {
        id: batchId,
        userId,
        actionType,
        objectId,
        startTime: Date.now(),
        actions: [],
      }
    }));
    
    return batchId;
  },

  endActionBatch: () => {
    const state = get();
    const batch = state.currentBatch;
    
    if (!batch.id || batch.actions.length === 0) {
      // Clear empty batch
      set((state) => ({
        currentBatch: {
          id: null,
          userId: null,
          actionType: null,
          objectId: null,
          startTime: null,
          actions: [],
        }
      }));
      return;
    }
    
    console.log('🎯 Ending action batch:', { 
      batchId: batch.id, 
      actionCount: batch.actions.length,
      actionType: batch.actionType,
      objectId: batch.objectId,
      actionTypes: batch.actions.map(a => a.type),
      actionIds: batch.actions.map(a => {
        if (a.type === 'UPDATE_OBJECT' || a.type === 'DELETE_OBJECT') {
          return a.payload.id || 'no-id';
        } else if (a.type === 'ADD_OBJECT') {
          return a.payload.object?.id || 'no-id';
        }
        return 'no-id';
      })
    });
    
    // Create a batch action that contains all the individual actions
    const batchAction: WhiteboardAction = {
      type: 'BATCH_UPDATE',
      payload: { actions: batch.actions },
      timestamp: batch.startTime || Date.now(),
      id: batch.id,
      userId: batch.userId || 'local',
      previousState: batch.actions[0]?.previousState, // Use first action's previous state
    };
    
    // Record the batch as a single action in history
    set((state) => {
      const newUserHistories = new Map(state.userActionHistories);
      const newUserIndices = new Map(state.userHistoryIndices);
      
      const userHistory = newUserHistories.get(batchAction.userId) || [];
      const currentIndex = newUserIndices.get(batchAction.userId) ?? -1;
      
      const newUserHistory = [...userHistory.slice(0, currentIndex + 1), batchAction];
      newUserHistories.set(batchAction.userId, newUserHistory);
      newUserIndices.set(batchAction.userId, newUserHistory.length - 1);
      
      return {
        ...state,
        actionHistory: [...state.actionHistory, batchAction],
        currentHistoryIndex: state.actionHistory.length,
        lastAction: batchAction,
        userActionHistories: newUserHistories,
        userHistoryIndices: newUserIndices,
        currentBatch: {
          id: null,
          userId: null,
          actionType: null,
          objectId: null,
          startTime: null,
          actions: [],
        }
      };
    });
  },

  addToBatch: (action) => {
    set((state) => ({
      currentBatch: {
        ...state.currentBatch,
        actions: [...state.currentBatch.actions, action]
      }
    }));
    
    console.log('🎯 Added action to batch:', { 
      actionType: action.type, 
      batchSize: get().currentBatch.actions.length 
    });
  },

  setViewport: (viewport) => set({ viewport }),
  resetViewport: () => set({ viewport: { x: 0, y: 0, zoom: 1 } }),

  setSettings: (settings) => set({ settings }),
  updateSettings: (updates, userId = 'local') => {
    const state = get();
    const previousSettings = { ...state.settings };

    const action: WhiteboardAction = {
      type: 'UPDATE_SETTINGS',
      payload: updates,
      timestamp: Date.now(),
      id: nanoid(),
      userId,
      previousState: { settings: previousSettings },
    };

    set((state) => ({ settings: { ...state.settings, ...updates } }));
    get().recordAction(action);
  },

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

    // Precompute and cache brush effects for spray/chalk paths to avoid render fallbacks
    if (newObject.type === 'path' && newObject.data?.brushType && (newObject.data.brushType === 'spray' || newObject.data.brushType === 'chalk')) {
      try {
        const points = pathToPointsForBrush(newObject.data.path);
        const baseSeed = points.length ? Math.floor(points[0].x * 1000 + points[0].y * 1000) : 12345;
        const strokeWidth = newObject.strokeWidth || 2;
        const strokeColor = newObject.stroke || '#000000';
        const opacity = newObject.opacity || 1;
        const effectData = newObject.data.brushType === 'spray'
          ? precalculateSprayEffect(points, strokeWidth, baseSeed)
          : precalculateChalkEffect(points, strokeWidth, baseSeed);
        brushEffectCache.store(id, newObject.data.brushType, {
          type: newObject.data.brushType,
          points,
          strokeWidth,
          strokeColor,
          opacity,
          effectData
        });
        console.log('🗂️ Cached brush effect on add:', { id: id.slice(0,8), type: newObject.data.brushType, points: points.length, strokeWidth });
      } catch (e) {
        console.warn('⚠️ Failed to precompute brush effect on add:', e);
      }
    }

    get().recordAction(action);
    return id;
  },

  updateObject: (id, updates, userId = 'local') => {
    const state = get();
    const existingObject = state.objects[id];
    if (!existingObject) return;

    console.log('🔄 Store updateObject called:', { 
      id: id.slice(0, 8), 
      updates, 
      objectType: existingObject?.type,
      currentPosition: existingObject ? { x: existingObject.x, y: existingObject.y } : null,
      newDimensions: updates.width || updates.height ? { width: updates.width, height: updates.height } : null,
      timestamp: Date.now()
    });

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

    // If we're in an active batch, add to batch instead of recording immediately
    const currentBatch = get().currentBatch;
    if (currentBatch.id && currentBatch.actions.length >= 0) {
      console.log('🎯 Adding UPDATE_OBJECT to active batch:', action.id, 'batch:', currentBatch.id);
      get().addToBatch(action);
    } else {
      get().recordAction(action);
    }
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
    
    // Don't record action if canvas is already empty AND background is default
    const isObjectsEmpty = Object.keys(state.objects).length === 0;
    const isBgDefault = (state.settings.backgroundColor || '#ffffff') === '#ffffff';
    if (isObjectsEmpty && isBgDefault) {
      console.log('🗑️ Canvas already empty and background default, skipping clear action');
      return;
    }
    
    const previousSettings = { ...state.settings };
    
    const action: WhiteboardAction = {
      type: 'CLEAR_CANVAS',
      payload: {},
      timestamp: Date.now(),
      id: nanoid(),
      userId,
      previousState: {
        objects: state.objects,
        selectedObjectIds: state.selectedObjectIds,
        settings: previousSettings,
      },
    };

    set((s) => ({
      objects: {},
      selectedObjectIds: [],
      settings: { ...s.settings, backgroundColor: '#ffffff' },
    }));
    get().recordAction(action);
  },

  selectObjects: (ids, userId = 'local') => {
    console.log('🎯 SELECT OBJECTS CALLED:', {
      newSelection: ids,
      previousSelection: get().selectedObjectIds,
      userId,
      timestamp: Date.now(),
      stackTrace: new Error().stack?.split('\n').slice(1, 3).join('\n')
    });
    set({ selectedObjectIds: ids });
    // Note: Selection actions are not recorded in undo/redo history
    // They are ephemeral UI state that doesn't need to be undone
  },

  clearSelection: (userId = 'local') => {
    console.log('🚨 CLEAR SELECTION CALLED:', {
      previousSelection: get().selectedObjectIds,
      userId,
      timestamp: Date.now(),
      stackTrace: new Error().stack?.split('\n').slice(1, 5).join('\n')
    });
    set({ selectedObjectIds: [] });
    // Note: Selection actions are not recorded in undo/redo history
    // They are ephemeral UI state that doesn't need to be undone
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

  updateBackgroundSettings: (backgroundType, userId = 'local') => {
    const state = get();
    const newSettings = {
      gridVisible: backgroundType === 'grid',
      linedPaperVisible: backgroundType === 'lines',
      showDots: backgroundType === 'dots',
    };

    const action: WhiteboardAction = {
      type: 'UPDATE_BACKGROUND_SETTINGS',
      payload: { backgroundType },
      timestamp: Date.now(),
      id: nanoid(),
      userId,
      previousState: {
        settings: {
          gridVisible: state.settings.gridVisible,
          linedPaperVisible: state.settings.linedPaperVisible,
          showDots: state.settings.showDots,
        },
      },
    };

    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    }));

    get().recordAction(action);
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
    
    // Brush cache handling: ensure segments have effects and defer removal
    const brushType = (originalObjectMetadata?.brushType || originalObject.data?.brushType) as string | undefined;
    if (brushType && (brushType === 'spray' || brushType === 'chalk')) {
      // Ensure original cache exists
      const existing = brushEffectCache.get(originalObjectId, brushType);
      if (!existing || !existing.effectData) {
        try {
          const points = pathToPointsForBrush(originalObject.data?.path || '');
          const baseSeed = points.length ? Math.floor(points[0].x * 1000 + points[0].y * 1000) : 12345;
          const strokeWidth = originalObject.strokeWidth || 2;
          const strokeColor = originalObject.stroke || '#000000';
          const opacity = originalObject.opacity || 1;
          const effectData = brushType === 'spray'
            ? precalculateSprayEffect(points, strokeWidth, baseSeed)
            : precalculateChalkEffect(points, strokeWidth, baseSeed);
          brushEffectCache.store(originalObjectId, brushType, {
            type: brushType as any,
            points,
            strokeWidth,
            strokeColor,
            opacity,
            effectData
          });
        } catch {}
      }

      // If not pre-transferred, transfer now atomically
      const preTransferred = (action as any).transferredCacheData;
      if (!preTransferred) {
        brushEffectCache.transferToSegmentsAtomic(originalObjectId, brushType, resultingSegments);
      }

      // Defer removal to next frame to avoid transient cache misses
      requestAnimationFrame(() => {
        brushEffectCache.remove(originalObjectId, brushType);
      });
    }
    
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
        objectRelationships: newRelationships,
        selectedObjectIds: state.selectedObjectIds.filter(id => id !== originalObjectId)
      };
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
  getStateSnapshot: () => {
    const state = get()
    
    // Convert Maps to plain objects for serialization
    const userActionHistoriesObj: Record<string, WhiteboardAction[]> = {}
    state.userActionHistories.forEach((value, key) => {
      userActionHistoriesObj[key] = value
    })
    
    const userHistoryIndicesObj: Record<string, number> = {}
    state.userHistoryIndices.forEach((value, key) => {
      userHistoryIndicesObj[key] = value
    })
    
    const objectRelationshipsObj: Record<string, { originalId?: string; segmentIds?: string[] }> = {}
    state.objectRelationships.forEach((value, key) => {
      objectRelationshipsObj[key] = value
    })
    
    return {
      objects: { ...state.objects }, // Create a clean copy
      viewport: { ...state.viewport },
      settings: { ...state.settings },
      actionCount: state.actionHistory.length,
      timestamp: Date.now(),
      // Include undo-redo state for sync
      actionHistory: [...state.actionHistory],
      userActionHistories: userActionHistoriesObj,
      userHistoryIndices: userHistoryIndicesObj,
      currentHistoryIndex: state.currentHistoryIndex,
      objectRelationships: objectRelationshipsObj
    }
  },
  getActionsSince: (timestamp) => {
    return get().actionHistory.filter(action => action.timestamp > timestamp);
  },
  
  applyRemoteAction: (action) => {
    console.log('🔄 Applying remote action:', action.type, action.id);
    
    // Handle SYNC actions specially - they only apply state changes, don't get recorded in history
    if (action.type === 'SYNC_UNDO' || action.type === 'SYNC_REDO') {
      console.log('🔄 Applying SYNC action state change:', action.type);
      if (action.payload.stateChange) {
        set((state) => ({
          ...state,
          ...action.payload.stateChange
        }));
      }
      
      // IMPORTANT: Update the history index for the ORIGINAL user, not the action sender
      const originalUserId = action.payload.originalUserId || action.userId;
      const currentState = get();
      const currentIndex = currentState.userHistoryIndices.get(originalUserId) ?? -1;
      
      if (action.type === 'SYNC_UNDO') {
        console.log('🔄 Updating history index for SYNC_UNDO - user:', originalUserId, 'index:', currentIndex - 1);
        get().updateLocalUserHistoryIndex(originalUserId, currentIndex - 1);
      } else if (action.type === 'SYNC_REDO') {
        console.log('🔄 Updating history index for SYNC_REDO - user:', originalUserId, 'index:', currentIndex + 1);
        get().updateLocalUserHistoryIndex(originalUserId, currentIndex + 1);
      }
      
      // CRITICAL: Don't add SYNC actions to any user's history or global history
      return;
    }
    
    // Execute the action logic based on action type for non-SYNC actions
    switch (action.type) {
      case 'BATCH_UPDATE':
        // Handle batch updates by processing each individual action
        if (action.payload.actions && Array.isArray(action.payload.actions)) {
          // Check for duplicate batch processing
          if (get().processedBatchIds.has(action.id)) {
            console.log('🚫 Skipping duplicate BATCH_UPDATE:', action.id.slice(0, 8));
            return;
          }
          
          // Mark this batch as processed
          set((state) => ({
            processedBatchIds: new Set(state.processedBatchIds).add(action.id)
          }));
          
          console.log('🔄 Processing remote BATCH_UPDATE with', action.payload.actions.length, 'actions, ID:', action.id.slice(0, 8));
          get().batchUpdate(action.payload.actions);
          return; // Don't add the batch action itself to history
        }
        break;
        
      case 'ADD_OBJECT':
        if (action.payload.object) {
          set((state) => ({
            objects: {
              ...state.objects,
              [action.payload.object.id]: action.payload.object,
            },
          }));

          // Precompute cache for remote-added spray/chalk paths
          const obj = action.payload.object as WhiteboardObject;
          if (obj.type === 'path' && obj.data?.brushType && (obj.data.brushType === 'spray' || obj.data.brushType === 'chalk')) {
            try {
              const points = pathToPointsForBrush(obj.data.path);
              const baseSeed = points.length ? Math.floor(points[0].x * 1000 + points[0].y * 1000) : 12345;
              const strokeWidth = obj.strokeWidth || 2;
              const strokeColor = obj.stroke || '#000000';
              const opacity = obj.opacity || 1;
              const effectData = obj.data.brushType === 'spray'
                ? precalculateSprayEffect(points, strokeWidth, baseSeed)
                : precalculateChalkEffect(points, strokeWidth, baseSeed);
              brushEffectCache.store(obj.id, obj.data.brushType, {
                type: obj.data.brushType,
                points,
                strokeWidth,
                strokeColor,
                opacity,
                effectData
              });
              console.log('🗂️ Cached brush effect for remote ADD_OBJECT:', { id: obj.id.slice(0,8), type: obj.data.brushType, points: points.length, strokeWidth });
            } catch (e) {
              console.warn('⚠️ Failed to precompute brush effect for remote add:', e);
            }
          }
        }
        break;
        
      case 'UPDATE_OBJECT':
        if (action.payload.id && action.payload.updates) {
          const objId = action.payload.id;
          const existing = get().objects[objId];
          if (existing) {
            // Soft-lock guard: ignore updates from non-lock owner while lock is active
            if (get().isLockedByOther(objId, action.userId)) {
              console.log('🔒 Skipping remote UPDATE_OBJECT due to active lock by another user:', objId.slice(0,8));
              break;
            }
            // Timestamp guard: drop stale updates
            if (typeof action.timestamp === 'number' && typeof existing.updatedAt === 'number' && action.timestamp < existing.updatedAt) {
              console.log('⏱️ Skipping stale UPDATE_OBJECT (ts', action.timestamp, '< updatedAt', existing.updatedAt, '):', objId.slice(0,8));
              break;
            }
            set((state) => ({
              objects: {
                ...state.objects,
                [objId]: {
                  ...existing,
                  ...action.payload.updates,
                  updatedAt: Date.now(),
                },
              },
            }));
          }
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
        // Skip applying remote selection actions - selections should remain local
        console.log('🔄 Skipping remote SELECT_OBJECTS action - selections are local');
        return;
        
      case 'CLEAR_SELECTION':
        // Skip applying remote clear selection actions - selections should remain local
        console.log('🔄 Skipping remote CLEAR_SELECTION action - selections are local');
        return;
        
      case 'CLEAR_CANVAS':
        set((state) => ({
          objects: {},
          selectedObjectIds: [],
          settings: { ...state.settings, backgroundColor: '#ffffff' },
        }));
        break;
        
      case 'UPDATE_BACKGROUND_SETTINGS':
        if (action.payload.backgroundType) {
          const { backgroundType } = action.payload;
          const newSettings = {
            gridVisible: backgroundType === 'grid',
            linedPaperVisible: backgroundType === 'lines',
            showDots: backgroundType === 'dots',
          };
          set((state) => ({
            settings: { ...state.settings, ...newSettings },
          }));
        }
        break;
      
      case 'UPDATE_SETTINGS':
        if (action.payload) {
          set((state) => ({
            settings: { ...state.settings, ...action.payload },
          }));
        }
        break;
        
      case 'ERASE_PATH':
        if (action.payload.originalObjectId && action.payload.resultingSegments) {
          const { originalObjectId, resultingSegments } = action.payload;
          const originalObject = get().objects[originalObjectId];
          
          if (originalObject) {
            // Extract brush metadata from the action payload if available
            const originalObjectMetadata = (action as any).payload.originalObjectMetadata || {
              brushType: originalObject.data?.brushType,
              stroke: originalObject.stroke,
              strokeWidth: originalObject.strokeWidth,
              opacity: originalObject.opacity,
              fill: originalObject.fill
            };
            
            console.log('🎨 Processing remote ERASE_PATH with brush metadata:', {
              originalId: originalObjectId.slice(0, 8),
              brushType: originalObjectMetadata.brushType,
              segmentCount: resultingSegments.length,
              hasMetadata: !!originalObjectMetadata
            });
            
            set((state) => {
              const newObjects = { ...state.objects };
              const newRelationships = new Map(state.objectRelationships);
              
              // PRESERVE brush effects before removing original object
              const brushType = originalObjectMetadata?.brushType;
              if (brushType && (brushType === 'spray' || brushType === 'chalk')) {
                console.log('🎨 Preserving brush effects for remote eraser action:', {
                  originalId: originalObjectId.slice(0, 8),
                  brushType,
                  segmentCount: resultingSegments.length
                });
                
                // Ensure original cache exists before transfer
                const existing = brushEffectCache.get(originalObjectId, brushType);
                if (!existing || !existing.effectData) {
                  try {
                    const points = pathToPointsForBrush(originalObject.data?.path || '');
                    const baseSeed = points.length ? Math.floor(points[0].x * 1000 + points[0].y * 1000) : 12345;
                    const strokeWidth = originalObject.strokeWidth || 2;
                    const strokeColor = originalObject.stroke || '#000000';
                    const opacity = originalObject.opacity || 1;
                    const effectData = brushType === 'spray'
                      ? precalculateSprayEffect(points, strokeWidth, baseSeed)
                      : precalculateChalkEffect(points, strokeWidth, baseSeed);
                    brushEffectCache.store(originalObjectId, brushType, {
                      type: brushType,
                      points,
                      strokeWidth,
                      strokeColor,
                      opacity,
                      effectData
                    });
                    console.log('🗂️ Cached original brush effect for remote ERASE_PATH:', { id: originalObjectId.slice(0,8), type: brushType, points: points.length, strokeWidth });
                  } catch (e) {
                    console.warn('⚠️ Failed to precompute original brush effect for remote erase:', e);
                  }
                }
                
                // Transfer brush effects to segments BEFORE clearing the original
                brushEffectCache.transferToSegments(originalObjectId, brushType, resultingSegments);
                
                // Now it's safe to remove the original cache entry
                requestAnimationFrame(() => brushEffectCache.remove(originalObjectId, brushType));
              }
              
              // Remove the original object
              delete newObjects[originalObjectId];
              
              // Track relationships
              const segmentIds = resultingSegments.map(s => s.id);
              segmentIds.forEach(segmentId => {
                newRelationships.set(segmentId, { originalId: originalObjectId });
              });
              
              // Add resulting segments as new objects with preserved metadata
              resultingSegments.forEach((segment) => {
                if (segment.points.length >= 2) {
                  const pathString = segment.points.reduce((path, point, index) => {
                    const command = index === 0 ? 'M' : 'L';
                    return `${path} ${command} ${point.x} ${point.y}`;
                  }, '');
                  
                  // Create new object with preserved metadata - use the metadata from the action
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
                      // Only preserve the essential brush metadata from the action
                      brushType: originalObjectMetadata?.brushType || originalObject.data?.brushType,
                      isEraser: false // Ensure segments are not marked as eraser
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
            
            console.log('✅ Remote ERASE_PATH applied with preserved brush effects:', {
              originalId: originalObjectId.slice(0, 8),
              segments: resultingSegments.length,
              brushType: originalObjectMetadata?.brushType,
              preservedEffects: !!(originalObjectMetadata?.brushType && (originalObjectMetadata.brushType === 'spray' || originalObjectMetadata.brushType === 'chalk'))
            });
          }
        }
        break;
        
        
      default:
        console.log('🔄 Unknown action type for remote application:', action.type);
        break;
    }
    
    // Record the action for the remote user's history (but NOT for SYNC actions)
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
    // Apply batch of actions without triggering sync
    console.log('🔄 Applying batch update:', actions.length, 'actions');
    console.log('🔄 Action types in batch:', actions.map(a => a.type).join(', '));
    
    // Apply each action directly without setting lastAction
    actions.forEach(action => {
      switch (action.type) {
        case 'ADD_OBJECT':
          if (action.payload.object) {
            set((state) => ({
              objects: {
                ...state.objects,
                [action.payload.object.id]: action.payload.object,
              },
            }));

            // Precompute cache for batched remote ADD_OBJECT
            const obj = action.payload.object as WhiteboardObject;
            if (obj.type === 'path' && obj.data?.brushType && (obj.data.brushType === 'spray' || obj.data.brushType === 'chalk')) {
              try {
                const points = pathToPointsForBrush(obj.data.path);
                const baseSeed = points.length ? Math.floor(points[0].x * 1000 + points[0].y * 1000) : 12345;
                const strokeWidth = obj.strokeWidth || 2;
                const strokeColor = obj.stroke || '#000000';
                const opacity = obj.opacity || 1;
                const effectData = obj.data.brushType === 'spray'
                  ? precalculateSprayEffect(points, strokeWidth, baseSeed)
                  : precalculateChalkEffect(points, strokeWidth, baseSeed);
                brushEffectCache.store(obj.id, obj.data.brushType, {
                  type: obj.data.brushType,
                  points,
                  strokeWidth,
                  strokeColor,
                  opacity,
                  effectData
                });
                console.log('🗂️ Cached brush effect for batched ADD_OBJECT:', { id: obj.id.slice(0,8), type: obj.data.brushType, points: points.length, strokeWidth });
              } catch (e) {
                console.warn('⚠️ Failed to precompute brush effect for batched add:', e);
              }
            }
          }
          break;
          
        case 'UPDATE_OBJECT':
          if (action.payload.id && action.payload.updates) {
            const objId = action.payload.id;
            const existing = get().objects[objId];
            if (existing) {
              // Soft-lock guard during batch
              if (get().isLockedByOther(objId, action.userId)) {
                console.log('🔒 Skipping batched UPDATE_OBJECT due to active lock by another user:', objId.slice(0,8));
                break;
              }
              // Timestamp guard during batch
              if (typeof action.timestamp === 'number' && typeof existing.updatedAt === 'number' && action.timestamp < existing.updatedAt) {
                console.log('⏱️ Skipping stale batched UPDATE_OBJECT (ts', action.timestamp, '< updatedAt', existing.updatedAt, '):', objId.slice(0,8));
                break;
              }
              set((state) => ({
                objects: {
                  ...state.objects,
                  [objId]: {
                    ...state.objects[objId],
                    ...action.payload.updates,
                  },
                },
              }));
            }
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
          
        case 'CLEAR_CANVAS':
          set((state) => ({
            objects: {},
            selectedObjectIds: [],
            settings: { ...state.settings, backgroundColor: '#ffffff' },
          }));
          break;
          
        case 'ERASE_PATH':
          if (action.payload.originalObjectId && action.payload.resultingSegments) {
            const { originalObjectId, resultingSegments } = action.payload;
            const originalObject = get().objects[originalObjectId];
            
            if (originalObject) {
              // Extract brush metadata from the action payload if available
              const originalObjectMetadata = (action as any).payload.originalObjectMetadata || {
                brushType: originalObject.data?.brushType,
                stroke: originalObject.stroke,
                strokeWidth: originalObject.strokeWidth,
                opacity: originalObject.opacity,
                fill: originalObject.fill
              };
              
              console.log('🎨 Processing batched ERASE_PATH with brush metadata:', {
                originalId: originalObjectId.slice(0, 8),
                brushType: originalObjectMetadata.brushType,
                segmentCount: resultingSegments.length,
                segmentDetails: resultingSegments.map(s => ({ id: s.id.slice(0, 8), pointCount: s.points.length }))
              });
              
              set((state) => {
                const newObjects = { ...state.objects };
                const newRelationships = new Map(state.objectRelationships);
                
                // PRESERVE brush effects before removing original object
                const brushType = originalObjectMetadata?.brushType;
                if (brushType && (brushType === 'spray' || brushType === 'chalk')) {
                  console.log('🎨 Preserving brush effects for batched eraser action:', {
                    originalId: originalObjectId.slice(0, 8),
                    brushType,
                    segmentCount: resultingSegments.length
                  });
                  
                  // Transfer brush effects to segments BEFORE clearing the original
                  brushEffectCache.transferToSegments(originalObjectId, brushType, resultingSegments);
                  
                  // Now it's safe to remove the original cache entry
                  requestAnimationFrame(() => brushEffectCache.remove(originalObjectId, brushType));
                }
                
                // Remove the original object
                delete newObjects[originalObjectId];
                
                // Track relationships
                const segmentIds = resultingSegments.map(s => s.id);
                segmentIds.forEach(segmentId => {
                  newRelationships.set(segmentId, { originalId: originalObjectId });
                });
                
                // Add resulting segments as new objects with preserved metadata
                resultingSegments.forEach((segment) => {
                  if (segment.points.length >= 2) {
                    const pathString = segment.points.reduce((path, point, index) => {
                      const command = index === 0 ? 'M' : 'L';
                      return `${path} ${command} ${point.x} ${point.y}`;
                    }, '');
                    
                    // Create new object with preserved metadata - use the metadata from the action
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
                        // Only preserve the essential brush metadata from the action
                        brushType: originalObjectMetadata?.brushType || originalObject.data?.brushType,
                        isEraser: false // Ensure segments are not marked as eraser
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
          console.warn('Unhandled action type in batchUpdate:', action.type);
      }
    });
    
    // Log final state after batch processing
    const finalState = get();
    console.log('🎨 Batch update complete - final object count:', Object.keys(finalState.objects).length, {
      objectIds: Object.keys(finalState.objects).map(id => id.slice(0, 8)),
      objectTypes: Object.values(finalState.objects).map(obj => obj.type)
    });
    
    // Signal that a batch update occurred to trigger canvas redraw
    set((state) => ({
      ...state,
      lastBatchUpdateTime: Date.now()
    }));
  },
  updateLocalUserHistoryIndex: (userId, index) => {
    set((state) => {
      const newIndices = new Map(state.userHistoryIndices);
      newIndices.set(userId, index);
      return { userHistoryIndices: newIndices };
    });
  },
  applyStateChange: (stateChange) => {
    console.log('🔄 applyStateChange called with:', {
      objectsKeys: stateChange.objects ? Object.keys(stateChange.objects) : 'unchanged',
      selectedObjectIds: stateChange.selectedObjectIds
    });
    
    const prevObjects = get().objects;
    
    set((state) => ({ ...state, ...stateChange }));
    
    const newObjects = get().objects;
    console.log('🔄 State change applied - objects reference changed:', prevObjects !== newObjects);
  },
  
  restoreHistoryState: (historyState: {
    actionHistory: WhiteboardAction[];
    userActionHistories: Record<string, WhiteboardAction[]>;
    userHistoryIndices: Record<string, number>;
    currentHistoryIndex: number;
    objectRelationships: Record<string, { originalId?: string; segmentIds?: string[] }>;
  }) => {
    console.log('🔄 Restoring history state:', {
      actionHistoryLength: historyState.actionHistory.length,
      userCount: Object.keys(historyState.userActionHistories).length,
      currentIndex: historyState.currentHistoryIndex
    });
    
    // Convert plain objects back to Maps
    const userActionHistoriesMap = new Map<string, WhiteboardAction[]>();
    Object.entries(historyState.userActionHistories).forEach(([key, value]) => {
      userActionHistoriesMap.set(key, value);
    });
    
    const userHistoryIndicesMap = new Map<string, number>();
    Object.entries(historyState.userHistoryIndices).forEach(([key, value]) => {
      userHistoryIndicesMap.set(key, value);
    });
    
    const objectRelationshipsMap = new Map<string, { originalId?: string; segmentIds?: string[] }>();
    Object.entries(historyState.objectRelationships).forEach(([key, value]) => {
      objectRelationshipsMap.set(key, value);
    });
    
    set((state) => ({
      ...state,
      actionHistory: historyState.actionHistory,
      userActionHistories: userActionHistoriesMap,
      userHistoryIndices: userHistoryIndicesMap,
      currentHistoryIndex: historyState.currentHistoryIndex,
      objectRelationships: objectRelationshipsMap
    }));
  },
  
  // Conflict detection utilities
  checkObjectExists: (objectId) => {
    return !!get().objects[objectId];
  },
  getObjectRelationship: (objectId) => {
    return get().objectRelationships.get(objectId);
  },
  
  // Soft-lock utilities
  setLock: (objectId, userId, ttlMs) => {
    set((state) => {
      const newLocks = new Map(state.locks);
      newLocks.set(objectId, { userId, expiresAt: Date.now() + Math.max(0, ttlMs) });
      return { ...state, locks: newLocks };
    });
  },
  clearLock: (objectId, userId) => {
    set((state) => {
      const existing = state.locks.get(objectId);
      if (!existing || (userId && existing.userId !== userId)) {
        return state;
      }
      const newLocks = new Map(state.locks);
      newLocks.delete(objectId);
      return { ...state, locks: newLocks };
    });
  },
  isLockedByOther: (objectId, userId) => {
    const lock = get().locks.get(objectId);
    if (!lock) return false;
    if (Date.now() > lock.expiresAt) return false;
    return lock.userId !== userId;
  },
}));

// Helper function to extract object ID from various action types
function getActionObjectId(action: WhiteboardAction): string | null {
  switch (action.type) {
    case 'UPDATE_OBJECT':
    case 'DELETE_OBJECT':
      return action.payload.id;
    case 'ADD_OBJECT':
      return action.payload.object.id;
    case 'ERASE_PATH':
      return action.payload.originalObjectId;
    default:
      return null;
  }
}
