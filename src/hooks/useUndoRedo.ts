
import { useCallback } from 'react';
import { useWhiteboardStore } from '../stores/whiteboardStore';
import { useUser } from '../contexts/UserContext';
import { historyManager } from '../services/HistoryManager';
import { actionManager } from '../services/ActionManager';

export const useUndoRedo = () => {
  const store = useWhiteboardStore();
  const { userId } = useUser();

  const canUndo = useCallback((targetUserId?: string) => {
    const userIdToCheck = targetUserId || userId;
    return historyManager.canUndo(userIdToCheck);
  }, [userId]);

  const canRedo = useCallback((targetUserId?: string) => {
    const userIdToCheck = targetUserId || userId;
    return historyManager.canRedo(userIdToCheck);
  }, [userId]);

  const undo = useCallback(async (targetUserId?: string) => {
    const userIdToCheck = targetUserId || userId;
    
    if (!historyManager.canUndo(userIdToCheck)) {
      console.log('❌ Cannot undo - no actions available');
      return false;
    }

    const actionToUndo = historyManager.getUndoAction(userIdToCheck);
    if (!actionToUndo) {
      console.log('❌ No action to undo');
      return false;
    }

    console.log('⏪ Undoing action:', { 
      type: actionToUndo.type, 
      id: actionToUndo.id,
      userId: userIdToCheck 
    });

    try {
      // Apply the reverse of the action
      await reverseAction(actionToUndo);
      
      // Update the user's history index
      const currentIndex = historyManager.getUserHistoryIndex(userIdToCheck);
      historyManager.updateUserHistoryIndex(userIdToCheck, currentIndex - 1);
      
      console.log('✅ Undo completed successfully');
      return true;
    } catch (error) {
      console.error('❌ Undo failed:', error);
      return false;
    }
  }, [userId, store]);

  const redo = useCallback(async (targetUserId?: string) => {
    const userIdToCheck = targetUserId || userId;
    
    if (!historyManager.canRedo(userIdToCheck)) {
      console.log('❌ Cannot redo - no actions available');
      return false;
    }

    const actionToRedo = historyManager.getRedoAction(userIdToCheck);
    if (!actionToRedo) {
      console.log('❌ No action to redo');
      return false;
    }

    console.log('⏩ Redoing action:', { 
      type: actionToRedo.type, 
      id: actionToRedo.id,
      userId: userIdToCheck 
    });

    try {
      // Re-apply the action
      await applyAction(actionToRedo);
      
      // Update the user's history index
      const currentIndex = historyManager.getUserHistoryIndex(userIdToCheck);
      historyManager.updateUserHistoryIndex(userIdToCheck, currentIndex + 1);
      
      console.log('✅ Redo completed successfully');
      return true;
    } catch (error) {
      console.error('❌ Redo failed:', error);
      return false;
    }
  }, [userId, store]);

  const reverseAction = async (action: any) => {
    const { type, payload, previousState } = action;

    switch (type) {
      case 'ADD_OBJECT':
        if (payload.object?.id) {
          store.deleteObject(payload.object.id, userId);
        }
        break;

      case 'UPDATE_OBJECT':
        if (payload.id && previousState?.object) {
          store.updateObject(payload.id, previousState.object, userId);
        }
        break;

      case 'DELETE_OBJECT':
        if (previousState?.object) {
          const { id, createdAt, updatedAt, ...objectData } = previousState.object;
          store.addObject(objectData, userId);
        }
        break;

      case 'SELECT_OBJECTS':
        if (previousState?.selectedObjectIds) {
          store.selectObjects(previousState.selectedObjectIds, userId);
        } else {
          store.clearSelection(userId);
        }
        break;

      case 'CLEAR_SELECTION':
        if (previousState?.selectedObjectIds) {
          store.selectObjects(previousState.selectedObjectIds, userId);
        }
        break;

      case 'CLEAR_CANVAS':
        if (previousState?.objects) {
          // Restore all objects
          Object.values(previousState.objects).forEach((obj: any) => {
            const { id, createdAt, updatedAt, ...objectData } = obj;
            store.addObject(objectData, userId);
          });
          
          // Restore selection
          if (previousState.selectedObjectIds) {
            store.selectObjects(previousState.selectedObjectIds, userId);
          }
        }
        break;

      case 'ERASE_PATH':
        // Restore the original object and remove segments
        if (previousState?.object && payload.resultingSegments) {
          // Remove all segment objects
          payload.resultingSegments.forEach((segment: any) => {
            if (store.checkObjectExists(segment.id)) {
              store.deleteObject(segment.id, userId);
            }
          });

          // Restore the original object
          const { id, createdAt, updatedAt, ...objectData } = previousState.object;
          store.addObject(objectData, userId);
        }
        break;

      case 'BATCH_UPDATE':
        // Reverse all actions in the batch in reverse order
        if (payload.actions) {
          for (let i = payload.actions.length - 1; i >= 0; i--) {
            await reverseAction(payload.actions[i]);
          }
        }
        break;

      default:
        console.warn('⚠️ Unknown action type for undo:', type);
        break;
    }
  };

  const applyAction = async (action: any) => {
    const { type, payload } = action;

    switch (type) {
      case 'ADD_OBJECT':
        if (payload.object) {
          const { id, createdAt, updatedAt, ...objectData } = payload.object;
          store.addObject(objectData, userId);
        }
        break;

      case 'UPDATE_OBJECT':
        if (payload.id && payload.updates) {
          store.updateObject(payload.id, payload.updates, userId);
        }
        break;

      case 'DELETE_OBJECT':
        if (payload.id) {
          store.deleteObject(payload.id, userId);
        }
        break;

      case 'SELECT_OBJECTS':
        if (payload.objectIds) {
          store.selectObjects(payload.objectIds, userId);
        }
        break;

      case 'CLEAR_SELECTION':
        store.clearSelection(userId);
        break;

      case 'CLEAR_CANVAS':
        store.clearCanvas(userId);
        break;

      case 'ERASE_PATH':
        if (payload.originalObjectId && payload.resultingSegments) {
          store.erasePath({
            originalObjectId: payload.originalObjectId,
            eraserPath: payload.eraserPath,
            resultingSegments: payload.resultingSegments,
            originalObjectMetadata: payload.originalObjectMetadata
          }, userId);
        }
        break;

      case 'BATCH_UPDATE':
        // Apply all actions in the batch in order
        if (payload.actions) {
          for (const batchedAction of payload.actions) {
            await applyAction(batchedAction);
          }
        }
        break;

      default:
        console.warn('⚠️ Unknown action type for redo:', type);
        break;
    }
  };

  return {
    canUndo,
    canRedo,
    undo,
    redo,
  };
};
