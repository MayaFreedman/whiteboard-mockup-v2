import { useRef, useCallback } from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useToolStore } from '../../stores/toolStore';
import { useUser } from '../../contexts/UserContext';
import { interpolatePoints } from '../../utils/path/pathInterpolation';
import { doesPathIntersectEraserBatch, erasePointsFromPathBatch } from '../../utils/path/pathErasing';
import { pathToPoints } from '../../utils/path/pathConversion';
import { nanoid } from 'nanoid';

/**
 * Hook for handling eraser logic with stroke-based undo/redo
 */
export const useEraserLogic = () => {
  const whiteboardStore = useWhiteboardStore();
  const toolStore = useToolStore();
  const { userId } = useUser();
  
  // For real-time eraser: restored proper batch processing
  const eraserPointsRef = useRef<Array<{ x: number; y: number; radius: number }>>([]);
  const lastEraserProcessRef = useRef<number>(0);
  const ERASER_BATCH_SIZE = 3; // Restored from the increased 5 to ensure frequent processing
  const ERASER_THROTTLE_MS = 16; // Restored from the increased 32ms for better responsiveness

  // Stroke tracking for undo/redo
  const strokeInProgressRef = useRef<boolean>(false);
  const strokeOperationsRef = useRef<Array<{
    originalObjectId: string;
    originalObject: any;
    resultingSegments: Array<{
      points: Array<{ x: number; y: number }>;
      id: string;
    }>;
  }>>([]);

  // Cache for expensive operations
  const shapePathCacheRef = useRef<Map<string, string>>(new Map());

  /**
   * Converts shape objects to path format for erasing (with caching)
   */
  const convertShapeToPath = useCallback((obj: any): string => {
    const cacheKey = `${obj.type}-${obj.width}-${obj.height}`;
    
    if (shapePathCacheRef.current.has(cacheKey)) {
      return shapePathCacheRef.current.get(cacheKey)!;
    }

    let pathString = '';
    switch (obj.type) {
      case 'rectangle':
        pathString = `M 0 0 L ${obj.width} 0 L ${obj.width} ${obj.height} L 0 ${obj.height} Z`;
        break;
      
      case 'circle': {
        const radius = Math.min(obj.width, obj.height) / 2;
        const cx = obj.width / 2;
        const cy = obj.height / 2;
        pathString = `M ${cx - radius} ${cy} A ${radius} ${radius} 0 1 0 ${cx + radius} ${cy} A ${radius} ${radius} 0 1 0 ${cx - radius} ${cy} Z`;
        break;
      }
      
      default:
        pathString = obj.data?.path || '';
    }

    shapePathCacheRef.current.set(cacheKey, pathString);
    return pathString;
  }, []);

  /**
   * Processes accumulated eraser points against all objects during a stroke (restored responsiveness)
   */
  const processEraserBatch = useCallback(() => {
    if (eraserPointsRef.current.length === 0) return;
    
    const objects = Object.entries(whiteboardStore.objects);
    const processedObjects = new Set<string>(); // Prevent duplicate processing
    
    objects.forEach(([id, obj]) => {
      // Skip if already processed in this batch or is eraser object
      if (processedObjects.has(id) || obj.data?.isEraser) return;
      
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
        
        // Simplified bounds check - removed overly restrictive logic
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
          
          // During stroke: apply immediately but track for undo
          if (strokeInProgressRef.current) {
            strokeOperationsRef.current.push({
              originalObjectId: id,
              originalObject: obj,
              resultingSegments: segmentsWithIds
            });
          }
          
          // Apply the erasure immediately (visual update)
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
          processedObjects.add(id);
        }
      }
    });
    
    console.log('🧹 Processed eraser batch:', {
      eraserPoints: eraserPointsRef.current.length,
      strokeInProgress: strokeInProgressRef.current,
      strokeOperations: strokeOperationsRef.current.length,
      processedObjects: processedObjects.size
    });
  }, [whiteboardStore, convertShapeToPath, userId]);

  /**
   * Handles eraser start logic with stroke tracking
   */
  const handleEraserStart = useCallback((coords: { x: number; y: number }, findObjectAt: (x: number, y: number) => string | null, redrawCanvas?: () => void) => {
    const eraserMode = toolStore.toolSettings.eraserMode;
    
    console.log('🎨 Starting eraser stroke:', { mode: eraserMode, coords });
    
    // Initialize stroke tracking for pixel mode
    if (eraserMode === 'pixel') {
      strokeInProgressRef.current = true;
      strokeOperationsRef.current = [];
      // Clear cache at start of new stroke
      shapePathCacheRef.current.clear();
    }
    
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
      const eraserRadius = toolStore.toolSettings.eraserSize / 2;
      
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
   * Handles eraser move logic during stroke (restored responsiveness)
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
      
      // Restored proper interpolation density
      const interpolatedPoints = interpolatePoints(lastPoint, coords, eraserRadius);
      
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
        // Keep only the last point to maintain continuity
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
   * Handles eraser end logic and records stroke-level action
   */
  const handleEraserEnd = useCallback((redrawCanvas?: () => void) => {
    const eraserMode = toolStore.toolSettings.eraserMode;
    
    console.log('🎨 Ending eraser stroke:', { 
      mode: eraserMode, 
      strokeInProgress: strokeInProgressRef.current,
      operationsCount: strokeOperationsRef.current.length 
    });
    
    if (eraserMode === 'pixel') {
      // Process any remaining eraser points
      if (eraserPointsRef.current.length > 0) {
        processEraserBatch();
        eraserPointsRef.current = [];
      }
      
      // End stroke tracking
      if (strokeInProgressRef.current) {
        strokeInProgressRef.current = false;
        
        // TODO: Phase 2 - Record composite stroke action here
        console.log('🎨 Stroke completed with', strokeOperationsRef.current.length, 'operations');
        
        // Clear stroke operations for next stroke
        strokeOperationsRef.current = [];
      }
      
      if (redrawCanvas) {
        redrawCanvas();
      }
    }
  }, [toolStore.toolSettings, processEraserBatch]);

  return {
    handleEraserStart,
    handleEraserMove,
    handleEraserEnd,
    processEraserBatch
  };
};
