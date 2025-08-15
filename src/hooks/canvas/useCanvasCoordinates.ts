
import { useCallback } from 'react';

/**
 * Hook for handling canvas coordinate transformations
 */
export const useCanvasCoordinates = () => {

  /**
   * Converts screen coordinates to canvas coordinates
   */
  const getCanvasCoordinates = useCallback((event: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    // Find the whiteboard container instead of just using canvas rect
    const whiteboardContainer = canvas.closest('.absolute.bg-background') as HTMLElement;
    const rect = whiteboardContainer ? whiteboardContainer.getBoundingClientRect() : canvas.getBoundingClientRect();
    
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    
    // Debug coordinate issues that might cause drag glitches
    if (isNaN(clientX) || isNaN(clientY) || !isFinite(clientX) || !isFinite(clientY)) {
      console.error('🚨 INVALID CLIENT COORDINATES:', { clientX, clientY, event });
      return { x: 0, y: 0 };
    }
    
    if (!rect || rect.width === 0 || rect.height === 0) {
      console.error('🚨 INVALID CANVAS RECT:', { rect, canvas, whiteboardContainer });
      return { x: 0, y: 0 };
    }
    
    // Convert to canvas coordinates
    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;
    
    // Check for extreme coordinate values that might indicate issues
    if (Math.abs(canvasX) > 10000 || Math.abs(canvasY) > 10000) {
      console.warn('🚨 EXTREME COORDINATES DETECTED:', {
        clientX, clientY, rect, canvasX, canvasY
      });
    }
    
    return {
      x: canvasX,
      y: canvasY
    };
  }, []);

  return {
    getCanvasCoordinates
  };
};
