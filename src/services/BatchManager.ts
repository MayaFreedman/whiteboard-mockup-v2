
import { nanoid } from 'nanoid';
import { WhiteboardAction } from '../types/whiteboard';
import { actionManager } from './ActionManager';

export interface BatchState {
  id: string | null;
  userId: string | null;
  actionType: string | null;
  objectId: string | null;
  startTime: number | null;
  actions: WhiteboardAction[];
}

export interface BatchConfig {
  maxBatchSize?: number;
  batchTimeout?: number;
  eraserBatchTimeout?: number;
}

/**
 * BatchManager handles the batching of actions for performance optimization
 * and logical grouping for undo/redo operations
 */
export class BatchManager {
  private currentBatch: BatchState;
  private config: BatchConfig;
  private batchTimeout: NodeJS.Timeout | null = null;

  constructor(config: BatchConfig = {}) {
    this.config = {
      maxBatchSize: 50,
      batchTimeout: 1000,
      eraserBatchTimeout: 10000,
      ...config
    };

    this.currentBatch = this.createEmptyBatch();
  }

  private createEmptyBatch(): BatchState {
    return {
      id: null,
      userId: null,
      actionType: null,
      objectId: null,
      startTime: null,
      actions: [],
    };
  }

  /**
   * Starts a new action batch
   */
  startBatch(actionType: string, objectId: string, userId: string = 'local'): string {
    // End any existing batch first
    if (this.currentBatch.id && this.currentBatch.actions.length > 0) {
      this.endBatch();
    }

    const batchId = nanoid();
    this.currentBatch = {
      id: batchId,
      userId,
      actionType,
      objectId,
      startTime: Date.now(),
      actions: [],
    };

    console.log('🎯 Starting action batch:', { batchId, actionType, objectId, userId });

    // Set up auto-timeout
    this.setBatchTimeout(actionType);

    return batchId;
  }

  /**
   * Adds an action to the current batch
   */
  addToBatch(action: WhiteboardAction): boolean {
    if (!this.currentBatch.id) {
      console.warn('⚠️ Attempted to add action to batch but no batch is active');
      return false;
    }

    if (!this.canAddToBatch(action)) {
      console.log('🎯 Cannot add action to current batch, ending batch');
      this.endBatch();
      return false;
    }

    this.currentBatch.actions.push(action);
    
    console.log('🎯 Added action to batch:', { 
      actionType: action.type, 
      batchSize: this.currentBatch.actions.length,
      batchId: this.currentBatch.id
    });

    // Check if batch has reached size limit
    if (this.shouldEndBatchDueToSize()) {
      console.log('🎯 Auto-ending batch due to size limit');
      this.endBatch();
    }

    return true;
  }

  /**
   * Ends the current batch and returns the batch action
   */
  endBatch(): WhiteboardAction | null {
    if (!this.currentBatch.id || this.currentBatch.actions.length === 0) {
      // Clear empty batch
      this.currentBatch = this.createEmptyBatch();
      this.clearBatchTimeout();
      return null;
    }

    console.log('🎯 Ending action batch:', { 
      batchId: this.currentBatch.id, 
      actionCount: this.currentBatch.actions.length,
      actionType: this.currentBatch.actionType,
      objectId: this.currentBatch.objectId
    });

    // Create the batch action
    const batchAction = this.createBatchAction();

    // Clear the current batch
    this.currentBatch = this.createEmptyBatch();
    this.clearBatchTimeout();

    return batchAction;
  }

  /**
   * Checks if an action can be added to the current batch
   */
  canAddToBatch(action: WhiteboardAction): boolean {
    const batch = this.currentBatch;
    
    if (!batch.id || !batch.startTime) {
      return false;
    }

    // Check if batch has timed out
    const timeElapsed = Date.now() - batch.startTime;
    const timeoutLimit = batch.actionType === 'ERASE_PATH' 
      ? this.config.eraserBatchTimeout! 
      : this.config.batchTimeout!;
      
    if (timeElapsed > timeoutLimit) {
      return false;
    }

    // Check if action type matches
    if (action.type !== batch.actionType) {
      return false;
    }

    // Check if user matches
    if (action.userId !== batch.userId) {
      return false;
    }

    // Check object ID (with special handling for eraser)
    const actionObjectId = actionManager.getActionObjectId(action);
    if (batch.actionType === 'ERASE_PATH' && action.type === 'ERASE_PATH') {
      // For eraser, allow batching of multiple objects being erased
      return true;
    } else if (actionObjectId !== batch.objectId) {
      return false;
    }

    return true;
  }

  /**
   * Gets the current batch state
   */
  getCurrentBatch(): BatchState {
    return { ...this.currentBatch };
  }

  /**
   * Checks if there's an active batch
   */
  hasActiveBatch(): boolean {
    return this.currentBatch.id !== null;
  }

  private createBatchAction(): WhiteboardAction {
    return {
      type: 'BATCH_UPDATE',
      payload: { actions: [...this.currentBatch.actions] },
      timestamp: this.currentBatch.startTime!,
      id: this.currentBatch.id!,
      userId: this.currentBatch.userId!,
      previousState: this.currentBatch.actions[0]?.previousState,
    };
  }

  private shouldEndBatchDueToSize(): boolean {
    const isEraserBatch = this.currentBatch.actionType === 'ERASE_PATH';
    const effectiveMaxSize = isEraserBatch 
      ? this.config.maxBatchSize! * 10 
      : this.config.maxBatchSize!;
    
    return this.currentBatch.actions.length >= effectiveMaxSize;
  }

  private setBatchTimeout(actionType: string): void {
    this.clearBatchTimeout();
    
    const timeout = actionType === 'ERASE_PATH' 
      ? this.config.eraserBatchTimeout! 
      : this.config.batchTimeout!;
    
    this.batchTimeout = setTimeout(() => {
      console.log('🎯 Auto-ending batch due to timeout');
      this.endBatch();
    }, timeout);
  }

  private clearBatchTimeout(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
  }
}

// Export singleton instance
export const batchManager = new BatchManager();
