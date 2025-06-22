import { useRef, useCallback } from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useToolStore } from '../../stores/toolStore';
import { useUser } from '../../contexts/UserContext';
import { interpolatePoints } from '../../utils/path/pathInterpolation';
import { doesPathIntersectEraserBatch, erasePointsFromPathBatch } from '../../utils/path/pathErasing';
import { pathToPoints } from '../../utils/path/pathConversion';
import { nanoid } from 'nanoid';
import { useEraserBatching } from './useEraserBatching';

/**
 * Hook for handling eraser logic with optimized action batching
 */
export const useEraserLogic = () => {
  const whiteboardStore = useWhiteboardStore();
  const toolStore = useToolStore();
  const { userId } = useUser();
  const eraserBatching = useEraserBatching();
  
  // For real-time eraser: optimized batch processing
  const eraserPointsRef = useRef<Array<{ x: number; y: number; radius: number }>>([]);
  const lastEraserProcessRef = useRef<number>(0);
  const ERASER_BATCH_SIZE = 30; // Increased from 20 to 30
  const ERASER_THROTTLE_MS = 120; // Increased from 100ms to 120ms

  // Stroke tracking
  const strokeInProgressRef = useRef<boolean>(false);
  const processedObjectsRef = useRef<Set<string>>(new Set());

  /**
   * Checks if an object is potentially within eraser range using bounding box
   */
  const isObjectNearEraser = useCallback((obj: any, eraserPoints: Array<{ x: number; y: number; radius: number }>): boolean => {
    if (!obj || eraserPoints.length === 0) return false;
    
    // Get the maximum eraser radius for this batch
    const maxEraserRadius = Math.max(...eraserPoints.map(p => p.radius));
    
    // Get object bounds
    const objLeft = obj.x || 0;
    const objTop = obj.y || 0;
    const objRight = objLeft + (obj.width || 0);
    const objBottom = objTop + (obj.height || 0);
    
    // Check if any eraser point is near the object's bounding box
    for (const eraserPoint of eraserPoints) {
      const eraserLeft = eraserPoint.x - maxEraserRadius;
      const eraserRight = eraserPoint.x + maxEraserRadius;
      const eraserTop = eraserPoint.y - maxEraserRadius;
      const eraserBottom = eraserPoint.y + maxEraserRadius;
      
      // Check for bounding box intersection with generous margin
      const intersects = !(eraserRight < objLeft || 
                          eraserLeft > objRight || 
                          eraserBottom < objTop || 
                          eraserTop > objBottom);
      
      if (intersects) {
        return true;
      }
    }
    
    return false;
  }, []);

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
   * Processes accumulated eraser points with optimized batching
   */
  const processEraserBatch = useCallback(() => {
    if (eraserPointsRef.current.length === 0 || !eraserBatching.isStrokeActive()) return;
    
    const objects = Object.entries(whiteboardStore.objects);
    
    objects.forEach(([id, obj]) => {
      // Skip eraser objects and already processed objects in this stroke
      if (obj.data?.isEraser || processedObjectsRef.current.has(id)) return;
      
      // OPTIMIZATION: Bounding box pre-filter to skip distant objects
      if (!isObjectNearEraser(obj, eraserPointsRef.current)) {
        return; // Skip this object entirely - it's too far away
      }
      
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
          
          // Mark object as processed in this stroke
          processedObjectsRef.current.add(id);
          
          // Apply the erasure - this will be batched automatically
          const enhancedAction = {
            originalObjectId: id,
            eraserPath: {
              x: eraserPointsRef.current[0]?.x || 0,
              y: eraserPointsRef.current[0]?.y || 0,
              size: eraserPointsRef.current[0]?.radius * 2 || 20,
              path: eraserPointsRef.current.reduce((path, eraser, index) => {
                const command = index === 0 ? 'M' : 'L';
                return `${path} ${command} ${eraser.x} ${eraser.y}`;
              }, '')
            },
            resultingSegments: segmentsWithIds,
            originalObjectMetadata: {
              brushType: obj.data?.brushType,
              stroke: obj.stroke,
              strokeWidth: obj.strokeWidth,
              opacity: obj.opacity,
              fill: obj.fill
            }
          };
          
          whiteboardStore.erasePath(enhancedAction, userId);
          
          console.log('🧹 Processed eraser action for object:', {
            objectId: id.slice(0, 8),
            segments: segmentsWithIds.length,
            strokeId: eraserBatching.getCurrentStrokeId()?.slice(0, 8),
            userId: userId.slice(0, 8)
          });
        }
      }
    });
  }, [whiteboardStore, convertShapeToPath, userId, eraserBatching, isObjectNearEraser]);

  /**
   * Handles eraser start logic with optimized batching
   */
  const handleEraserStart = useCallback((coords: { x: number; y: number }, findObjectAt: (x: number, y: number) => string | null, redrawCanvas?: () => void) => {
    const eraserMode = toolStore.toolSettings.eraserMode;
    
    console.log('🎨 Starting eraser stroke:', { mode: eraserMode, coords });
    
    if (eraserMode === 'object') {
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
      // Start the eraser stroke batch
      eraserBatching.startEraserStroke(userId);
      strokeInProgressRef.current = true;
      processedObjectsRef.current.clear();
      
      const eraserRadius = toolStore.toolSettings.eraserSize / 2;
      
      eraserPointsRef.current = [{
        x: coords.x,
        y: coords.y,
        radius: eraserRadius
      }];
      lastEraserProcessRef.current = Date.now();
      
      console.log('🧹 Started pixel eraser stroke:', {
        strokeId: eraserBatching.getCurrentStrokeId()?.slice(0, 8),
        coords,
        userId: userId.slice(0, 8)
      });
    }
  }, [toolStore.toolSettings, whiteboardStore, userId, eraserBatching]);

  /**
   * Handles eraser move logic during stroke
   */
  const handleEraserMove = useCallback((coords: { x: number; y: number }, lastPoint: { x: number; y: number }, findObjectAt: (x: number, y: number) => string | null, redrawCanvas?: () => void) => {
    const eraserMode = toolStore.toolSettings.eraserMode;
    
    if (eraserMode === 'object') {
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
      const eraserRadius = toolStore.toolSettings.eraserSize / 2;
      
      const interpolatedPoints = interpolatePoints(lastPoint, coords, eraserRadius / 2);
      
      interpolatedPoints.slice(1).forEach(point => {
        eraserPointsRef.current.push({
          x: point.x,
          y: point.y,
          radius: eraserRadius
        });
      });
      
      const now = Date.now();
      const shouldProcess = 
        eraserPointsRef.current.length >= ERASER_BATCH_SIZE ||
        now - lastEraserProcessRef.current >= ERASER_THROTTLE_MS;
      
      if (shouldProcess) {
        processEraserBatch();
        
        // Keep some points for continuity but reduce the batch
        const lastFewPoints = eraserPointsRef.current.slice(-3);
        eraserPointsRef.current = lastFewPoints;
        lastEraserProcessRef.current = now;
        
        if (redrawCanvas) {
          redrawCanvas();
        }
      }
    }
  }, [toolStore.toolSettings, whiteboardStore, processEraserBatch, userId]);

  /**
   * Handles eraser end logic and ends the stroke batch
   */
  const handleEraserEnd = useCallback((redrawCanvas?: () => void) => {
    const eraserMode = toolStore.toolSettings.eraserMode;
    
    console.log('🎨 Ending eraser stroke:', { 
      mode: eraserMode, 
      strokeInProgress: strokeInProgressRef.current,
      remainingPoints: eraserPointsRef.current.length,
      strokeId: eraserBatching.getCurrentStrokeId()?.slice(0, 8)
    });
    
    if (eraserMode === 'pixel') {
      // Process any remaining eraser points
      if (eraserPointsRef.current.length > 0) {
        processEraserBatch();
        eraserPointsRef.current = [];
      }
      
      // End the eraser stroke batch - this groups ALL erase operations into one undo entry
      if (strokeInProgressRef.current && eraserBatching.isStrokeActive()) {
        eraserBatching.endEraserStroke();
      }
      
      // Clean up stroke tracking
      strokeInProgressRef.current = false;
      processedObjectsRef.current.clear();
      
      if (redrawCanvas) {
        redrawCanvas();
      }
    }
  }, [toolStore.toolSettings, processEraserBatch, eraserBatching]);

  return {
    handleEraserStart,
    handleEraserMove,
    handleEraserEnd,
    processEraserBatch
  };
};
