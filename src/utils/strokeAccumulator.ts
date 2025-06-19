
import { nanoid } from 'nanoid';

export interface EraserStrokePoint {
  x: number;
  y: number;
  radius: number;
  timestamp: number;
}

export interface EraserOperation {
  originalObjectId: string;
  originalObject: any;
  resultingSegments: Array<{
    points: Array<{ x: number; y: number }>;
    id: string;
  }>;
}

export class StrokeAccumulator {
  private strokePoints: EraserStrokePoint[] = [];
  private operations: EraserOperation[] = [];
  private strokeId: string = '';
  private startTime: number = 0;
  private isActive: boolean = false;

  /**
   * Start a new eraser stroke
   */
  startStroke(initialPoint: { x: number; y: number; radius: number }): void {
    this.strokeId = nanoid();
    this.startTime = Date.now();
    this.isActive = true;
    this.strokePoints = [{
      ...initialPoint,
      timestamp: this.startTime
    }];
    this.operations = [];
    
    console.log('🎨 Started new eraser stroke:', this.strokeId);
  }

  /**
   * Add a point to the current stroke
   */
  addPoint(point: { x: number; y: number; radius: number }): void {
    if (!this.isActive) return;
    
    this.strokePoints.push({
      ...point,
      timestamp: Date.now()
    });
  }

  /**
   * Add an eraser operation to the current stroke
   */
  addOperation(operation: EraserOperation): void {
    if (!this.isActive) return;
    
    this.operations.push(operation);
    console.log('🧹 Added eraser operation to stroke:', {
      strokeId: this.strokeId,
      objectId: operation.originalObjectId.slice(0, 8),
      segments: operation.resultingSegments.length
    });
  }

  /**
   * Complete the current stroke and return the accumulated data
   */
  completeStroke(): {
    strokeId: string;
    strokePoints: EraserStrokePoint[];
    operations: EraserOperation[];
    duration: number;
  } | null {
    if (!this.isActive || this.operations.length === 0) {
      console.log('⚠️ Cannot complete stroke: not active or no operations');
      this.reset();
      return null;
    }

    const endTime = Date.now();
    const result = {
      strokeId: this.strokeId,
      strokePoints: [...this.strokePoints],
      operations: [...this.operations],
      duration: endTime - this.startTime
    };

    console.log('✅ Completed eraser stroke:', {
      strokeId: this.strokeId,
      points: this.strokePoints.length,
      operations: this.operations.length,
      duration: result.duration
    });

    this.reset();
    return result;
  }

  /**
   * Cancel the current stroke without recording
   */
  cancelStroke(): void {
    console.log('❌ Cancelled eraser stroke:', this.strokeId);
    this.reset();
  }

  /**
   * Check if a stroke is currently active
   */
  isStrokeActive(): boolean {
    return this.isActive;
  }

  /**
   * Get current stroke info for debugging
   */
  getCurrentStrokeInfo(): {
    strokeId: string;
    pointCount: number;
    operationCount: number;
    isActive: boolean;
  } {
    return {
      strokeId: this.strokeId,
      pointCount: this.strokePoints.length,
      operationCount: this.operations.length,
      isActive: this.isActive
    };
  }

  /**
   * Reset the accumulator
   */
  private reset(): void {
    this.strokePoints = [];
    this.operations = [];
    this.strokeId = '';
    this.startTime = 0;
    this.isActive = false;
  }
}
