
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
    
    console.log('🎯 Coordinate conversion:', {
      clientX,
      clientY,
      rectLeft: rect.left,
      rectTop: rect.top,
      usingWhiteboard: !!whiteboardContainer
    });
    
    // Convert to canvas coordinates
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }, []);

  return {
    getCanvasCoordinates
  };
};
