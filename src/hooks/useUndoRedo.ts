
import { useCallback } from 'react';
import { useWhiteboardStore } from '../stores/whiteboardStore';
import { WhiteboardAction, WhiteboardObject, WhiteboardState } from '../types/whiteboard';
import { nanoid } from 'nanoid';
import { useMultiplayer } from '../contexts/MultiplayerContext';

interface UndoRedoManager {
  undo: (userId: string) => void;
  redo: (userId: string) => void;
  canUndo: (userId: string) => boolean;
  canRedo: (userId: string) => boolean;
}

/**
 * Hook to manage user-specific undo/redo operations
 * Uses direct state manipulation instead of dispatching actions to prevent loops
 */
export const useUndoRedo = (): UndoRedoManager => {
  const store = useWhiteboardStore();
  const multiplayer = useMultiplayer();

  /**
   * Creates the state change needed to undo an action
   */
  const createUndoStateChange = useCallback((action: WhiteboardAction, currentState: any): Partial<WhiteboardState> | null => {
    console.log('🔄 Creating undo state change for:', action.type, action.id);

    switch (action.type) {
      case 'ADD_OBJECT': {
        // Undo add: remove the object
        const newObjects = { ...currentState.objects };
        delete newObjects[action.payload.object.id];
        
        return {
          objects: newObjects,
          selectedObjectIds: currentState.selectedObjectIds.filter(id => id !== action.payload.object.id)
        };
      }
      
      case 'DELETE_OBJECT': {
        // Undo delete: restore the object
        const deletedObject = action.previousState?.object;
        if (!deletedObject) {
          console.warn('⚠️ Cannot undo DELETE_OBJECT: no previous state');
          return null;
        }
        
        return {
          objects: {
            ...currentState.objects,
            [deletedObject.id]: deletedObject
          }
        };
      }
      
      case 'UPDATE_OBJECT': {
        // Undo update: restore previous object state
        const previousObject = action.previousState?.object;
        if (!previousObject) {
          console.warn('⚠️ Cannot undo UPDATE_OBJECT: no previous state');
          return null;
        }
        
        return {
          objects: {
            ...currentState.objects,
            [previousObject.id]: previousObject
          }
        };
      }
      
      case 'SELECT_OBJECTS': {
        // Undo selection: restore previous selection
        const previousSelection = action.previousState?.selectedObjectIds || [];
        return {
          selectedObjectIds: previousSelection
        };
      }
      
      case 'UPDATE_VIEWPORT': {
        // Undo viewport: restore previous viewport
        const previousViewport = action.previousState?.viewport;
        if (!previousViewport) {
          console.warn('⚠️ Cannot undo UPDATE_VIEWPORT: no previous state');
          return null;
        }
        
        return {
          viewport: previousViewport
        };
      }
      
      case '⚠️UPDATE_SETTINGS': {
        // Undo settings: restore previous settings
        const previousSettings = action.previousState?.settings;
        if (!previousSettings) {
          console.warn('⚠️ Cannot undo UPDATE_SETTINGS: no previous state');
          return null;
        }
        
        return {
          settings: previousSettings
        };
      }
      
      case 'ERASE_PATH': {
        // Undo erase: remove segments and restore original
        const originalObject = action.previousState?.object;
        if (!originalObject) {
          console.warn('⚠️ Cannot undo ERASE_PATH: no previous state');
          return null;
        }
        
        const newObjects = { ...currentState.objects };
        
        // Remove all the segment objects
        action.payload.resultingSegments.forEach(segment => {
          delete newObjects[segment.id];
        });
        
        // Restore the original object
        newObjects[originalObject.id] = originalObject;
        
        return {
          objects: newObjects,
          selectedObjectIds: currentState.selectedObjectIds.filter(id => 
            !action.payload.resultingSegments.some(segment => segment.id === id)
          )
        };
      }
      
      case 'CLEAR_CANVAS': {
        // Undo clear: restore all objects and selection
        const previousObjects = action.previousState?.objects || {};
        const previousSelection = action.previousState?.selectedObjectIds || [];
        
        if (Object.keys(previousObjects).length === 0) {
          console.warn('⚠️ Cannot undo CLEAR_CANVAS: no previous state');
          return null;
        }
        
        return {
          objects: previousObjects,
          selectedObjectIds: previousSelection
        };
      }
      
      default:
        console.warn('⚠️ Cannot create undo state change for action type:', action.type);
        return null;
    }
  }, []);

  /**
   * Creates the state change needed to redo an action
   */
  const createRedoStateChange = useCallback((action: WhiteboardAction, currentState: any): Partial<WhiteboardState> | null => {
    console.log('🔄 Creating redo state change for:', action.type, action.id);

    // For redo, we essentially re-apply the original action's effect
    switch (action.type) {
      case 'ADD_OBJECT': {
        return {
          objects: {
            ...currentState.objects,
            [action.payload.object.id]: action.payload.object
          }
        };
      }
      
      case 'DELETE_OBJECT': {
        const newObjects = { ...currentState.objects };
        delete newObjects[action.payload.id];
        
        return {
          objects: newObjects,
          selectedObjectIds: currentState.selectedObjectIds.filter(objId => objId !== action.payload.id)
        };
      }
      
      case 'UPDATE_OBJECT': {
        const existingObject = currentState.objects[action.payload.id];
        if (!existingObject) return null;
        
        return {
          objects: {
            ...currentState.objects,
            [action.payload.id]: {
              ...existingObject,
              ...action.payload.updates
            }
          }
        };
      }
      
      case 'SELECT_OBJECTS': {
        return {
          selectedObjectIds: action.payload.objectIds
        };
      }
      
      case 'UPDATE_VIEWPORT': {
        return {
          viewport: {
            ...currentState.viewport,
            ...action.payload
          }
        };
      }
      
      case 'UPDATE_SETTINGS': {
        return {
          settings: {
            ...currentState.settings,
            ...action.payload
          }
        };
      }
      
      case 'CLEAR_CANVAS': {
        return {
          objects: {},
          selectedObjectIds: []
        };
      }
      
      case 'ERASE_PATH': {
        const { originalObjectId, resultingSegments } = action.payload;
        const newObjects = { ...currentState.objects };
        
        // Remove the original object
        delete newObjects[originalObjectId];
        
        // Add all resulting segments
        resultingSegments.forEach((segment) => {
          if (segment.points.length >= 2) {
            const originalObject = currentState.objects[originalObjectId];
            if (originalObject) {
              // This would need the path conversion utility
              const newObject: WhiteboardObject = {
                ...originalObject,
                id: segment.id,
                data: {
                  ...originalObject.data,
                  // path: pointsToPath(segment.points) // Would need import
                },
                updatedAt: Date.now()
              };
              newObjects[segment.id] = newObject;
            }
          }
        });
        
        return {
          objects: newObjects,
          selectedObjectIds: currentState.selectedObjectIds.filter(objId => objId !== originalObjectId)
        };
      }
      
      default:
        console.warn('⚠️ Cannot create redo state change for action type:', action.type);
        return null;
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
    
    // Create the undo state change
    const undoStateChange = createUndoStateChange(actionToUndo, state);
    if (!undoStateChange) {
      console.warn('⚠️ Could not create undo state change for:', actionToUndo.type);
      return;
    }
    
    // Update the user's history index locally
    const newIndices = new Map(state.userHistoryIndices);
    newIndices.set(userId, currentIndex - 1);
    
    // Apply the state change directly (local only)
    store.setState((prevState) => ({
      ...prevState,
      ...undoStateChange,
      userHistoryIndices: newIndices,
      stateVersion: prevState.stateVersion + 1,
      lastStateUpdate: Date.now()
    }));
    
    // Send sync action to other clients if multiplayer is connected
    if (multiplayer?.isConnected) {
      const syncAction: WhiteboardAction = {
        type: 'SYNC_UNDO',
        payload: {
          stateChange: undoStateChange,
          originalActionId: actionToUndo.id
        },
        timestamp: Date.now(),
        id: nanoid(),
        userId
      };
      
      console.log('↶ Sending undo sync to other clients');
      multiplayer.sendWhiteboardAction(syncAction);
    }
    
    console.log('↶ Undo completed successfully');
  }, [createUndoStateChange, store, multiplayer]);

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
    
    // Create the redo state change
    const redoStateChange = createRedoStateChange(actionToRedo, state);
    if (!redoStateChange) {
      console.warn('⚠️ Could not create redo state change for:', actionToRedo.type);
      return;
    }
    
    // Update the user's history index locally
    const newIndices = new Map(state.userHistoryIndices);
    newIndices.set(userId, nextIndex);
    
    // Apply the state change directly (local only)
    store.setState((prevState) => ({
      ...prevState,
      ...redoStateChange,
      userHistoryIndices: newIndices,
      stateVersion: prevState.stateVersion + 1,
      lastStateUpdate: Date.now()
    }));
    
    // Send sync action to other clients if multiplayer is connected
    if (multiplayer?.isConnected) {
      const syncAction: WhiteboardAction = {
        type: 'SYNC_REDO',
        payload: {
          stateChange: redoStateChange,
          redoneActionId: actionToRedo.id
        },
        timestamp: Date.now(),
        id: nanoid(),
        userId
      };
      
      console.log('↷ Sending redo sync to other clients');
      multiplayer.sendWhiteboardAction(syncAction);
    }
    
    console.log('↷ Redo completed successfully');
  }, [createRedoStateChange, store, multiplayer]);

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
