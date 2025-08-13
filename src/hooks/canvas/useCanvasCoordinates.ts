
import { useCallback } from 'react';

/**
 * Hook for handling canvas coordinate transformations
 */
export const useCanvasCoordinates = () => {

  /**
   * Converts screen coordinates to canvas coordinates
   */
  const getCanvasCoordinates = useCallback((event: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    
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
