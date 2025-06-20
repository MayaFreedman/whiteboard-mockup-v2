import { useState, useEffect, useCallback } from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useToolStore } from '../../stores/toolStore';
import { getStroke } from 'perfect-freehand';
import { Point } from '../../utils/path/pathConversion';
import { WhiteboardObject } from '../../types/whiteboard';
import rough from 'roughjs/bundled/rough.cjs';

const generator = rough.generator();

/**
 * Custom hook for handling canvas interactions
 * Includes pointer event handling, object creation, and manipulation logic
 */
export const useCanvasInteractions = () => {
  const { addObject, updateObject, selectObjectsInArea, deselectAllObjects, deleteObjectsInArea } = useWhiteboardStore();
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
  
  // Redraw function setter
  const [redrawCanvas, setRedrawCanvas] = useState<() => void>(() => {});

  /**
   * Generates rough element for rectangle
   * @param x - Top-left x-coordinate
   * @param y - Top-left y-coordinate
   * @param width - Width of the rectangle
   * @param height - Height of the rectangle
   * @returns Rough element for the rectangle
   */
  const generateRectangle = (x: number, y: number, width: number, height: number) => {
    return generator.rectangle(x, y, width, height, {
      fill: toolSettings.fillColor !== 'transparent' ? toolSettings.fillColor : undefined,
      stroke: toolSettings.strokeColor,
      strokeWidth: toolSettings.strokeWidth,
      roughness: toolSettings.roughness,
      fillStyle: toolSettings.fillStyle
    });
  };

  /**
   * Generates rough element for circle
   * @param x - Center x-coordinate
   * @param y - Center y-coordinate
   * @param width - Width of the circle (diameter)
   * @param height - Height of the circle (diameter)
   * @returns Rough element for the circle
   */
  const generateEllipse = (x: number, y: number, width: number, height: number) => {
    return generator.ellipse(x, y, width, height, {
      fill: toolSettings.fillColor !== 'transparent' ? toolSettings.fillColor : undefined,
      stroke: toolSettings.strokeColor,
      strokeWidth: toolSettings.strokeWidth,
      roughness: toolSettings.roughness,
      fillStyle: toolSettings.fillStyle
    });
  };

  /**
   * Handles pointer down event
   * @param event - Pointer event
   * @param canvas - Canvas element
   */
  const handlePointerDown = (event: PointerEvent, canvas: HTMLCanvasElement) => {
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
      case 'crayon':
      case 'paintbrush':
      case 'spray':
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
        // Initialize shape preview
        setCurrentShapePreview({
          type: activeTool,
          startX: x,
          startY: y,
          endX: x,
          endY: y,
          strokeColor: toolSettings.strokeColor,
          strokeWidth: toolSettings.strokeWidth,
          fillColor: toolSettings.fillColor,
          opacity: toolSettings.opacity
        });
        break;
        
      case 'select':
        deselectAllObjects();
        break;
        
      case 'hand':
        // Logic for panning will be implemented in pointer move
        break;
        
      default:
        break;
    }
  };

  /**
   * Handles pointer move event
   * @param event - Pointer event
   * @param canvas - Canvas element
   */
  const handlePointerMove = (event: PointerEvent, canvas: HTMLCanvasElement) => {
    if (!isDragging) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    setCurrentX(x);
    setCurrentY(y);
    
    switch (activeTool) {
      case 'pencil':
      case 'brush':
      case 'crayon':
      case 'paintbrush':
      case 'spray':
        if (currentObjectId) {
          // Calculate smoothed points for the path
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
          
          // Update the path object with the new path data
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
          // Collect eraser points
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
          
          // Update the eraser path object with the new path data
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
        // Update shape preview
        setCurrentShapePreview(prev => ({
          ...prev,
          endX: x,
          endY: y
        }));
        break;
        
      case 'select':
        // Logic for moving selected objects will be implemented here
        break;
        
      case 'hand':
        // Logic for panning the canvas will be implemented here
        break;
        
      default:
        break;
    }
    
    // Request redraw after each move
    redrawCanvas();
  };

  /**
   * Handles pointer up event
   * @param event - Pointer event
   * @param canvas - Canvas element
   */
  const handlePointerUp = (event: PointerEvent, canvas: HTMLCanvasElement) => {
    setIsDragging(false);
    setCurrentObjectId(null);
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    switch (activeTool) {
      case 'pencil':
      case 'brush':
      case 'crayon':
      case 'paintbrush':
      case 'spray':
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
            fill: toolSettings.fillColor !== 'transparent' ? toolSettings.fillColor : undefined,
            stroke: toolSettings.strokeColor,
            strokeWidth: toolSettings.strokeWidth,
            opacity: toolSettings.opacity,
            data: {
              roughParams: generateRectangle(0, 0, Math.abs(currentX - startX), Math.abs(currentY - startY))
            },
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          addObject(rectObject);
          console.log('⬛ Rectangle created:', rectObject);
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
            fill: toolSettings.fillColor !== 'transparent' ? toolSettings.fillColor : undefined,
            stroke: toolSettings.strokeColor,
            strokeWidth: toolSettings.strokeWidth,
            opacity: toolSettings.opacity,
            data: {
              roughParams: generateEllipse(0, 0, Math.abs(currentX - startX), Math.abs(currentY - startY))
            },
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          addObject(circleObject);
          console.log('⚪ Circle created:', circleObject);
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
            fill: toolSettings.fillColor !== 'transparent' ? toolSettings.fillColor : undefined,
            stroke: toolSettings.strokeColor,
            strokeWidth: toolSettings.strokeWidth,
            opacity: toolSettings.opacity,
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          addObject(shapeObject);
          console.log(`▲ ${activeTool} created:`, shapeObject);
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
                fontSize: toolSettings.fontSize,
                fontFamily: toolSettings.fontFamily,
                bold: toolSettings.textBold,
                italic: toolSettings.textItalic,
                underline: toolSettings.textUnderline,
                textAlign: toolSettings.textAlign,
                isPlaceholder: true // Mark as placeholder initially
              },
              createdAt: Date.now(),
              updatedAt: Date.now()
            };
            
            addObject(textObject);
            console.log('📝 Text box created:', textObject);
          }
          break;
        }
        
      case 'select':
        // Logic for selecting objects in an area
        selectObjectsInArea({
          x: Math.min(startX, currentX),
          y: Math.min(startY, currentY),
          width: Math.abs(currentX - startX),
          height: Math.abs(currentY - startY)
        });
        break;
        
      case 'hand':
        // Logic for finishing panning will be implemented here
        break;
        
      default:
        break;
    }
    
    // Clear shape preview
    setCurrentShapePreview(null);
    
    // Request redraw after finishing drawing
    redrawCanvas();
  };

  /**
   * Handles mouse leave event
   */
  const handleMouseLeave = () => {
    if (activeTool === 'select' || activeTool === 'hand') {
      // Do not clear anything for select and hand tools
      return;
    }
    
    setIsDragging(false);
    setCurrentObjectId(null);
    setDrawingPath([]);
    setEraserPoints([]);
    setCurrentDrawingPreview(null);
    setCurrentShapePreview(null);
    redrawCanvas();
  };

  /**
   * Converts stroke points to SVG path
   * @param stroke - Array of stroke points
   * @returns SVG path string
   */
  const getSvgPathFromStroke = (stroke: Point[]) => {
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
  };

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
