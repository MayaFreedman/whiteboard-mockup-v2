
import { useCallback } from 'react';
import { useWhiteboardStore } from '../stores/whiteboardStore';
import { WhiteboardAction, WhiteboardObject } from '../types/whiteboard';
import { nanoid } from 'nanoid';

interface UndoRedoManager {
  undo: (userId: string) => void;
  redo: (userId: string) => void;
  canUndo: (userId: string) => boolean;
  canRedo: (userId: string) => boolean;
}

/**
 * Hook to manage user-specific undo/redo operations
 * This creates inverse actions and dispatches them as regular actions for multiplayer sync
 */
export const useUndoRedo = (): UndoRedoManager => {
  const store = useWhiteboardStore();

  /**
   * Creates an inverse action that will undo the original action
   * Uses previousState when available for accurate restoration
   */
  const createInverseAction = useCallback((action: WhiteboardAction, currentState: any): WhiteboardAction | null => {
    console.log('🔄 Creating inverse action for:', action.type, action.id);

    switch (action.type) {
      case 'ADD_OBJECT': {
        return {
          type: 'DELETE_OBJECT',
          payload: { id: action.payload.object.id },
          previousState: { object: action.payload.object },
          timestamp: Date.now(),
          id: nanoid(),
          userId: action.userId
        };
      }
      
      case 'DELETE_OBJECT': {
        const deletedObject = action.previousState?.object || currentState.objects[action.payload.id];
        if (!deletedObject) {
          console.warn('⚠️ Cannot create inverse for DELETE_OBJECT: no previous state');
          return null;
        }
        
        return {
          type: 'ADD_OBJECT',
          payload: { object: deletedObject },
          timestamp: Date.now(),
          id: nanoid(),
          userId: action.userId
        };
      }
      
      case 'UPDATE_OBJECT': {
        const previousObject = action.previousState?.object;
        if (!previousObject) {
          console.warn('⚠️ Cannot create inverse for UPDATE_OBJECT: no previous state');
          return null;
        }
        
        return {
          type: 'UPDATE_OBJECT',
          payload: { 
            id: action.payload.id, 
            updates: previousObject 
          },
          previousState: { object: currentState.objects[action.payload.id] },
          timestamp: Date.now(),
          id: nanoid(),
          userId: action.userId
        };
      }
      
      case 'SELECT_OBJECTS': {
        const previousSelection = action.previousState?.selectedObjectIds || [];
        return {
          type: 'SELECT_OBJECTS',
          payload: { objectIds: previousSelection },
          previousState: { selectedObjectIds: action.payload.objectIds },
          timestamp: Date.now(),
          id: nanoid(),
          userId: action.userId
        };
      }
      
      case 'UPDATE_VIEWPORT': {
        const previousViewport = action.previousState?.viewport;
        if (!previousViewport) {
          console.warn('⚠️ Cannot create inverse for UPDATE_VIEWPORT: no previous state');
          return null;
        }
        
        return {
          type: 'UPDATE_VIEWPORT',
          payload: previousViewport,
          previousState: { viewport: currentState.viewport },
          timestamp: Date.now(),
          id: nanoid(),
          userId: action.userId
        };
      }
      
      case 'UPDATE_SETTINGS': {
        const previousSettings = action.previousState?.settings;
        if (!previousSettings) {
          console.warn('⚠️ Cannot create inverse for UPDATE_SETTINGS: no previous state');
          return null;
        }
        
        return {
          type: 'UPDATE_SETTINGS',
          payload: previousSettings,
          previousState: { settings: currentState.settings },
          timestamp: Date.now(),
          id: nanoid(),
          userId: action.userId
        };
      }
      
      case 'ERASE_PATH': {
        const originalObject = action.previousState?.object;
        if (!originalObject) {
          console.warn('⚠️ Cannot create inverse for ERASE_PATH: no previous state');
          return null;
        }
        
        // First delete all the segment objects, then restore the original
        const deleteActions: WhiteboardAction[] = action.payload.resultingSegments.map(segment => ({
          type: 'DELETE_OBJECT',
          payload: { id: segment.id },
          timestamp: Date.now(),
          id: nanoid(),
          userId: action.userId
        }));
        
        // Then add back the original object
        const restoreAction: WhiteboardAction = {
          type: 'ADD_OBJECT',
          payload: { object: originalObject },
          timestamp: Date.now(),
          id: nanoid(),
          userId: action.userId
        };
        
        // Return a batch update to handle multiple operations atomically
        return {
          type: 'BATCH_UPDATE',
          payload: { actions: [...deleteActions, restoreAction] },
          timestamp: Date.now(),
          id: nanoid(),
          userId: action.userId
        };
      }
      
      case 'CLEAR_CANVAS': {
        const previousObjects = action.previousState?.objects || {};
        const previousSelection = action.previousState?.selectedObjectIds || [];
        
        if (Object.keys(previousObjects).length === 0) {
          console.warn('⚠️ Cannot create inverse for CLEAR_CANVAS: no previous state');
          return null;
        }
        
        const restoreActions: WhiteboardAction[] = Object.values(previousObjects).map(obj => ({
          type: 'ADD_OBJECT',
          payload: { object: obj as WhiteboardObject },
          timestamp: Date.now(),
          id: nanoid(),
          userId: action.userId
        }));
        
        const restoreSelectionAction: WhiteboardAction = {
          type: 'SELECT_OBJECTS',
          payload: { objectIds: previousSelection },
          timestamp: Date.now(),
          id: nanoid(),
          userId: action.userId
        };
        
        return {
          type: 'BATCH_UPDATE',
          payload: { actions: [...restoreActions, restoreSelectionAction] },
          timestamp: Date.now(),
          id: nanoid(),
          userId: action.userId
        };
      }
      
      default:
        console.warn('⚠️ Cannot create inverse for action type:', action.type);
        return null;
    }
  }, []);

  /**
   * Checks if an action conflicts with current state (object was modified by another user)
   */
  const hasConflict = useCallback((action: WhiteboardAction, currentState: any): boolean => {
    switch (action.type) {
      case 'UPDATE_OBJECT':
      case 'DELETE_OBJECT': {
        const objectId = action.payload.id;
        const currentObject = currentState.objects[objectId];
        
        if (!currentObject && action.type === 'UPDATE_OBJECT') {
          console.log('🔍 Conflict: Object no longer exists:', objectId);
          return true;
        }
        
        if (currentObject && currentObject.updatedAt > action.timestamp) {
          console.log('🔍 Conflict: Object was modified after this action:', objectId);
          return true;
        }
        
        return false;
      }
      
      default:
        return false;
    }
  }, []);

  const undo = useCallback((userId: string) => {
    const state = store.getState();
    const userHistory = state.userActionHistories.get(userId) || [];
    const currentIndex = state.userHistoryIndices.get(userId) ?? -1;
    
    console.log('↶ Undo requested for user:', userId, 'currentIndex:', currentIndex, 'historyLength:', userHistory.length);
    
    if (currentIndex < 0 || currentIndex >= userHistory.length) {
      console.log('↶ Cannot undo: invalid index');
      return;
    }

    const actionToUndo = userHistory[currentIndex];
    console.log('↶ Undoing action:', actionToUndo.type, actionToUndo.id);
    
    // Check for conflicts before undoing
    if (hasConflict(actionToUndo, state)) {
      console.warn('⚠️ Conflict detected, cannot undo action:', actionToUndo.id);
      // Could show user notification here
      return;
    }
    
    // Create and dispatch the inverse action
    const inverseAction = createInverseAction(actionToUndo, state);
    if (inverseAction) {
      console.log('↶ Dispatching inverse action:', inverseAction.type);
      
      // Update the user's history index locally first
      const newIndices = new Map(state.userHistoryIndices);
      newIndices.set(userId, currentIndex - 1);
      
      // Update the store state directly for the index change (this won't be synced)
      store.setState((prevState) => ({
        ...prevState,
        userHistoryIndices: newIndices
      }));
      
      // Dispatch the inverse action (this will be synced to other clients)
      store.dispatch(inverseAction);
    } else {
      console.warn('⚠️ Could not create inverse action for:', actionToUndo.type);
    }
  }, [createInverseAction, hasConflict, store]);

  const redo = useCallback((userId: string) => {
    const state = store.getState();
    const userHistory = state.userActionHistories.get(userId) || [];
    const currentIndex = state.userHistoryIndices.get(userId) ?? -1;
    const nextIndex = currentIndex + 1;
    
    console.log('↷ Redo requested for user:', userId, 'currentIndex:', currentIndex, 'nextIndex:', nextIndex, 'historyLength:', userHistory.length);
    
    if (nextIndex >= userHistory.length) {
      console.log('↷ Cannot redo: no more actions');
      return;
    }

    const actionToRedo = userHistory[nextIndex];
    console.log('↷ Redoing action:', actionToRedo.type, actionToRedo.id);
    
    // Check for conflicts before redoing
    if (hasConflict(actionToRedo, state)) {
      console.warn('⚠️ Conflict detected, cannot redo action:', actionToRedo.id);
      return;
    }
    
    // Update the user's history index locally first
    const newIndices = new Map(state.userHistoryIndices);
    newIndices.set(userId, nextIndex);
    
    // Update the store state directly for the index change (this won't be synced)
    store.setState((prevState) => ({
      ...prevState,
      userHistoryIndices: newIndices
    }));
    
    // Dispatch the original action again (this will be synced to other clients)
    // Create a new action with the same payload but new ID and timestamp
    const redoAction: WhiteboardAction = {
      ...actionToRedo,
      id: nanoid(),
      timestamp: Date.now()
    };
    
    console.log('↷ Dispatching redo action:', redoAction.type, redoAction.id);
    store.dispatch(redoAction);
  }, [hasConflict, store]);

  const canUndo = useCallback((userId: string) => {
    const state = store.getState();
    const currentIndex = state.userHistoryIndices.get(userId) ?? -1;
    return currentIndex >= 0;
  }, [store]);

  const canRedo = useCallback((userId: string) => {
    const state = store.getState();
    const userHistory = state.userActionHistories.get(userId) || [];
    const currentIndex = state.userHistoryIndices.get(userId) ?? -1;
    return currentIndex < userHistory.length - 1;
  }, [store]);

  return {
    undo,
    redo,
    canUndo,
    canRedo
  };
};
