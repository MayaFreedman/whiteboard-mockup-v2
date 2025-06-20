
import { useState, useCallback, useRef } from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useToolStore } from '../../stores/toolStore';
import { getStroke } from 'perfect-freehand';
import { Point } from '../../utils/path/pathConversion';
import { WhiteboardObject } from '../../types/whiteboard';

export const useCanvasInteractions = () => {
  const { addObject, updateObject } = useWhiteboardStore();
  const { activeTool, toolSettings } = useToolStore();
  
  // Drawing state
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [drawingPath, setDrawingPath] = useState<Point[]>([]);
  const [currentObjectId, setCurrentObjectId] = useState<string | null>(null);
  
  // Eraser state
  const [eraserPoints, setEraserPoints] = useState<Point[]>([]);
  
  // Preview state for drawing and shapes
  const [currentDrawingPreview, setCurrentDrawingPreview] = useState<any>(null);
  const [currentShapePreview, setCurrentShapePreview] = useState<any>(null);
  
  // Use ref to store redraw function to avoid re-render issues
  const redrawCanvasRef = useRef<() => void>(() => {});

  const handlePointerDown = useCallback((event: PointerEvent, canvas: HTMLCanvasElement) => {
    setIsDragging(true);
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    setStartX(x);
    setStartY(y);
    setCurrentX(x);
    setCurrentY(y);
    
    switch (activeTool) {
      case 'pencil':
      case 'brush':
        setDrawingPath([{ x, y }]);
        const newPathObject: WhiteboardObject = {
          id: `path-${Date.now()}`,
          type: 'path',
          x: x,
          y: y,
          stroke: toolSettings.strokeColor,
          strokeWidth: toolSettings.strokeWidth,
          opacity: toolSettings.opacity,
          data: {
            path: `M ${x} ${y}`,
            brushType: activeTool,
          },
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        addObject(newPathObject);
        setCurrentObjectId(newPathObject.id);
        break;
        
      case 'eraser':
        setEraserPoints([{ x, y }]);
        const newEraserObject: WhiteboardObject = {
          id: `eraser-${Date.now()}`,
          type: 'path',
          x: x,
          y: y,
          strokeWidth: toolSettings.eraserSize,
          opacity: toolSettings.opacity,
          data: {
            path: `M ${x} ${y}`,
            isEraser: true,
          },
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        addObject(newEraserObject);
        setCurrentObjectId(newEraserObject.id);
        break;
        
      case 'rectangle':
      case 'circle':
      case 'triangle':
      case 'diamond':
      case 'pentagon':
      case 'hexagon':
      case 'star':
      case 'heart':
      case 'text':
        setCurrentShapePreview({
          type: activeTool,
          startX: x,
          startY: y,
          endX: x,
          endY: y,
          strokeColor: toolSettings.strokeColor,
          strokeWidth: toolSettings.strokeWidth,
          fillColor: 'transparent',
          opacity: toolSettings.opacity
        });
        break;
        
      default:
        break;
    }
  }, [activeTool, toolSettings, addObject]);

  const handlePointerMove = useCallback((event: PointerEvent, canvas: HTMLCanvasElement) => {
    if (!isDragging) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    setCurrentX(x);
    setCurrentY(y);
    
    switch (activeTool) {
      case 'pencil':
      case 'brush':
        if (currentObjectId) {
          const newPoint: Point = { x, y };
          setDrawingPath(prev => [...prev, newPoint]);
          
          const points = [...drawingPath, newPoint];
          const options = {
            size: toolSettings.strokeWidth,
            thinning: 0.5,
            smoothing: 0.5,
            streamline: 0.5,
            easing: (v: number) => v,
            start: {
              taper: 0,
              easing: (v: number) => v,
            },
            end: {
              taper: 0,
              easing: (v: number) => v,
            },
          };
          const stroke = getStroke(points, options);
          const pathString = getSvgPathFromStroke(stroke);
          
          updateObject(currentObjectId, {
            data: {
              path: pathString,
              brushType: activeTool,
            },
            updatedAt: Date.now()
          });
        }
        break;
        
      case 'eraser':
        if (currentObjectId) {
          const newPoint: Point = { x, y };
          setEraserPoints(prev => [...prev, newPoint]);
          
          const points = [...eraserPoints, newPoint];
          const options = {
            size: toolSettings.eraserSize,
            thinning: 0.5,
            smoothing: 0.5,
            streamline: 0.5,
            easing: (v: number) => v,
            start: {
              taper: 0,
              easing: (v: number) => v,
            },
            end: {
              taper: 0,
              easing: (v: number) => v,
            },
          };
          const stroke = getStroke(points, options);
          const pathString = getSvgPathFromStroke(stroke);
          
          updateObject(currentObjectId, {
            data: {
              path: pathString,
              isEraser: true,
            },
            updatedAt: Date.now()
          });
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
      case 'text':
        setCurrentShapePreview(prev => ({
          ...prev,
          endX: x,
          endY: y
        }));
        break;
        
      default:
        break;
    }
    
    redrawCanvasRef.current();
  }, [isDragging, activeTool, currentObjectId, toolSettings, drawingPath, eraserPoints, updateObject]);

  const handlePointerUp = useCallback((event: PointerEvent, canvas: HTMLCanvasElement) => {
    setIsDragging(false);
    setCurrentObjectId(null);
    
    switch (activeTool) {
      case 'pencil':
      case 'brush':
      case 'eraser':
        setDrawingPath([]);
        setEraserPoints([]);
        setCurrentDrawingPreview(null);
        break;
        
      case 'rectangle': {
        if (Math.abs(currentX - startX) > 10 && Math.abs(currentY - startY) > 10) {
          const rectObject: WhiteboardObject = {
            id: `rect-${Date.now()}`,
            type: 'rectangle',
            x: Math.min(startX, currentX),
            y: Math.min(startY, currentY),
            width: Math.abs(currentX - startX),
            height: Math.abs(currentY - startY),
            stroke: toolSettings.strokeColor,
            strokeWidth: toolSettings.strokeWidth,
            opacity: toolSettings.opacity,
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          addObject(rectObject);
        }
        setCurrentShapePreview(null);
        break;
      }
        
      case 'circle': {
        if (Math.abs(currentX - startX) > 10 && Math.abs(currentY - startY) > 10) {
          const circleObject: WhiteboardObject = {
            id: `circle-${Date.now()}`,
            type: 'circle',
            x: Math.min(startX, currentX),
            y: Math.min(startY, currentY),
            width: Math.abs(currentX - startX),
            height: Math.abs(currentY - startY),
            stroke: toolSettings.strokeColor,
            strokeWidth: toolSettings.strokeWidth,
            opacity: toolSettings.opacity,
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          addObject(circleObject);
        }
        setCurrentShapePreview(null);
        break;
      }
        
      case 'triangle':
      case 'diamond':
      case 'pentagon':
      case 'hexagon':
      case 'star':
      case 'heart': {
        if (Math.abs(currentX - startX) > 10 && Math.abs(currentY - startY) > 10) {
          const shapeObject: WhiteboardObject = {
            id: `${activeTool}-${Date.now()}`,
            type: activeTool,
            x: Math.min(startX, currentX),
            y: Math.min(startY, currentY),
            width: Math.abs(currentX - startX),
            height: Math.abs(currentY - startY),
            stroke: toolSettings.strokeColor,
            strokeWidth: toolSettings.strokeWidth,
            opacity: toolSettings.opacity,
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          addObject(shapeObject);
        }
        setCurrentShapePreview(null);
        break;
      }

      case 'text': {
        if (Math.abs(currentX - startX) > 10 && Math.abs(currentY - startY) > 10) {
          const textObject: WhiteboardObject = {
            id: `text-${Date.now()}`,
            type: 'text',
            x: Math.min(startX, currentX),
            y: Math.min(startY, currentY),
            width: Math.abs(currentX - startX),
            height: Math.abs(currentY - startY),
            stroke: toolSettings.strokeColor,
            data: {
              content: 'Tap to edit',
              fontSize: toolSettings.fontSize || 16,
              fontFamily: toolSettings.fontFamily || 'Arial',
              bold: false,
              italic: false,
              underline: false,
              textAlign: 'left' as const,
              isPlaceholder: true
            },
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          
          addObject(textObject);
        }
        break;
      }
        
      default:
        break;
    }
    
    setCurrentShapePreview(null);
    redrawCanvasRef.current();
  }, [activeTool, currentX, currentY, startX, startY, toolSettings, addObject]);

  const handleMouseLeave = useCallback(() => {
    if (activeTool === 'select' || activeTool === 'hand') {
      return;
    }
    
    setIsDragging(false);
    setCurrentObjectId(null);
    setDrawingPath([]);
    setEraserPoints([]);
    setCurrentDrawingPreview(null);
    setCurrentShapePreview(null);
    redrawCanvasRef.current();
  }, [activeTool]);

  const getSvgPathFromStroke = useCallback((stroke: Point[]) => {
    if (!stroke.length) return '';
  
    const d = stroke.reduce(
      (acc, point, i, arr) => {
        const adjustedPoint = {
          x: point.x - startX,
          y: point.y - startY,
        };
        if (i === 0) return `M ${adjustedPoint.x} ${adjustedPoint.y}`;
  
        const nextPoint = arr[i + 1];
        if (!nextPoint) return `${acc} L ${adjustedPoint.x} ${adjustedPoint.y}`;
  
        const midPoint = {
          x: (adjustedPoint.x + nextPoint.x) / 2,
          y: (adjustedPoint.y + nextPoint.y) / 2,
        };
        return `${acc} Q ${adjustedPoint.x} ${adjustedPoint.y} ${midPoint.x} ${midPoint.y}`;
      },
      ''
    );
  
    return d;
  }, [startX, startY]);

  // Stable function to set redraw canvas
  const setRedrawCanvas = useCallback((fn: () => void) => {
    redrawCanvasRef.current = fn;
  }, []);

  return {
    isDragging,
    startX,
    startY,
    currentX,
    currentY,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleMouseLeave,
    getCurrentDrawingPreview: () => currentDrawingPreview,
    getCurrentShapePreview: () => currentShapePreview,
    setRedrawCanvas,
    isPencilActive: activeTool === 'pencil',
  };
};
