import { useRef, useCallback, useState } from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useToolStore } from '../../stores/toolStore';
import { useCanvasCoordinates } from './useCanvasCoordinates';
import { useObjectDetection } from './useObjectDetection';
import { useEraserLogic } from './useEraserLogic';
import { nanoid } from 'nanoid';

interface DrawingState {
  isDrawing: boolean;
  currentPath: string;
  lastPoint: { x: number; y: number } | null;
  startPoint: { x: number; y: number } | null;
}

interface ShapeState {
  isDrawingShape: boolean;
  startPoint: { x: number; y: number } | null;
  currentShape: {
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
}

/**
 * Hook for handling canvas interactions including drawing, selection, and panning
 * FIXED: Now accepts userId parameter to properly track user actions
 */
export const useCanvasInteractions = (userId: string) => {
  const whiteboardStore = useWhiteboardStore();
  const toolStore = useToolStore();
  const { getCanvasCoordinates } = useCanvasCoordinates();
  const { findObjectAt } = useObjectDetection();
  const eraserLogic = useEraserLogic();

  // State management
  const [drawingState, setDrawingState] = useState<DrawingState>({
    isDrawing: false,
    currentPath: '',
    lastPoint: null,
    startPoint: null,
  });

  const [shapeState, setShapeState] = useState<ShapeState>({
    isDrawingShape: false,
    startPoint: null,
    currentShape: null,
  });

  const [isDragging, setIsDragging] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<{ x: number; y: number } | null>(null);
  const [selectedObjectStartPositions, setSelectedObjectStartPositions] = useState<Map<string, {x: number, y: number}>>(new Map());

  const redrawCanvasRef = useRef<(() => void) | null>(null);

  console.log('🎨 Canvas interactions initialized for userId:', userId.slice(0, 8));

  const setRedrawCanvas = useCallback((redrawFn: () => void) => {
    redrawCanvasRef.current = redrawFn;
  }, []);

  const redrawCanvas = useCallback(() => {
    if (redrawCanvasRef.current) {
      redrawCanvasRef.current();
    }
  }, []);

  const getCurrentDrawingPreview = useCallback(() => {
    if (!drawingState.isDrawing || !drawingState.currentPath) return null;
    
    return {
      type: 'path' as const,
      x: drawingState.startPoint?.x || 0,
      y: drawingState.startPoint?.y || 0,
      stroke: toolStore.toolSettings.strokeColor,
      strokeWidth: toolStore.toolSettings.strokeWidth,
      opacity: toolStore.toolSettings.opacity,
      data: {
        path: drawingState.currentPath,
        brushType: toolStore.activeTool,
      },
    };
  }, [drawingState, toolStore.toolSettings, toolStore.activeTool]);

  const getCurrentShapePreview = useCallback(() => {
    return shapeState.currentShape;
  }, [shapeState.currentShape]);

  // Handle pointer down events
  const handlePointerDown = useCallback((event: PointerEvent | TouchEvent | MouseEvent, canvas: HTMLCanvasElement) => {
    const coords = getCanvasCoordinates(event, canvas);
    if (!coords) return;

    const { activeTool, toolSettings } = toolStore;

    console.log('🎯 Pointer down:', { tool: activeTool, coords, userId: userId.slice(0, 8) });

    switch (activeTool) {
      case 'select': {
        const objectId = findObjectAt(coords.x, coords.y);
        if (objectId) {
          if (!whiteboardStore.selectedObjectIds.includes(objectId)) {
            // FIXED: Pass userId when selecting objects
            whiteboardStore.selectObjects([objectId], userId);
          }
          
          const selectedObjects = whiteboardStore.selectedObjectIds
            .map(id => whiteboardStore.objects[id])
            .filter(Boolean);
          
          const startPositions = new Map();
          selectedObjects.forEach(obj => {
            startPositions.set(obj.id, { x: obj.x, y: obj.y });
          });
          setSelectedObjectStartPositions(startPositions);
          
          setIsDragging(true);
          setLastPanPoint(coords);
        } else {
          // FIXED: Pass userId when clearing selection
          whiteboardStore.selectObjects([], userId);
        }
        break;
      }

      case 'hand':
        setIsDragging(true);
        setLastPanPoint(coords);
        break;

      case 'pencil':
      case 'brush': {
        console.log('🎨 Starting drawing stroke with userId:', userId.slice(0, 8));
        setDrawingState({
          isDrawing: true,
          currentPath: `M ${coords.x} ${coords.y}`,
          lastPoint: coords,
          startPoint: coords,
        });
        break;
      }

      case 'eraser':
        eraserLogic.handleEraserStart(coords, findObjectAt, redrawCanvas, userId);
        setDrawingState({
          isDrawing: true,
          currentPath: '',
          lastPoint: coords,
          startPoint: coords,
        });
        break;

      case 'rectangle':
      case 'circle':
      case 'triangle':
      case 'diamond':
      case 'pentagon':
      case 'hexagon':
      case 'star':
      case 'heart': {
        console.log('🔷 Starting shape drawing with userId:', userId.slice(0, 8));
        setShapeState({
          isDrawingShape: true,
          startPoint: coords,
          currentShape: {
            type: activeTool,
            x: coords.x,
            y: coords.y,
            width: 0,
            height: 0,
          },
        });
        break;
      }

      case 'fill': {
        const objectId = findObjectAt(coords.x, coords.y);
        if (objectId) {
          console.log('🎨 Filling object with userId:', userId.slice(0, 8));
          // FIXED: Pass userId when updating object
          whiteboardStore.updateObject(objectId, {
            fill: toolSettings.fillColor,
          }, userId);
          redrawCanvas();
        }
        break;
      }
    }
  }, [toolStore, whiteboardStore, getCanvasCoordinates, findObjectAt, eraserLogic, redrawCanvas, userId]);

  // Handle pointer move events
  const handlePointerMove = useCallback((event: PointerEvent | TouchEvent | MouseEvent, canvas: HTMLCanvasElement) => {
    const coords = getCanvasCoordinates(event, canvas);
    if (!coords) return;

    const { activeTool } = toolStore;

    switch (activeTool) {
      case 'select':
        if (isDragging && lastPanPoint && whiteboardStore.selectedObjectIds.length > 0) {
          const deltaX = coords.x - lastPanPoint.x;
          const deltaY = coords.y - lastPanPoint.y;
          
          whiteboardStore.selectedObjectIds.forEach(objectId => {
            const obj = whiteboardStore.objects[objectId];
            if (obj) {
              whiteboardStore.updateObjectPosition(obj.id, obj.x + deltaX, obj.y + deltaY);
            }
          });
          
          setLastPanPoint(coords);
          redrawCanvas();
        }
        break;

      case 'hand':
        if (isDragging && lastPanPoint) {
          const deltaX = coords.x - lastPanPoint.x;
          const deltaY = coords.y - lastPanPoint.y;
          whiteboardStore.pan(-deltaX, -deltaY);
          setLastPanPoint(coords);
          redrawCanvas();
        }
        break;

      case 'pencil':
      case 'brush':
        if (drawingState.isDrawing && drawingState.lastPoint) {
          const newPath = `${drawingState.currentPath} L ${coords.x} ${coords.y}`;
          setDrawingState(prev => ({
            ...prev,
            currentPath: newPath,
            lastPoint: coords,
          }));
          redrawCanvas();
        }
        break;

      case 'eraser':
        if (drawingState.isDrawing && drawingState.lastPoint) {
          eraserLogic.handleEraserMove(coords, drawingState.lastPoint, findObjectAt, redrawCanvas, userId);
          setDrawingState(prev => ({
            ...prev,
            lastPoint: coords,
          }));
        }
        break;

      case 'rectangle':
      case 'circle':
      case 'triangle':
      case 'diamond':
      case 'pentagon':
      case 'hexagon':
      case 'star':
      case 'heart':
        if (shapeState.isDrawingShape && shapeState.startPoint) {
          const width = coords.x - shapeState.startPoint.x;
          const height = coords.y - shapeState.startPoint.y;
          
          setShapeState(prev => ({
            ...prev,
            currentShape: {
              type: activeTool,
              x: Math.min(shapeState.startPoint!.x, coords.x),
              y: Math.min(shapeState.startPoint!.y, coords.y),
              width: Math.abs(width),
              height: Math.abs(height),
            },
          }));
          redrawCanvas();
        }
        break;
    }
  }, [toolStore, whiteboardStore, getCanvasCoordinates, findObjectAt, eraserLogic, isDragging, lastPanPoint, drawingState, shapeState, redrawCanvas, userId]);

  // Handle pointer up events
  const handlePointerUp = useCallback((event: PointerEvent | TouchEvent | MouseEvent, canvas: HTMLCanvasElement) => {
    const coords = getCanvasCoordinates(event, canvas);
    const { activeTool, toolSettings } = toolStore;

    console.log('🎯 Pointer up:', { tool: activeTool, coords, userId: userId.slice(0, 8) });

    switch (activeTool) {
      case 'select':
        if (isDragging && whiteboardStore.selectedObjectIds.length > 0) {
          // Record position update actions for selected objects
          whiteboardStore.selectedObjectIds.forEach(objectId => {
            const obj = whiteboardStore.objects[objectId];
            const startPos = selectedObjectStartPositions.get(objectId);
            if (obj && startPos && (obj.x !== startPos.x || obj.y !== startPos.y)) {
              console.log('🎯 Recording object move with userId:', userId.slice(0, 8));
              // FIXED: Pass userId when updating object position
              whiteboardStore.updateObject(objectId, { x: obj.x, y: obj.y }, userId);
            }
          });
        }
        setIsDragging(false);
        setLastPanPoint(null);
        setSelectedObjectStartPositions(new Map());
        break;

      case 'hand':
        setIsDragging(false);
        setLastPanPoint(null);
        break;

      case 'pencil':
      case 'brush':
        if (drawingState.isDrawing && drawingState.currentPath && drawingState.startPoint) {
          console.log('🎨 Completing drawing stroke with userId:', userId.slice(0, 8));
          // FIXED: Pass userId when adding object
          whiteboardStore.addObject({
            type: 'path',
            x: drawingState.startPoint.x,
            y: drawingState.startPoint.y,
            stroke: toolSettings.strokeColor,
            strokeWidth: toolSettings.strokeWidth,
            opacity: toolSettings.opacity,
            data: {
              path: drawingState.currentPath,
              brushType: activeTool,
            },
          }, userId);
          
          setDrawingState({
            isDrawing: false,
            currentPath: '',
            lastPoint: null,
            startPoint: null,
          });
          redrawCanvas();
        }
        break;

      case 'eraser':
        eraserLogic.handleEraserEnd(redrawCanvas, userId);
        setDrawingState({
          isDrawing: false,
          currentPath: '',
          lastPoint: null,
          startPoint: null,
        });
        break;

      case 'rectangle':
      case 'circle':
      case 'triangle':
      case 'diamond':
      case 'pentagon':
      case 'hexagon':
      case 'star':
      case 'heart':
        if (shapeState.isDrawingShape && shapeState.currentShape && shapeState.currentShape.width > 0 && shapeState.currentShape.height > 0) {
          console.log('🔷 Completing shape drawing with userId:', userId.slice(0, 8));
          // FIXED: Pass userId when adding object
          whiteboardStore.addObject({
            type: shapeState.currentShape.type as any,
            x: shapeState.currentShape.x,
            y: shapeState.currentShape.y,
            width: shapeState.currentShape.width,
            height: shapeState.currentShape.height,
            fill: toolSettings.fillColor,
            stroke: toolSettings.strokeColor,
            strokeWidth: toolSettings.strokeWidth,
            opacity: toolSettings.opacity,
          }, userId);
          
          setShapeState({
            isDrawingShape: false,
            startPoint: null,
            currentShape: null,
          });
          redrawCanvas();
        } else {
          setShapeState({
            isDrawingShape: false,
            startPoint: null,
            currentShape: null,
          });
        }
        break;
    }
  }, [toolStore, whiteboardStore, getCanvasCoordinates, eraserLogic, isDragging, drawingState, shapeState, selectedObjectStartPositions, redrawCanvas, userId]);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
    setLastPanPoint(null);
    
    if (drawingState.isDrawing) {
      setDrawingState({
        isDrawing: false,
        currentPath: '',
        lastPoint: null,
        startPoint: null,
      });
    }
    
    if (shapeState.isDrawingShape) {
      setShapeState({
        isDrawingShape: false,
        startPoint: null,
        currentShape: null,
      });
    }
  }, [drawingState.isDrawing, shapeState.isDrawingShape]);

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleMouseLeave,
    getCurrentDrawingPreview,
    getCurrentShapePreview,
    setRedrawCanvas,
    isDragging,
  };
};
