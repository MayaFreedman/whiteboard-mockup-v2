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
 * Hook for handling eraser logic with optimized performance
 */
export const useEraserLogic = () => {
  const whiteboardStore = useWhiteboardStore();
  const toolStore = useToolStore();
  const { userId } = useUser();
  const eraserBatching = useEraserBatching();
  
  // Optimized batch processing - moderate batch sizes
  const eraserPointsRef = useRef<Array<{ x: number; y: number; radius: number }>>([]);
  const lastEraserProcessRef = useRef<number>(0);
  const ERASER_BATCH_SIZE = 25; // Reduced from 40 back to 25
  const ERASER_THROTTLE_MS = 120; // Reduced from 150ms to 120ms

  // Stroke tracking
  const strokeInProgressRef = useRef<boolean>(false);
  const processedObjectsRef = useRef<Set<string>>(new Set());

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
   * Core batch processing with bounding box optimization
   */
  const processEraserBatch = useCallback(() => {
    if (eraserPointsRef.current.length === 0 || !eraserBatching.isStrokeActive()) return;
    
    const objects = Object.entries(whiteboardStore.objects);
    
    // Get eraser bounding box for quick filtering
    const eraserBounds = eraserPointsRef.current.reduce((bounds, point) => ({
      minX: Math.min(bounds.minX, point.x - point.radius),
      maxX: Math.max(bounds.maxX, point.x + point.radius),
      minY: Math.min(bounds.minY, point.y - point.radius),
      maxY: Math.max(bounds.maxY, point.y + point.radius)
    }), {
      minX: Infinity,
      maxX: -Infinity,
      minY: Infinity,
      maxY: -Infinity
    });
    
    objects.forEach(([id, obj]) => {
      // Skip eraser objects and already processed objects
      if (obj.data?.isEraser || processedObjectsRef.current.has(id)) return;
      
      // Quick bounding box check
      const objMaxX = obj.x + (obj.width || 0);
      const objMaxY = obj.y + (obj.height || 0);
      
      if (objMaxX < eraserBounds.minX || obj.x > eraserBounds.maxX ||
          objMaxY < eraserBounds.minY || obj.y > eraserBounds.maxY) {
        return;
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
          
          // Mark object as processed
          processedObjectsRef.current.add(id);
          
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
        }
      }
    });
  }, [whiteboardStore, convertShapeToPath, userId, eraserBatching]);

  const handleEraserStart = useCallback((coords: { x: number; y: number }, findObjectAt: (x: number, y: number) => string | null, redrawCanvas?: () => void) => {
    const eraserMode = toolStore.toolSettings.eraserMode;
    
    if (eraserMode === 'object') {
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
          break;
        }
      }
      
      if (objectId) {
        whiteboardStore.deleteObject(objectId, userId);
        if (redrawCanvas) {
          redrawCanvas();
        }
      }
    } else {
      // Start pixel eraser stroke
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
    }
  }, [toolStore.toolSettings, whiteboardStore, userId, eraserBatching]);

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
          if (redrawCanvas) {
            redrawCanvas();
          }
          break;
        }
      }
    } else {
      const eraserRadius = toolStore.toolSettings.eraserSize / 2;
      
      // Add interpolated points
      const interpolatedPoints = interpolatePoints(lastPoint, coords, eraserRadius);
      
      interpolatedPoints.slice(1).forEach((point) => {
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
        
        // Keep last few points for continuity
        const lastFewPoints = eraserPointsRef.current.slice(-5);
        eraserPointsRef.current = lastFewPoints;
        lastEraserProcessRef.current = now;
        
        if (redrawCanvas) {
          redrawCanvas();
        }
      }
    }
  }, [toolStore.toolSettings, whiteboardStore, processEraserBatch, userId]);

  const handleEraserEnd = useCallback((redrawCanvas?: () => void) => {
    const eraserMode = toolStore.toolSettings.eraserMode;
    
    if (eraserMode === 'pixel') {
      // Process any remaining points
      if (eraserPointsRef.current.length > 0) {
        processEraserBatch();
        eraserPointsRef.current = [];
      }
      
      // End the stroke batch
      if (strokeInProgressRef.current && eraserBatching.isStrokeActive()) {
        eraserBatching.endEraserStroke();
      }
      
      // Final redraw
      if (redrawCanvas) {
        redrawCanvas();
      }
      
      // Clean up
      strokeInProgressRef.current = false;
      processedObjectsRef.current.clear();
    }
  }, [toolStore.toolSettings, processEraserBatch, eraserBatching]);

  return {
    handleEraserStart,
    handleEraserMove,
    handleEraserEnd,
    processEraserBatch
  };
};
