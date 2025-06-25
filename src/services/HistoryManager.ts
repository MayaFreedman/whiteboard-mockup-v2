
import { WhiteboardAction } from '../types/whiteboard';

/**
 * HistoryManager handles user-specific action histories and undo/redo functionality
 */
export class HistoryManager {
  private userActionHistories: Map<string, WhiteboardAction[]> = new Map();
  private userHistoryIndices: Map<string, number> = new Map();
  private globalActionHistory: WhiteboardAction[] = [];
  private currentGlobalIndex: number = -1;

  /**
   * Adds an action to the specified user's history
   */
  addToUserHistory(action: WhiteboardAction, userId: string): void {
    const userHistory = this.userActionHistories.get(userId) || [];
    const currentIndex = this.userHistoryIndices.get(userId) ?? -1;
    
    // Truncate future actions if we're not at the end of history
    const newUserHistory = [...userHistory.slice(0, currentIndex + 1), action];
    
    this.userActionHistories.set(userId, newUserHistory);
    this.userHistoryIndices.set(userId, newUserHistory.length - 1);
    
    console.log('📚 Added to user history:', { 
      userId, 
      actionType: action.type, 
      historyLength: newUserHistory.length 
    });
  }

  /**
   * Adds an action to the global history
   */
  addToGlobalHistory(action: WhiteboardAction): void {
    this.globalActionHistory.push(action);
    this.currentGlobalIndex = this.globalActionHistory.length - 1;
  }

  /**
   * Updates a user's current history index (for undo/redo operations)
   */
  updateUserHistoryIndex(userId: string, index: number): void {
    const userHistory = this.userActionHistories.get(userId) || [];
    const clampedIndex = Math.max(-1, Math.min(index, userHistory.length - 1));
    
    this.userHistoryIndices.set(userId, clampedIndex);
    
    console.log('📍 Updated user history index:', { 
      userId, 
      index: clampedIndex, 
      maxIndex: userHistory.length - 1 
    });
  }

  /**
   * Gets the current action index for a user
   */
  getUserHistoryIndex(userId: string): number {
    return this.userHistoryIndices.get(userId) ?? -1;
  }

  /**
   * Gets the full history for a user
   */
  getUserHistory(userId: string): WhiteboardAction[] {
    return this.userActionHistories.get(userId) || [];
  }

  /**
   * Checks if a user can undo
   */
  canUndo(userId: string): boolean {
    const currentIndex = this.getUserHistoryIndex(userId);
    const userHistory = this.getUserHistory(userId);
    
    if (currentIndex < 0 || currentIndex >= userHistory.length) {
      return false;
    }
    
    // Additional validation: ensure the action at current index is not a sync action
    const actionAtIndex = userHistory[currentIndex];
    if (actionAtIndex && (actionAtIndex.type === 'SYNC_UNDO' || actionAtIndex.type === 'SYNC_REDO')) {
      console.error('❌ CRITICAL: SYNC action found in user history at current index:', {
        actionType: actionAtIndex.type,
        userId,
        currentIndex
      });
      return false;
    }
    
    return true;
  }

  /**
   * Checks if a user can redo
   */
  canRedo(userId: string): boolean {
    const userHistory = this.getUserHistory(userId);
    const currentIndex = this.getUserHistoryIndex(userId);
    const nextIndex = currentIndex + 1;
    
    if (nextIndex >= userHistory.length) {
      return false;
    }
    
    // Additional validation: ensure the action at next index is not a sync action
    const actionAtNextIndex = userHistory[nextIndex];
    if (actionAtNextIndex && (actionAtNextIndex.type === 'SYNC_UNDO' || actionAtNextIndex.type === 'SYNC_REDO')) {
      console.error('❌ CRITICAL: SYNC action found in user history at next index:', {
        actionType: actionAtNextIndex.type,
        userId,
        nextIndex
      });
      return false;
    }
    
    return true;
  }

  /**
   * Gets the action to undo for a user
   */
  getUndoAction(userId: string): WhiteboardAction | null {
    if (!this.canUndo(userId)) {
      return null;
    }
    
    const userHistory = this.getUserHistory(userId);
    const currentIndex = this.getUserHistoryIndex(userId);
    
    return userHistory[currentIndex];
  }

  /**
   * Gets the action to redo for a user
   */
  getRedoAction(userId: string): WhiteboardAction | null {
    if (!this.canRedo(userId)) {
      return null;
    }
    
    const userHistory = this.getUserHistory(userId);
    const currentIndex = this.getUserHistoryIndex(userId);
    const nextIndex = currentIndex + 1;
    
    return userHistory[nextIndex];
  }

  /**
   * Gets all actions after a specific timestamp
   */
  getActionsSince(timestamp: number): WhiteboardAction[] {
    return this.globalActionHistory.filter(action => action.timestamp > timestamp);
  }

  /**
   * Gets a snapshot of the current history state
   */
  getHistorySnapshot() {
    return {
      userActionHistories: new Map(this.userActionHistories),
      userHistoryIndices: new Map(this.userHistoryIndices),
      globalActionHistory: [...this.globalActionHistory],
      currentGlobalIndex: this.currentGlobalIndex
    };
  }

  /**
   * Clears history for a specific user
   */
  clearUserHistory(userId: string): void {
    this.userActionHistories.delete(userId);
    this.userHistoryIndices.delete(userId);
  }

  /**
   * Clears all history
   */
  clearAllHistory(): void {
    this.userActionHistories.clear();
    this.userHistoryIndices.clear();
    this.globalActionHistory = [];
    this.currentGlobalIndex = -1;
  }
}

// Export singleton instance
export const historyManager = new HistoryManager();
