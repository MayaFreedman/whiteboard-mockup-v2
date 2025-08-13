
import { useCallback } from 'react';
import { useCanvasOffset } from '../useCanvasOffset';

/**
 * Hook for handling canvas coordinate transformations
 */
export const useCanvasCoordinates = () => {
  const { canvasOffset } = useCanvasOffset();

  /**
   * Converts screen coordinates to canvas coordinates accounting for canvas offset
   */
  const getCanvasCoordinates = useCallback((event: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    
    // Convert to canvas coordinates and subtract canvas offset
    return {
      x: clientX - rect.left - canvasOffset.x,
      y: clientY - rect.top - canvasOffset.y
    };
  }, [canvasOffset]);

  return {
    getCanvasCoordinates
  };
};
