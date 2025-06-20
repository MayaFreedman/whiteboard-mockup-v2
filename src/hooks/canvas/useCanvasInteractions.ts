import React, { useState, useRef, useCallback } from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useToolStore } from '../../stores/toolStore';
import { useCanvasUtils } from './useCanvasUtils';
import { useObjectDrawer } from './useObjectDrawer';
import { useUser } from '../../contexts/UserContext';
import { useEraserLogic } from './useEraserLogic';
import { useActionBatching } from '../useActionBatching';

export const useCanvasInteractions = () => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  
  const whiteboardStore = useWhiteboardStore();
  const toolStore = useToolStore();
  const { userId } = useUser();
  
  const { findObjectAt, redrawCanvas } = useCanvasUtils();
  const { drawObject } = useObjectDrawer();

  const { handleEraserStart, handleEraserMove, handleEraserEnd } = useEraserLogic();
  const actionBatching = useActionBatching({ batchTimeout: 2000, maxBatchSize: 100 });

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const coords = { x, y };
    const tool = toolStore.tool;
    
    console.log('🖱️ Pointer Down:', { tool, coords });

    if (tool === 'eraser') {
      // Pass action batching to eraser logic
      handleEraserStart(coords, findObjectAt, redrawCanvas, actionBatching);
      setIsErasing(true);
      setLastPoint(coords);
      return;
    }

    if (tool === 'select') {
      const objectId = findObjectAt(x, y);
      if (objectId) {
        setSelectedObjectId(objectId);
        setIsDragging(true);
        setDragOffset({ x: x - whiteboardStore.objects[objectId].x, y: y - whiteboardStore.objects[objectId].y });
      } else {
        setSelectedObjectId(null);
      }
      return;
    }

    setIsDrawing(true);
    setLastPoint(coords);

    if (tool === 'pen') {
      const color = toolStore.toolSettings.color || 'black';
      const size = toolStore.toolSettings.size || 2;
      const brushType = toolStore.toolSettings.brushType || 'sharp';

      const id = whiteboardStore.addObject({
        type: 'path',
        x: 0,
        y: 0,
        stroke: color,
        strokeWidth: size,
        opacity: 1,
        data: {
          path: `M ${x} ${y}`,
          brushType: brushType
        }
      }, userId);
      setSelectedObjectId(id);
      setCurrentPath(`M ${x} ${y}`);
    }
  }, [whiteboardStore, toolStore.tool, toolStore.toolSettings, findObjectAt, redrawCanvas, userId, handleEraserStart, actionBatching]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const coords = { x, y };
    
    if (isErasing && lastPointRef.current) {
      handleEraserMove(coords, lastPointRef.current, findObjectAt, redrawCanvas);
      setLastPoint(coords);
      return;
    }

    if (!isDrawing && !isDragging) return;

    if (isDragging && selectedObjectId) {
      if (dragOffset) {
        const newX = x - dragOffset.x;
        const newY = y - dragOffset.y;
        whiteboardStore.updateObjectPosition(selectedObjectId, newX, newY);
        redrawCanvas();
      }
      return;
    }

    if (isDrawing && selectedObjectId) {
      const tool = toolStore.tool;
      if (tool === 'pen') {
        const current = currentPath || `M ${x} ${y}`;
        const newPath = `${current} L ${x} ${y}`;
        setCurrentPath(newPath);
        whiteboardStore.updateObject(selectedObjectId, { data: { path: newPath } }, userId);
        redrawCanvas();
        return;
      }

      if (['rectangle', 'circle', 'triangle', 'diamond', 'pentagon', 'hexagon', 'star', 'heart'].includes(tool)) {
        if (lastPointRef.current) {
          redrawCanvas();
          drawObject(tool, lastPointRef.current.x, lastPointRef.current.y, x, y);
        }
        return;
      }

      if (tool === 'text') {
        // Handle text tool logic here
        return;
      }
    }
  }, [whiteboardStore, toolStore.tool, isDrawing, isDragging, selectedObjectId, dragOffset, currentPath, findObjectAt, redrawCanvas, userId, handleEraserMove]);

  const handlePointerUp = useCallback(() => {
    setIsDrawing(false);
    setIsDragging(false);
    setCurrentPath(null);
    lastPointRef.current = null;

    if (isErasing) {
      // Pass action batching to eraser end
      handleEraserEnd(redrawCanvas, actionBatching);
      setIsErasing(false);
      setLastPoint(null);
      return;
    }

    if (selectedObjectId) {
      setSelectedObjectId(null);
    }
  }, [redrawCanvas, handleEraserEnd, actionBatching, selectedObjectId]);

  const handlePointerLeave = useCallback(() => {
    setIsDrawing(false);
    setIsDragging(false);
    setIsErasing(false);
    setCurrentPath(null);
    lastPointRef.current = null;
    setSelectedObjectId(null);
  }, []);

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerLeave,
    redrawCanvas,
    isDrawing,
    isDragging,
    isErasing,
    selectedObjectId,
    dragOffset,
    currentPath,
  };
};
