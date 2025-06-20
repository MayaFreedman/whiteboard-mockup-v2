import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useCanvasInteractions } from '../../hooks/canvas/useCanvasInteractions';
import { useCanvasRendering } from '../../hooks/useCanvasRendering';
import { useCanvasCoordinates } from '../../hooks/canvas/useCanvasCoordinates';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useUser } from '../../contexts/UserContext';
import { CustomCursor } from './CustomCursor';
import { ResizeHandles } from './ResizeHandles';

export const Canvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);
  const whiteboardStore = useWhiteboardStore();
  const { userId } = useUser();
  
  const {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleMouseLeave,
    setRedrawCanvas
  } = useCanvasInteractions();
  
  const { redrawCanvas } = useCanvasRendering(canvasRef);

  // Set up the redraw function
  useEffect(() => {
    setRedrawCanvas(redrawCanvas);
  }, [redrawCanvas, setRedrawCanvas]);

  // Initialize canvas dimensions and force initial render
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    
    if (!canvas || !container) return;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      // Set actual size in memory (scaled to account for pixel ratio)
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      // Scale the canvas back down using CSS
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      
      // Scale the drawing context so everything draws at the correct size
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
      
      console.log('🎨 Canvas initialized with DPR scaling:', {
        displaySize: `${rect.width}x${rect.height}`,
        actualSize: `${canvas.width}x${canvas.height}`,
        dpr,
        objectCount: Object.keys(whiteboardStore.objects).length
      });
      
      // Force immediate redraw
      setTimeout(() => redrawCanvas(), 0);
    };

    // Initial resize
    resizeCanvas();

    // Handle window resize
    const handleResize = () => {
      resizeCanvas();
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [redrawCanvas, whiteboardStore.objects]);

  // Add debugging for when objects change
  useEffect(() => {
    const objectIds = Object.keys(whiteboardStore.objects);
    console.log('🔄 Objects changed, triggering redraw:', {
      count: objectIds.length,
      ids: objectIds.map(id => id.slice(0, 8))
    });
    redrawCanvas();
  }, [whiteboardStore.objects, redrawCanvas]);

  // Handle keyboard events for text editing
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle typing if we have a single text object selected
      if (whiteboardStore.selectedObjectIds.length !== 1) return;
      
      const selectedId = whiteboardStore.selectedObjectIds[0];
      const selectedObject = whiteboardStore.objects[selectedId];
      
      if (!selectedObject || selectedObject.type !== 'text') return;

      // Ignore modifier keys, function keys, etc.
      if (event.ctrlKey || event.metaKey || event.altKey || 
          event.key.length > 1 && !['Backspace', 'Delete', 'Enter', 'Space'].includes(event.key)) {
        return;
      }

      event.preventDefault();
      
      const currentContent = selectedObject.data?.content || '';
      let newContent = currentContent;

      if (event.key === 'Backspace') {
        newContent = currentContent.slice(0, -1);
      } else if (event.key === 'Delete') {
        newContent = '';
      } else if (event.key === 'Enter') {
        newContent = currentContent + '\n';
      } else if (event.key === ' ') {
        newContent = currentContent + ' ';
      } else if (event.key.length === 1) {
        // If we're starting to type and the content is still the placeholder, replace it
        if (currentContent === 'Double-click to edit' || !isTyping) {
          newContent = event.key;
          setIsTyping(true);
        } else {
          newContent = currentContent + event.key;
        }
      }

      // Update the text object
      whiteboardStore.updateObject(selectedId, {
        data: {
          ...selectedObject.data,
          content: newContent
        }
      }, userId);
    };

    // Add event listener to document for global key handling
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [whiteboardStore.selectedObjectIds, whiteboardStore.objects, whiteboardStore, userId, isTyping]);

  // Reset typing state when selection changes
  useEffect(() => {
    if (whiteboardStore.selectedObjectIds.length !== 1) {
      setIsTyping(false);
    }
  }, [whiteboardStore.selectedObjectIds]);

  // Mouse event handlers with debugging
  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    console.log('🖱️ Mouse down on canvas');
    handlePointerDown(event.nativeEvent, canvasRef.current);
  }, [handlePointerDown]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    handlePointerMove(event.nativeEvent, canvasRef.current);
  }, [handlePointerMove]);

  const handleMouseUp = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    console.log('🖱️ Mouse up on canvas');
    handlePointerUp(event.nativeEvent, canvasRef.current);
  }, [handlePointerUp]);

  // Touch event handlers
  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    event.preventDefault();
    console.log('👆 Touch start on canvas');
    handlePointerDown(event.nativeEvent, canvasRef.current);
  }, [handlePointerDown]);

  const handleTouchMove = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    event.preventDefault();
    handlePointerMove(event.nativeEvent, canvasRef.current);
  }, [handlePointerMove]);

  const handleTouchEnd = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    event.preventDefault();
    console.log('👆 Touch end on canvas');
    handlePointerUp(event.nativeEvent, canvasRef.current);
  }, [handlePointerUp]);

  // Focus management for keyboard events
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Make container focusable and focus it
    container.setAttribute('tabindex', '0');
    container.focus();

    const handleFocus = () => {
      container.focus();
    };

    container.addEventListener('click', handleFocus);
    
    return () => {
      container.removeEventListener('click', handleFocus);
    };
  }, []);

  // Handle resize for selected objects
  const handleResize = useCallback((objectId: string, newBounds: { x: number; y: number; width: number; height: number }) => {
    console.log('📏 Resizing object:', objectId.slice(0, 8), newBounds);
    whiteboardStore.updateObject(objectId, newBounds, userId);
  }, [whiteboardStore, userId]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-white focus:outline-none"
      style={{ cursor: 'none' }}
      tabIndex={0}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
      
      <CustomCursor canvas={canvasRef.current} />
      {whiteboardStore.selectedObjectIds.map(objectId => (
        <ResizeHandles 
          key={objectId}
          objectId={objectId} 
          onResize={handleResize}
        />
      ))}
    </div>
  );
};
