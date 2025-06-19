
import { useRef, useCallback } from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useToolStore } from '../../stores/toolStore';
import { useUser } from '../../contexts/UserContext';
import { interpolatePoints } from '../../utils/path/pathInterpolation';
import { doesPathIntersectEraserBatch, erasePointsFromPathBatch } from '../../utils/path/pathErasing';
import { pathToPoints } from '../../utils/path/pathConversion';
import { nanoid } from 'nanoid';
import { StrokeAccumulator } from '../../utils/strokeAccumulator';

/**
 * Hook for handling eraser logic with stroke-based undo/redo
 */
export const useEraserLogic = () => {
  const whiteboardStore = useWhiteboardStore();
  const toolStore = useToolStore();
  const { userId } = useUser();
  
  // For real-time eraser: batch processing with line segment intersection
  const eraserPointsRef = useRef<Array<{ x: number; y: number; radius: number }>>([]);
  const lastEraserProcessRef = useRef<number>(0);
  const ERASER_BATCH_SIZE = 3;
  const ERASER_THROTTLE_MS = 16;

  // Stroke accumulator for undo/redo
  const strokeAccumulatorRef = useRef<StrokeAccumulator>(new StrokeAccumulator());

  /**
   * Converts shape objects to path format for erasing
   */
  const convertShapeToPath = useCallback((obj: any): string => {
    switch (obj.type) {
      case 'rectangle':
        return `M 0 0 L ${obj.width} 0 L ${obj.width} ${obj.height} L 0 ${obj.height} Z`;
      
      case 'circle': {
        const radius = Math.min(obj.width, obj.height) / 2;
        const cx = obj.width / 2;
        const cy = obj.height / 2;
        return `M ${cx - radius} ${cy} A ${radius} ${radius} 0 1 0 ${cx + radius} ${cy} A ${radius} ${radius} 0 1 0 ${cx - radius} ${cy} Z`;
      }
      
      default:
        return obj.data?.path || '';
    }
  }, []);

  /**
   * Processes accumulated eraser points against all objects (immediate visual feedback)
   */
  const processEraserBatch = useCallback(() => {
    if (eraserPointsRef.current.length === 0) return;
    
    const objects = Object.entries(whiteboardStore.objects);
    const strokeAccumulator = strokeAccumulatorRef.current;
    
    objects.forEach(([id, obj]) => {
      // Skip eraser objects
      if (obj.data?.isEraser) return;
      
      let pathString = '';
      let shouldProcess = false;
      
      if (obj.type === 'path' && obj.data?.path) {
        pathString = obj.data.path;
        shouldProcess = true;
      } else if (obj.type === 'rectangle' || obj.type === 'circle') {
        pathString = convertShapeToPath(obj);
        shouldProcess = true;
      }
      
      if (shouldProcess && pathString) {
        const strokeWidth = obj.strokeWidth || 2;
        
        const intersects = doesPathIntersectEraserBatch(
          pathString,
          obj.x,
          obj.y,
          eraserPointsRef.current,
          strokeWidth
        );
        
        if (intersects) {
          const points = pathToPoints(pathString);
          
          const relativeEraserPoints = eraserPointsRef.current.map(eraser => ({
            x: eraser.x - obj.x,
            y: eraser.y - obj.y,
            radius: eraser.radius
          }));
          
          const segments = erasePointsFromPathBatch(points, relativeEraserPoints, strokeWidth);
          
          const segmentsWithIds = segments.map(segment => ({
            ...segment,
            id: nanoid()
          }));
          
          // Apply visual changes immediately (without recording undo action yet)
          whiteboardStore.applyEraserOperationImmediately({
            originalObjectId: id,
            originalObject: obj,
            resultingSegments: segmentsWithIds
          });
          
          // Add to stroke accumulator for later undo recording
          if (strokeAccumulator.isStrokeActive()) {
            strokeAccumulator.addOperation({
              originalObjectId: id,
              originalObject: obj,
              resultingSegments: segmentsWithIds
            });
          }
        }
      }
    });
    
    console.log('🧹 Processed eraser batch for immediate visual feedback:', {
      eraserPoints: eraserPointsRef.current.length,
      strokeActive: strokeAccumulator.isStrokeActive()
    });
  }, [whiteboardStore, convertShapeToPath]);

  /**
   * Handles eraser start logic
   */
  const handleEraserStart = useCallback((coords: { x: number; y: number }, findObjectAt: (x: number, y: number) => string | null, redrawCanvas?: () => void) => {
    const eraserMode = toolStore.toolSettings.eraserMode;
    
    if (eraserMode === 'object') {
      // Object eraser mode - same as before
      console.log('🎯 Object eraser starting at:', coords);
      
      const searchRadius = 8;
      const testPositions = [
        coords,
        { x: coords.x - searchRadius, y: coords.y },
        { x: coords.x + searchRadius, y: coords.y },
        { x: coords.x, y: coords.y - searchRadius },
        { x: coords.x, y: coords.y + searchRadius },
        { x: coords.x - searchRadius/2, y: coords.y - searchRadius/2 },
        { x: coords.x + searchRadius/2, y: coords.y - searchRadius/2 },
        { x: coords.x - searchRadius/2, y: coords.y + searchRadius/2 },
        { x: coords.x + searchRadius/2, y: coords.y + searchRadius/2 }
      ];
      
      let objectId: string | null = null;
      
      for (const testPos of testPositions) {
        objectId = findObjectAt(testPos.x, testPos.y);
        if (objectId) {
          console.log('🎯 Found object at test position:', { 
            testPos, 
            originalPos: coords, 
            objectId: objectId.slice(0, 8) 
          });
          break;
        }
      }
      
      if (objectId) {
        whiteboardStore.deleteObject(objectId, userId);
        console.log('🗑️ Object eraser successfully deleted:', objectId.slice(0, 8));
        
        if (redrawCanvas) {
          redrawCanvas();
        }
      } else {
        console.log('❌ Object eraser found no objects to delete at:', coords);
      }
    } else {
      // Pixel eraser mode - start stroke accumulation
      const eraserRadius = toolStore.toolSettings.eraserSize / 2;
      
      // Start stroke accumulation
      strokeAccumulatorRef.current.startStroke({
        x: coords.x,
        y: coords.y,
        radius: eraserRadius
      });
      
      eraserPointsRef.current = [{
        x: coords.x,
        y: coords.y,
        radius: eraserRadius
      }];
      lastEraserProcessRef.current = Date.now();
      
      processEraserBatch();
    }
  }, [toolStore.toolSettings, whiteboardStore, processEraserBatch, userId]);

  /**
   * Handles eraser move logic
   */
  const handleEraserMove = useCallback((coords: { x: number; y: number }, lastPoint: { x: number; y: number }, findObjectAt: (x: number, y: number) => string | null, redrawCanvas?: () => void) => {
    const eraserMode = toolStore.toolSettings.eraserMode;
    
    if (eraserMode === 'object') {
      // Object eraser mode - same as before
      const searchRadius = 6;
      const testPositions = [
        coords,
        { x: coords.x - searchRadius, y: coords.y },
        { x: coords.x + searchRadius, y: coords.y },
        { x: coords.x, y: coords.y - searchRadius },
        { x: coords.x, y: coords.y + searchRadius }
      ];
      
      for (const testPos of testPositions) {
        const objectId = findObjectAt(testPos.x, testPos.y);
        if (objectId) {
          whiteboardStore.deleteObject(objectId, userId);
          console.log('🗑️ Object eraser deleted during drag:', objectId.slice(0, 8));
          
          if (redrawCanvas) {
            redrawCanvas();
          }
          break;
        }
      }
    } else {
      // Pixel eraser mode - continue stroke
      const eraserRadius = toolStore.toolSettings.eraserSize / 2;
      
      const interpolatedPoints = interpolatePoints(lastPoint, coords, eraserRadius / 2);
      
      // Add points to stroke accumulator
      const strokeAccumulator = strokeAccumulatorRef.current;
      interpolatedPoints.slice(1).forEach(point => {
        eraserPointsRef.current.push({
          x: point.x,
          y: point.y,
          radius: eraserRadius
        });
        
        if (strokeAccumulator.isStrokeActive()) {
          strokeAccumulator.addPoint({
            x: point.x,
            y: point.y,
            radius: eraserRadius
          });
        }
      });
      
      const now = Date.now();
      const shouldProcess = 
        eraserPointsRef.current.length >= ERASER_BATCH_SIZE ||
        now - lastEraserProcessRef.current >= ERASER_THROTTLE_MS;
      
      if (shouldProcess) {
        processEraserBatch();
        const lastPoint = eraserPointsRef.current[eraserPointsRef.current.length - 1];
        eraserPointsRef.current = lastPoint ? [lastPoint] : [];
        lastEraserProcessRef.current = now;
        
        if (redrawCanvas) {
          redrawCanvas();
        }
      }
    }
  }, [toolStore.toolSettings, whiteboardStore, processEraserBatch, userId]);

  /**
   * Handles eraser end logic - creates single undo action for entire stroke
   */
  const handleEraserEnd = useCallback((redrawCanvas?: () => void) => {
    const eraserMode = toolStore.toolSettings.eraserMode;
    
    if (eraserMode === 'pixel') {
      // Process any remaining points
      if (eraserPointsRef.current.length > 0) {
        processEraserBatch();
        eraserPointsRef.current = [];
      }
      
      // Complete the stroke and create single undo action
      const strokeAccumulator = strokeAccumulatorRef.current;
      const completedStroke = strokeAccumulator.completeStroke();
      
      if (completedStroke && completedStroke.operations.length > 0) {
        // Create single ERASE_STROKE action for the entire stroke
        whiteboardStore.recordEraserStroke({
          affectedObjects: completedStroke.operations,
          eraserStroke: {
            points: completedStroke.strokePoints,
            startTime: Date.now() - completedStroke.duration,
            endTime: Date.now()
          }
        }, userId);
        
        console.log('✅ Recorded eraser stroke action:', {
          strokeId: completedStroke.strokeId,
          affectedObjects: completedStroke.operations.length,
          duration: completedStroke.duration
        });
      }
      
      if (redrawCanvas) {
        redrawCanvas();
      }
    }
  }, [toolStore.toolSettings, processEraserBatch, whiteboardStore, userId]);

  return {
    handleEraserStart,
    handleEraserMove,
    handleEraserEnd,
    processEraserBatch
  };
};
