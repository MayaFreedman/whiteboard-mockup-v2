import { useRef, useCallback } from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useToolStore } from '../../stores/toolStore';
import { interpolatePoints } from '../../utils/path/pathInterpolation';
import { doesPathIntersectEraserBatch, erasePointsFromPathBatch } from '../../utils/path/pathErasing';
import { pathToPoints } from '../../utils/path/pathConversion';
import { nanoid } from 'nanoid';

/**
 * Hook for handling eraser logic and batch processing with improved reliability
 */
export const useEraserLogic = () => {
  const whiteboardStore = useWhiteboardStore();
  const toolStore = useToolStore();
  
  // For real-time eraser: batch processing with line segment intersection
  const eraserPointsRef = useRef<Array<{ x: number; y: number; radius: number }>>([]);
  const lastEraserProcessRef = useRef<number>(0);
  const ERASER_BATCH_SIZE = 3;
  const ERASER_THROTTLE_MS = 16;

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
   * Processes accumulated eraser points against all objects
   */
  const processEraserBatch = useCallback(() => {
    if (eraserPointsRef.current.length === 0) return;
    
    const objects = Object.entries(whiteboardStore.objects);
    const eraserActions: Array<{
      originalObjectId: string;
      eraserPath: {
        x: number;
        y: number;
        size: number;
        path: string;
      };
      resultingSegments: Array<{
        points: Array<{ x: number; y: number }>;
        id: string;
      }>;
    }> = [];
    
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
          
          const eraserPath = eraserPointsRef.current.reduce((path, eraser, index) => {
            const command = index === 0 ? 'M' : 'L';
            return `${path} ${command} ${eraser.x} ${eraser.y}`;
          }, '');
          
          eraserActions.push({
            originalObjectId: id,
            eraserPath: {
              x: eraserPointsRef.current[0]?.x || 0,
              y: eraserPointsRef.current[0]?.y || 0,
              size: eraserPointsRef.current[0]?.radius * 2 || 20,
              path: eraserPath
            },
            resultingSegments: segmentsWithIds
          });
        }
      }
    });
    
    // Apply all eraser actions atomically with preserved brush metadata
    eraserActions.forEach(action => {
      const originalObject = whiteboardStore.objects[action.originalObjectId];
      
      // Create enhanced action that preserves brush metadata
      const enhancedAction = {
        ...action,
        originalObjectMetadata: {
          brushType: originalObject.data?.brushType,
          stroke: originalObject.stroke,
          strokeWidth: originalObject.strokeWidth,
          opacity: originalObject.opacity,
          fill: originalObject.fill
        }
      };
      
      whiteboardStore.erasePath(enhancedAction);
    });
    
    console.log('🧹 Processed eraser batch:', {
      eraserPoints: eraserPointsRef.current.length,
      eraserActions: eraserActions.length
    });
  }, [whiteboardStore, convertShapeToPath]);

  /**
   * Handles eraser start logic with improved object detection
   */
  const handleEraserStart = useCallback((coords: { x: number; y: number }, findObjectAt: (x: number, y: number) => string | null, redrawCanvas?: () => void) => {
    const eraserMode = toolStore.toolSettings.eraserMode;
    
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
        whiteboardStore.deleteObject(objectId);
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
  }, [toolStore.toolSettings, whiteboardStore, processEraserBatch]);

  /**
   * Handles eraser move logic with improved object detection for object mode
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
          whiteboardStore.deleteObject(objectId);
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
        const lastPoint = eraserPointsRef.current[eraserPointsRef.current.length - 1];
        eraserPointsRef.current = lastPoint ? [lastPoint] : [];
        lastEraserProcessRef.current = now;
        
        if (redrawCanvas) {
          redrawCanvas();
        }
      }
    }
  }, [toolStore.toolSettings, whiteboardStore, processEraserBatch]);

  /**
   * Handles eraser end logic
   */
  const handleEraserEnd = useCallback((redrawCanvas?: () => void) => {
    const eraserMode = toolStore.toolSettings.eraserMode;
    
    if (eraserMode === 'pixel') {
      if (eraserPointsRef.current.length > 0) {
        processEraserBatch();
        eraserPointsRef.current = [];
        
        if (redrawCanvas) {
          redrawCanvas();
        }
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
