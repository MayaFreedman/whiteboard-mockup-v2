import { useRef, useCallback } from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useToolStore } from '../../stores/toolStore';
import { useUser } from '../../contexts/UserContext';
import { useMultiplayer } from '../../contexts/MultiplayerContext';
import { pathPointsCache } from '../../utils/pathPointsCache';
import { brushEffectCache, createSeededRandom, SprayEffectData, ChalkEffectData } from '../utils/brushCache';

/**
 * Custom hook for managing canvas rendering logic
 */
export const useCanvasRendering = () => {
  const whiteboardStore = useWhiteboardStore();
  const toolStore = useToolStore();
  const { userId } = useUser();
  const { serverInstance } = useMultiplayer();
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backgroundCanvasRef = useRef<HTMLCanvasElement>(null);

  /**
   * Clears the canvas and redraws all objects
   */
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const backgroundCanvas = backgroundCanvasRef.current;

    if (!canvas || !backgroundCanvas) return;

    const ctx = canvas.getContext('2d');
    const backgroundCtx = backgroundCanvas.getContext('2d');

    if (!ctx || !backgroundCtx) return;

    // Clear both canvases
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    backgroundCtx.clearRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);

    // Draw background
    backgroundCtx.fillStyle = whiteboardStore.settings.backgroundColor;
    backgroundCtx.fillRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);

    // Optionally draw grid
    if (whiteboardStore.settings.gridVisible) {
      const gridSize = 50;
      backgroundCtx.strokeStyle = '#e0e0e0';
      backgroundCtx.lineWidth = 0.5;

      for (let x = 0; x < backgroundCanvas.width; x += gridSize) {
        backgroundCtx.beginPath();
        backgroundCtx.moveTo(x, 0);
        backgroundCtx.lineTo(x, backgroundCanvas.height);
        backgroundCtx.stroke();
      }

      for (let y = 0; y < backgroundCanvas.height; y += gridSize) {
        backgroundCtx.beginPath();
        backgroundCtx.moveTo(0, y);
        backgroundCtx.lineTo(backgroundCanvas.width, y);
        backgroundCtx.stroke();
      }
    }

    // Optionally draw lined paper
    if (whiteboardStore.settings.linedPaperVisible) {
      const lineHeight = 24;
      backgroundCtx.strokeStyle = '#f0f0f0';
      backgroundCtx.lineWidth = 1;

      for (let y = lineHeight; y < backgroundCanvas.height; y += lineHeight) {
        backgroundCtx.beginPath();
        backgroundCtx.moveTo(0, y);
        backgroundCtx.lineTo(backgroundCanvas.width, y);
        backgroundCtx.stroke();
      }
    }

    // Draw whiteboard objects
    Object.values(whiteboardStore.objects).forEach(obj => {
      if (obj.type === 'path') {
        const pathPoints = obj.data?.path ? obj.data.path : [];
        const strokeWidth = obj.strokeWidth || 2;
        const brushType = obj.data?.brushType;

        // Enhanced brush effect rendering with proper segment handling
        if (brushType === 'spray') {
          const cachedEffect = brushEffectCache.get(obj.id, brushType);
          
          if (cachedEffect && cachedEffect.effectData) {
            const sprayData = cachedEffect.effectData as SprayEffectData;
            
            // Use cached spray dots for consistent rendering
            sprayData.dots.forEach(dot => {
              const pointIndex = Math.min(dot.pointIndex, pathPoints.length - 1);
              const pathPoint = pathPoints[pointIndex];
              
              if (pathPoint) {
                const dotX = pathPoint.x + dot.offsetX;
                const dotY = pathPoint.y + dot.offsetY;
                
                ctx.globalAlpha = dot.opacity * obj.opacity;
                ctx.fillStyle = obj.stroke;
                ctx.beginPath();
                ctx.arc(dotX, dotY, dot.size, 0, Math.PI * 2);
                ctx.fill();
              }
            });
          } else {
            // Generate spray effect on-the-fly for segments without cached data
            console.log('🎨 Generating spray effect for segment:', obj.id.slice(0, 8));
            
            const sprayRadius = strokeWidth * 0.8;
            const dotsPerPoint = Math.max(3, Math.floor(strokeWidth * 2));
            
            pathPoints.forEach((point, pointIndex) => {
              const seededRandom = createSeededRandom(obj.id.charCodeAt(0) + pointIndex * 1000);
              
              for (let i = 0; i < dotsPerPoint; i++) {
                const angle = seededRandom() * Math.PI * 2;
                const distance = seededRandom() * sprayRadius;
                const size = seededRandom() * (strokeWidth * 0.1) + 0.5;
                const distanceRatio = distance / sprayRadius;
                const dotOpacity = (1 - distanceRatio * 0.7) * obj.opacity;
                
                const dotX = point.x + Math.cos(angle) * distance;
                const dotY = point.y + Math.sin(angle) * distance;
                
                ctx.globalAlpha = dotOpacity;
                ctx.fillStyle = obj.stroke;
                ctx.beginPath();
                ctx.arc(dotX, dotY, size, 0, Math.PI * 2);
                ctx.fill();
              }
            });
          }
        } else if (brushType === 'chalk') {
          const cachedEffect = brushEffectCache.get(obj.id, brushType);
          
          if (cachedEffect && cachedEffect.effectData) {
            const chalkData = cachedEffect.effectData as ChalkEffectData;
            
            // Render cached chalk roughness layers
            chalkData.roughnessLayers.forEach(layer => {
              ctx.globalAlpha = layer.alpha * obj.opacity;
              ctx.strokeStyle = obj.stroke;
              ctx.lineWidth = strokeWidth * layer.width;
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';
              
              ctx.beginPath();
              pathPoints.forEach((point, index) => {
                const x = point.x + layer.offsetX;
                const y = point.y + layer.offsetY;
                
                if (index === 0) {
                  ctx.moveTo(x, y);
                } else {
                  ctx.lineTo(x, y);
                }
              });
              ctx.stroke();
            });
            
            // Render cached dust particles
            chalkData.dustParticles.forEach(particle => {
              const pointIndex = Math.min(particle.pointIndex, pathPoints.length - 1);
              const pathPoint = pathPoints[pointIndex];
              
              if (pathPoint) {
                const dustX = pathPoint.x + particle.offsetX;
                const dustY = pathPoint.y + particle.offsetY;
                
                ctx.globalAlpha = particle.opacity * obj.opacity;
                ctx.fillStyle = obj.stroke;
                ctx.beginPath();
                ctx.arc(dustX, dustY, particle.size, 0, Math.PI * 2);
                ctx.fill();
              }
            });
          } else {
            // Generate chalk effect on-the-fly for segments without cached data
            console.log('🎨 Generating chalk effect for segment:', obj.id.slice(0, 8));
            
            // Draw multiple roughness layers
            const roughnessLayers = [
              { offsetX: 0, offsetY: 0, alpha: 0.8, width: 1.0 },
              { offsetX: 0.5, offsetY: 0.3, alpha: 0.5, width: 0.9 },
              { offsetX: -0.3, offsetY: 0.6, alpha: 0.5, width: 0.8 },
              { offsetX: 0.6, offsetY: -0.4, alpha: 0.4, width: 0.9 },
            ];
            
            roughnessLayers.forEach(layer => {
              ctx.globalAlpha = layer.alpha * obj.opacity;
              ctx.strokeStyle = obj.stroke;
              ctx.lineWidth = strokeWidth * layer.width;
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';
              
              ctx.beginPath();
              pathPoints.forEach((point, index) => {
                const x = point.x + layer.offsetX;
                const y = point.y + layer.offsetY;
                
                if (index === 0) {
                  ctx.moveTo(x, y);
                } else {
                  ctx.lineTo(x, y);
                }
              });
              ctx.stroke();
            });
            
            // Add dust particles
            pathPoints.forEach((point, pointIndex) => {
              const seededRandom = createSeededRandom(obj.id.charCodeAt(0) + pointIndex * 1000);
              const dustCount = Math.max(3, Math.floor(strokeWidth * 1.2));
              
              for (let i = 0; i < dustCount; i++) {
                const angle = seededRandom() * Math.PI * 2;
                const distance = seededRandom() * strokeWidth * 0.6;
                const size = seededRandom() * (strokeWidth * 0.15) + 0.5;
                
                const dustX = point.x + Math.cos(angle) * distance;
                const dustY = point.y + Math.sin(angle) * distance;
                
                ctx.globalAlpha = 0.3 * obj.opacity;
                ctx.fillStyle = obj.stroke;
                ctx.beginPath();
                ctx.arc(dustX, dustY, size, 0, Math.PI * 2);
                ctx.fill();
              }
            });
          }
        } else {
          // Regular paintbrush rendering
          ctx.globalAlpha = obj.opacity;
          ctx.strokeStyle = obj.stroke;
          ctx.lineWidth = strokeWidth;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          
          ctx.beginPath();
          pathPoints.forEach((point, index) => {
            if (index === 0) {
              ctx.moveTo(point.x, point.y);
            } else {
              ctx.lineTo(point.x, point.y);
            }
          });
          ctx.stroke();
        }
      } else if (obj.type === 'rectangle') {
        ctx.globalAlpha = obj.opacity || 1;
        ctx.fillStyle = obj.fill || 'transparent';
        ctx.strokeStyle = obj.stroke || 'black';
        ctx.lineWidth = obj.strokeWidth || 1;
        ctx.fillRect(obj.x, obj.y, obj.width || 0, obj.height || 0);
        ctx.strokeRect(obj.x, obj.y, obj.width || 0, obj.height || 0);
      } else if (obj.type === 'circle') {
        ctx.globalAlpha = obj.opacity || 1;
        ctx.fillStyle = obj.fill || 'transparent';
        ctx.strokeStyle = obj.stroke || 'black';
        ctx.lineWidth = obj.strokeWidth || 1;

        const radius = Math.min(obj.width || 0, obj.height || 0) / 2;
        const centerX = obj.x + (obj.width || 0) / 2;
        const centerY = obj.y + (obj.height || 0) / 2;

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      } else if (obj.type === 'ellipse') {
        ctx.globalAlpha = obj.opacity || 1;
        ctx.fillStyle = obj.fill || 'transparent';
        ctx.strokeStyle = obj.stroke || 'black';
        ctx.lineWidth = obj.strokeWidth || 1;

        const centerX = obj.x + (obj.width || 0) / 2;
        const centerY = obj.y + (obj.height || 0) / 2;
        const radiusX = (obj.width || 0) / 2;
        const radiusY = (obj.height || 0) / 2;

        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      } else if (obj.type === 'line') {
        ctx.globalAlpha = obj.opacity || 1;
        ctx.strokeStyle = obj.stroke || 'black';
        ctx.lineWidth = obj.strokeWidth || 1;

        ctx.beginPath();
        ctx.moveTo(obj.x, obj.y);
        ctx.lineTo(obj.width || 0, obj.height || 0);
        ctx.stroke();
      } else if (obj.type === 'triangle') {
        ctx.globalAlpha = obj.opacity || 1;
        ctx.fillStyle = obj.fill || 'transparent';
        ctx.strokeStyle = obj.stroke || 'black';
        ctx.lineWidth = obj.strokeWidth || 1;

        ctx.beginPath();
        ctx.moveTo(obj.x + (obj.width || 0) / 2, obj.y);
        ctx.lineTo(obj.x, obj.y + (obj.height || 0));
        ctx.lineTo(obj.x + (obj.width || 0), obj.y + (obj.height || 0));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (obj.type === 'diamond') {
        ctx.globalAlpha = obj.opacity || 1;
        ctx.fillStyle = obj.fill || 'transparent';
        ctx.strokeStyle = obj.stroke || 'black';
        ctx.lineWidth = obj.strokeWidth || 1;

        ctx.beginPath();
        ctx.moveTo(obj.x + (obj.width || 0) / 2, obj.y);
        ctx.lineTo(obj.x + (obj.width || 0), obj.y + (obj.height || 0) / 2);
        ctx.lineTo(obj.x + (obj.width || 0) / 2, obj.y + (obj.height || 0));
        ctx.lineTo(obj.x, obj.y + (obj.height || 0) / 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (obj.type === 'pentagon') {
        ctx.globalAlpha = obj.opacity || 1;
        ctx.fillStyle = obj.fill || 'transparent';
        ctx.strokeStyle = obj.stroke || 'black';
        ctx.lineWidth = obj.strokeWidth || 1;

        const centerX = obj.x + (obj.width || 0) / 2;
        const centerY = obj.y + (obj.height || 0) / 2;
        const radius = Math.min(obj.width || 0, obj.height || 0) / 2;

        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const angle = (Math.PI / 2 + i * (2 * Math.PI / 5));
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (obj.type === 'hexagon') {
        ctx.globalAlpha = obj.opacity || 1;
        ctx.fillStyle = obj.fill || 'transparent';
        ctx.strokeStyle = obj.stroke || 'black';
        ctx.lineWidth = obj.strokeWidth || 1;

        const centerX = obj.x + (obj.width || 0) / 2;
        const centerY = obj.y + (obj.height || 0) / 2;
        const radius = Math.min(obj.width || 0, obj.height || 0) / 2;

        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 2 + i * (2 * Math.PI / 6));
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (obj.type === 'star') {
        ctx.globalAlpha = obj.opacity || 1;
        ctx.fillStyle = obj.fill || 'transparent';
        ctx.strokeStyle = obj.stroke || 'black';
        ctx.lineWidth = obj.strokeWidth || 1;

        const centerX = obj.x + (obj.width || 0) / 2;
        const centerY = obj.y + (obj.height || 0) / 2;
        const outerRadius = Math.min(obj.width || 0, obj.height || 0) / 2;
        const innerRadius = outerRadius / 2.5;

        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const angle = (Math.PI * 1.5 + i * (Math.PI / 5));
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (obj.type === 'heart') {
        ctx.globalAlpha = obj.opacity || 1;
        ctx.fillStyle = obj.fill || 'transparent';
        ctx.strokeStyle = obj.stroke || 'black';
        ctx.lineWidth = obj.strokeWidth || 1;

        const centerX = obj.x + (obj.width || 0) / 2;
        const centerY = obj.y + (obj.height || 0) / 2;
        const width = obj.width || 0;
        const height = obj.height || 0;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY + height / 4);
        ctx.bezierCurveTo(
          centerX, centerY - height / 2,
          centerX + width / 2, centerY - height / 2,
          centerX + width / 2, centerY + height / 4
        );
        ctx.bezierCurveTo(
          centerX + width / 2, centerY + height / 2,
          centerX, centerY + height * 3 / 4,
          centerX, centerY + height / 4
        );
        ctx.moveTo(centerX, centerY + height / 4);
        ctx.bezierCurveTo(
          centerX, centerY - height / 2,
          centerX - width / 2, centerY - height / 2,
          centerX - width / 2, centerY + height / 4
        );
        ctx.bezierCurveTo(
          centerX - width / 2, centerY + height / 2,
          centerX, centerY + height * 3 / 4,
          centerX, centerY + height / 4
        );
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (obj.type === 'text') {
        ctx.globalAlpha = obj.opacity || 1;
        ctx.fillStyle = obj.fill || 'black';
        ctx.font = `${obj.data.textBold ? 'bold ' : ''}${obj.data.textItalic ? 'italic ' : ''}${obj.data.fontSize}px ${obj.data.fontFamily}`;
        ctx.textAlign = obj.data.textAlign as CanvasTextAlign || 'left';
        ctx.textBaseline = 'top';

        const textX = obj.x;
        const textY = obj.y;

        ctx.fillText(obj.data.content, textX, textY);

        if (obj.data.underline) {
          const textWidth = ctx.measureText(obj.data.content).width;
          const underlineOffset = obj.data.fontSize / 10; // Adjust as needed
          const underlineY = textY + obj.data.fontSize + underlineOffset;

          ctx.beginPath();
          ctx.strokeStyle = obj.fill || 'black';
          ctx.lineWidth = 1; // Adjust as needed
          ctx.moveTo(textX, underlineY);
          ctx.lineTo(textX + textWidth, underlineY);
          ctx.stroke();
        }
      } else if (obj.type === 'image') {
        const img = new Image();
        img.src = obj.data.src;
        img.onload = () => {
          ctx.globalAlpha = obj.opacity || 1;
          ctx.drawImage(img, obj.x, obj.y, obj.width, obj.height);
        };
        if (img.complete) {
          ctx.globalAlpha = obj.opacity || 1;
          ctx.drawImage(img, obj.x, obj.y, obj.width, obj.height);
        }
      }
    });
  }, [whiteboardStore.objects, whiteboardStore.settings]);

  return {
    canvasRef,
    backgroundCanvasRef,
    redrawCanvas,
  };
};
