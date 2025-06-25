
import { nanoid } from 'nanoid';
import { WhiteboardAction } from '../types/whiteboard';

export interface ActionManagerConfig {
  enableValidation?: boolean;
  enableLogging?: boolean;
}

/**
 * ActionManager handles the lifecycle of whiteboard actions including
 * creation, validation, and coordination with other services
 */
export class ActionManager {
  private config: ActionManagerConfig;

  constructor(config: ActionManagerConfig = {}) {
    this.config = { 
      enableValidation: true, 
      enableLogging: true, 
      ...config 
    };
  }

  /**
   * Creates a properly formatted whiteboard action with metadata
   */
  createAction<T extends WhiteboardAction>(
    type: T['type'],
    payload: T['payload'],
    userId: string = 'local',
    previousState?: any
  ): T {
    const action = {
      type,
      payload,
      timestamp: Date.now(),
      id: nanoid(),
      userId,
      ...(previousState && { previousState })
    } as T;

    if (this.config.enableValidation) {
      this.validateAction(action);
    }

    if (this.config.enableLogging) {
      console.log('📝 Created action:', { type, id: action.id, userId });
    }

    return action;
  }

  /**
   * Validates an action before processing
   */
  validateAction(action: WhiteboardAction): boolean {
    // Basic validation checks
    if (!action.id || !action.type || !action.timestamp || !action.userId) {
      console.error('❌ Invalid action: missing required fields', action);
      return false;
    }

    // Type-specific validation
    switch (action.type) {
      case 'ADD_OBJECT':
        if (!action.payload.object || !action.payload.object.id) {
          console.error('❌ ADD_OBJECT action missing object or object.id');
          return false;
        }
        break;
      
      case 'UPDATE_OBJECT':
        if (!action.payload.id || !action.payload.updates) {
          console.error('❌ UPDATE_OBJECT action missing id or updates');
          return false;
        }
        break;
      
      case 'DELETE_OBJECT':
        if (!action.payload.id) {
          console.error('❌ DELETE_OBJECT action missing id');
          return false;
        }
        break;
    }

    return true;
  }

  /**
   * Determines if an action should be recorded in history
   */
  shouldRecordAction(action: WhiteboardAction): boolean {
    // Don't record SYNC actions in history
    if (action.type === 'SYNC_UNDO' || action.type === 'SYNC_REDO') {
      return false;
    }

    return true;
  }

  /**
   * Determines if an action should be synchronized in multiplayer
   */
  shouldSyncAction(action: WhiteboardAction): boolean {
    const localOnlyActions = ['SELECT_OBJECTS', 'CLEAR_SELECTION'];
    return !localOnlyActions.includes(action.type);
  }

  /**
   * Extracts the primary object ID from an action for batching purposes
   */
  getActionObjectId(action: WhiteboardAction): string | null {
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
}

// Export singleton instance
export const actionManager = new ActionManager();
