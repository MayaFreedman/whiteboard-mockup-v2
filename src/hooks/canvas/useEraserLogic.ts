import { useRef, useCallback } from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useToolStore } from '../../stores/toolStore';
import { interpolatePoints } from '../../utils/path/pathInterpolation';
import { doesPathIntersectEraserBatch, erasePointsFromPathBatch } from '../../utils/path/pathErasing';
import { pathToPoints } from '../../utils/path/pathConversion';

/**
 * Hook for handling eraser logic and batch processing with improved reliability
 */
export const useEraserLogic = () => {
  const whiteboardStore = useWhiteboardStore();
  const toolStore = useToolStore();
  
  // For real-time eraser: batch processing with line segment intersection
  const eraserPointsRef = useRef<Array<{ x: number; y: number; radius: number }>>([]);
  const lastEraserProcessRef = useRef<number>(0);
  const ERASER_BATCH_SIZE = 3; // Process every N points
  const ERASER_THROTTLE_MS = 16; // ~60fps max

  /**
   * Processes accumulated eraser points against all objects using stroke-width-aware line segment intersection
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
      if (obj.type === 'path' && obj.data?.path && !obj.data?.isEraser) {
        // Get the stroke width for this object
        const strokeWidth = obj.strokeWidth || 2;
        
        // Check if this path intersects with any eraser points (stroke-width-aware)
        const intersects = doesPathIntersectEraserBatch(
          obj.data.path,
          obj.x,
          obj.y,
          eraserPointsRef.current,
          strokeWidth
        );
        
        if (intersects) {
          // Convert path to points and erase intersecting areas
          const points = pathToPoints(obj.data.path);
          
          // Convert eraser coordinates to path-relative coordinates
          const relativeEraserPoints = eraserPointsRef.current.map(eraser => ({
            x: eraser.x - obj.x,
            y: eraser.y - obj.y,
            radius: eraser.radius
          }));
          
          // Get remaining segments after erasing with stroke-width-aware detection
          const segments = erasePointsFromPathBatch(points, relativeEraserPoints, strokeWidth);
          
          // Create eraser path representation
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
            resultingSegments: segments
          });
        }
      }
    });
    
    // Apply all eraser actions atomically
    eraserActions.forEach(action => {
      whiteboardStore.erasePath(action);
    });
    
    console.log('🧹 Processed stroke-aware eraser batch:', {
      eraserPoints: eraserPointsRef.current.length,
      eraserActions: eraserActions.length
    });
  }, [whiteboardStore]);

  /**
   * Handles eraser start logic with improved object detection
   */
  const handleEraserStart = useCallback((coords: { x: number; y: number }, findObjectAt: (x: number, y: number) => string | null, redrawCanvas?: () => void) => {
    const eraserMode = toolStore.toolSettings.eraserMode;
    
    if (eraserMode === 'object') {
      console.log('🎯 Object eraser starting at:', coords);
      
      // Try multiple detection attempts with slight position variations for better reliability
      const searchRadius = 8;
      const testPositions = [
        coords, // Original position
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
      
      // Try each test position until we find an object
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
        
        // Trigger canvas redraw
        if (redrawCanvas) {
          redrawCanvas();
        }
      } else {
        console.log('❌ Object eraser found no objects to delete at:', coords);
        
        // Log nearby objects for debugging
        const nearbyObjects = Object.entries(whiteboardStore.objects)
          .map(([id, obj]) => ({
            id: id.slice(0, 8),
            type: obj.type,
            distance: Math.sqrt((coords.x - obj.x) ** 2 + (coords.y - obj.y) ** 2),
            position: { x: obj.x, y: obj.y }
          }))
          .filter(obj => obj.distance < 50)
          .sort((a, b) => a.distance - b.distance);
        
        console.log('🔍 Nearby objects within 50px:', nearbyObjects);
      }
    } else {
      // Pixel eraser - use the size as diameter, not radius
      const eraserRadius = toolStore.toolSettings.eraserSize / 2;
      
      // Initialize eraser batch processing
      eraserPointsRef.current = [{
        x: coords.x,
        y: coords.y,
        radius: eraserRadius
      }];
      lastEraserProcessRef.current = Date.now();
      
      // Process initial eraser point immediately
      processEraserBatch();
    }
  }, [toolStore.toolSettings, whiteboardStore, processEraserBatch]);

  /**
   * Handles eraser move logic with improved object detection for object mode
   */
  const handleEraserMove = useCallback((coords: { x: number; y: number }, lastPoint: { x: number; y: number }, findObjectAt: (x: number, y: number) => string | null, redrawCanvas?: () => void) => {
    const eraserMode = toolStore.toolSettings.eraserMode;
    
    if (eraserMode === 'object') {
      // Object eraser - find and delete objects during drag with improved detection
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
          
          // Trigger canvas redraw
          if (redrawCanvas) {
            redrawCanvas();
          }
          break; // Only delete one object per move event
        }
      }
    } else {
      // Pixel eraser - use the size as diameter, not radius
      const eraserRadius = toolStore.toolSettings.eraserSize / 2;
      
      // Add interpolated points for continuous coverage
      const interpolatedPoints = interpolatePoints(lastPoint, coords, eraserRadius / 2);
      
      // Add each interpolated point to the batch
      interpolatedPoints.slice(1).forEach(point => {
        eraserPointsRef.current.push({
          x: point.x,
          y: point.y,
          radius: eraserRadius
        });
      });
      
      // Process eraser batch if we have enough points or enough time has passed
      const now = Date.now();
      const shouldProcess = 
        eraserPointsRef.current.length >= ERASER_BATCH_SIZE ||
        now - lastEraserProcessRef.current >= ERASER_THROTTLE_MS;
      
      if (shouldProcess) {
        processEraserBatch();
        // Don't clear all points - keep the last one for continuity
        const lastPoint = eraserPointsRef.current[eraserPointsRef.current.length - 1];
        eraserPointsRef.current = lastPoint ? [lastPoint] : [];
        lastEraserProcessRef.current = now;
        
        // Trigger canvas redraw
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
      // Process any remaining eraser points for pixel eraser
      if (eraserPointsRef.current.length > 0) {
        processEraserBatch();
        eraserPointsRef.current = [];
        
        // Trigger final redraw
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
