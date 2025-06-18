import { useCallback, useRef, useState, useEffect } from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useToolStore } from '../../stores/toolStore';
import { useUser } from '../../contexts/UserContext';
import { WhiteboardObject } from '../../types/whiteboard';
import { nanoid } from 'nanoid';

export const useCanvasInteractions = (canvas: HTMLCanvasElement | null) => {
  const { addObject, selectObjects, clearSelection } = useWhiteboardStore();
  const { activeTool, toolSettings } = useToolStore();
  const { userId } = useUser();

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  
  // Shape drawing state
  const [isDrawingShape, setIsDrawingShape] = useState(false);
  const [shapeStart, setShapeStart] = useState<{ x: number; y: number } | null>(null);
  const [shapeEnd, setShapeEnd] = useState<{ x: number; y: number } | null>(null);

  // Preview states for real-time rendering
  const [drawingPreview, setDrawingPreview] = useState<any>(null);
  const [shapePreview, setShapePreview] = useState<any>(null);

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);

  // Store redraw function
  const redrawCanvasRef = useRef<(() => void) | null>(null);

  const getCanvasCoordinates = useCallback((event: MouseEvent | TouchEvent) => {
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in event) {
      clientX = event.touches[0]?.clientX || 0;
      clientY = event.touches[0]?.clientY || 0;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }, [canvas]);

  const generateShapePath = useCallback((shapeType: string, x: number, y: number, width: number, height: number): string => {
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    
    switch (shapeType) {
      case 'triangle':
        return `M ${centerX} ${y} L ${x + width} ${y + height} L ${x} ${y + height} Z`;
      
      case 'diamond':
        return `M ${centerX} ${y} L ${x + width} ${centerY} L ${centerX} ${y + height} L ${x} ${centerY} Z`;
      
      case 'pentagon': {
        const pentagonPoints = [];
        for (let i = 0; i < 5; i++) {
          const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
          const px = centerX + (width / 2) * Math.cos(angle);
          const py = centerY + (height / 2) * Math.sin(angle);
          pentagonPoints.push(`${i === 0 ? 'M' : 'L'} ${px} ${py}`);
        }
        return pentagonPoints.join(' ') + ' Z';
      }
      
      case 'hexagon': {
        const hexagonPoints = [];
        for (let i = 0; i < 6; i++) {
          const angle = (i * 2 * Math.PI) / 6;
          const px = centerX + (width / 2) * Math.cos(angle);
          const py = centerY + (height / 2) * Math.sin(angle);
          hexagonPoints.push(`${i === 0 ? 'M' : 'L'} ${px} ${py}`);
        }
        return hexagonPoints.join(' ') + ' Z';
      }
      
      case 'star': {
        const starPoints = [];
        const outerRadiusX = width / 2;
        const outerRadiusY = height / 2;
        const innerRadiusX = outerRadiusX * 0.4;
        const innerRadiusY = outerRadiusY * 0.4;
        
        for (let i = 0; i < 10; i++) {
          const angle = (i * Math.PI) / 5 - Math.PI / 2;
          const radiusX = i % 2 === 0 ? outerRadiusX : innerRadiusX;
          const radiusY = i % 2 === 0 ? outerRadiusY : innerRadiusY;
          const px = centerX + radiusX * Math.cos(angle);
          const py = centerY + radiusY * Math.sin(angle);
          starPoints.push(`${i === 0 ? 'M' : 'L'} ${px} ${py}`);
        }
        return starPoints.join(' ') + ' Z';
      }
      
      case 'heart': {
        // Improved heart shape that matches the lucide heart icon better
        const heartWidth = width;
        const heartHeight = height;
        
        // Calculate control points for a more natural heart shape
        const leftCurveX = x + heartWidth * 0.25;
        const rightCurveX = x + heartWidth * 0.75;
        const topY = y + heartHeight * 0.3;
        const bottomPointX = x + heartWidth * 0.5;
        const bottomPointY = y + heartHeight;
        
        // Create heart shape using cubic bezier curves that maintain proportions
        return `M ${bottomPointX} ${bottomPointY}
                C ${bottomPointX - heartWidth * 0.25} ${y + heartHeight * 0.7}, ${leftCurveX - heartWidth * 0.15} ${topY + heartHeight * 0.1}, ${leftCurveX} ${topY}
                C ${leftCurveX - heartWidth * 0.1} ${y + heartHeight * 0.15}, ${leftCurveX + heartWidth * 0.05} ${y + heartHeight * 0.05}, ${leftCurveX + heartWidth * 0.15} ${y + heartHeight * 0.1}
                C ${bottomPointX - heartWidth * 0.1} ${y + heartHeight * 0.25}, ${bottomPointX} ${y + heartHeight * 0.4}, ${bottomPointX} ${y + heartHeight * 0.4}
                C ${bottomPointX} ${y + heartHeight * 0.4}, ${bottomPointX + heartWidth * 0.1} ${y + heartHeight * 0.25}, ${rightCurveX - heartWidth * 0.15} ${y + heartHeight * 0.1}
                C ${rightCurveX - heartWidth * 0.05} ${y + heartHeight * 0.05}, ${rightCurveX + heartWidth * 0.1} ${y + heartHeight * 0.15}, ${rightCurveX} ${topY}
                C ${rightCurveX + heartWidth * 0.15} ${topY + heartHeight * 0.1}, ${bottomPointX + heartWidth * 0.25} ${y + heartHeight * 0.7}, ${bottomPointX} ${bottomPointY} Z`;
      }
      
      default:
        return '';
    }
  }, []);

  const handlePointerDown = useCallback((event: MouseEvent | TouchEvent) => {
    if (!canvas) return;
    const coords = getCanvasCoordinates(event);
    
    if (activeTool === 'pencil' || activeTool === 'brush' || activeTool === 'eraser') {
      setIsDrawing(true);
      setStartPoint(coords);
      setCurrentPath(`M ${coords.x} ${coords.y}`);
      
      // Set up drawing preview
      setDrawingPreview({
        path: `M ${coords.x} ${coords.y}`,
        startX: coords.x,
        startY: coords.y,
        strokeColor: toolSettings.strokeColor,
        strokeWidth: activeTool === 'eraser' ? toolSettings.eraserSize : toolSettings.strokeWidth,
        opacity: activeTool === 'eraser' ? toolSettings.eraserOpacity : toolSettings.opacity,
        brushType: activeTool === 'brush' ? toolSettings.brushType : 'paintbrush',
        isEraser: activeTool === 'eraser'
      });
    } else if (['rectangle', 'circle', 'triangle', 'diamond', 'pentagon', 'hexagon', 'star', 'heart'].includes(activeTool)) {
      setIsDrawingShape(true);
      setShapeStart(coords);
      setShapeEnd(coords);
      
      // Set up shape preview
      setShapePreview({
        type: activeTool,
        startX: coords.x,
        startY: coords.y,
        endX: coords.x,
        endY: coords.y,
        strokeColor: toolSettings.strokeColor,
        strokeWidth: toolSettings.shapeBorderWeight || 2,
        fillColor: 'transparent',
        opacity: toolSettings.opacity
      });
    }
  }, [canvas, activeTool, toolSettings, getCanvasCoordinates]);

  const handlePointerMove = useCallback((event: MouseEvent | TouchEvent) => {
    if (!canvas) return;
    const coords = getCanvasCoordinates(event);
    
    if (isDrawing && startPoint) {
      const newPath = currentPath + ` L ${coords.x} ${coords.y}`;
      setCurrentPath(newPath);
      
      // Update drawing preview
      setDrawingPreview(prev => prev ? {
        ...prev,
        path: newPath
      } : null);
      
      // Trigger redraw
      if (redrawCanvasRef.current) {
        redrawCanvasRef.current();
      }
    } else if (isDrawingShape && shapeStart) {
      setShapeEnd(coords);
      
      // Update shape preview
      setShapePreview(prev => prev ? {
        ...prev,
        endX: coords.x,
        endY: coords.y
      } : null);
      
      // Trigger redraw
      if (redrawCanvasRef.current) {
        redrawCanvasRef.current();
      }
    }
  }, [canvas, isDrawing, isDrawingShape, startPoint, shapeStart, currentPath, getCanvasCoordinates]);

  const handlePointerUp = useCallback(() => {
    if (isDrawing && startPoint && currentPath) {
      const newObject: WhiteboardObject = {
        id: nanoid(),
        type: 'path',
        x: startPoint.x,
        y: startPoint.y,
        stroke: toolSettings.strokeColor,
        strokeWidth: activeTool === 'eraser' ? toolSettings.eraserSize : toolSettings.strokeWidth,
        opacity: activeTool === 'eraser' ? toolSettings.eraserOpacity : toolSettings.opacity,
        createdAt: Date.now(),
        userId,
        data: {
          path: currentPath.replace(`M ${startPoint.x} ${startPoint.y}`, 'M 0 0'),
          brushType: activeTool === 'brush' ? toolSettings.brushType : 'paintbrush',
          isEraser: activeTool === 'eraser'
        }
      };
      
      addObject(newObject);
      console.log(`🎨 Added ${activeTool} path:`, newObject);
    } else if (isDrawingShape && shapeStart && shapeEnd) {
      const width = Math.abs(shapeEnd.x - shapeStart.x);
      const height = Math.abs(shapeEnd.y - shapeStart.y);
      const x = Math.min(shapeStart.x, shapeEnd.x);
      const y = Math.min(shapeStart.y, shapeEnd.y);
      
      if (width > 5 && height > 5) { // Minimum size threshold
        if (activeTool === 'rectangle') {
          const newObject: WhiteboardObject = {
            id: nanoid(),
            type: 'rectangle',
            x,
            y,
            width,
            height,
            stroke: toolSettings.strokeColor,
            strokeWidth: toolSettings.shapeBorderWeight || 2,
            fill: 'transparent',
            opacity: toolSettings.opacity,
            createdAt: Date.now(),
            userId
          };
          addObject(newObject);
          console.log('🔲 Added rectangle:', newObject);
        } else if (activeTool === 'circle') {
          const newObject: WhiteboardObject = {
            id: nanoid(),
            type: 'circle',
            x,
            y,
            width: Math.min(width, height),
            stroke: toolSettings.strokeColor,
            strokeWidth: toolSettings.shapeBorderWeight || 2,
            fill: 'transparent',
            opacity: toolSettings.opacity,
            createdAt: Date.now(),
            userId
          };
          addObject(newObject);
          console.log('🔴 Added circle:', newObject);
        } else if (['triangle', 'diamond', 'pentagon', 'hexagon', 'star', 'heart'].includes(activeTool)) {
          const shapePath = generateShapePath(activeTool, 0, 0, width, height);
          
          const newObject: WhiteboardObject = {
            id: nanoid(),
            type: 'path',
            x,
            y,
            stroke: toolSettings.strokeColor,
            strokeWidth: toolSettings.shapeBorderWeight || 2,
            fill: 'transparent',
            opacity: toolSettings.opacity,
            createdAt: Date.now(),
            userId,
            data: {
              path: shapePath,
              shapeType: activeTool
            }
          };
          addObject(newObject);
          console.log(`✨ Added ${activeTool}:`, newObject);
        }
      }
    }
    
    // Reset states
    setIsDrawing(false);
    setIsDrawingShape(false);
    setCurrentPath('');
    setStartPoint(null);
    setShapeStart(null);
    setShapeEnd(null);
    setDrawingPreview(null);
    setShapePreview(null);
  }, [isDrawing, isDrawingShape, startPoint, shapeStart, shapeEnd, currentPath, activeTool, toolSettings, userId, addObject, generateShapePath]);

  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (canvas) {
      handlePointerDown(event.nativeEvent);
    }
  }, [canvas, handlePointerDown]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (canvas) {
      handlePointerMove(event.nativeEvent);
    }
  }, [canvas, handlePointerMove]);

  const handleMouseUp = useCallback(() => {
    handlePointerUp();
  }, [handlePointerUp]);

  const handleMouseLeave = useCallback(() => {
    // Reset drawing states when mouse leaves canvas
    setIsDrawing(false);
    setIsDrawingShape(false);
    setCurrentPath('');
    setStartPoint(null);
    setShapeStart(null);
    setShapeEnd(null);
    setDrawingPreview(null);
    setShapePreview(null);
  }, []);

  const getCurrentDrawingPreview = useCallback(() => drawingPreview, [drawingPreview]);
  const getCurrentShapePreview = useCallback(() => shapePreview, [shapePreview]);

  const setRedrawCanvas = useCallback((redrawFn: () => void) => {
    redrawCanvasRef.current = redrawFn;
  }, []);

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleMouseLeave,
    getCurrentDrawingPreview,
    getCurrentShapePreview,
    setRedrawCanvas,
    isDrawing: isDrawing || isDrawingShape,
    isDragging
  };
};
