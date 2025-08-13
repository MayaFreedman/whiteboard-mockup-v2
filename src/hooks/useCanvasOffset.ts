import { useCallback, useMemo } from 'react';
import { useScreenSizeStore } from '../stores/screenSizeStore';

/**
 * Hook to calculate canvas offset when whiteboard is centered in container
 * This accounts for the difference between canvas position and object coordinates
 */
export const useCanvasOffset = () => {
  const { activeWhiteboardSize } = useScreenSizeStore();

  const getCanvasOffset = useCallback((containerElement?: HTMLElement | null) => {
    if (!containerElement) return { x: 0, y: 0 };

    const containerRect = containerElement.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;

    // Calculate centered position offset
    const offsetX = Math.max(0, (containerWidth - activeWhiteboardSize.width) / 2);
    const offsetY = Math.max(0, (containerHeight - activeWhiteboardSize.height) / 2);

    return { x: offsetX, y: offsetY };
  }, [activeWhiteboardSize.width, activeWhiteboardSize.height]);

  // Memoized offset for static containers
  const canvasOffset = useMemo(() => {
    // Default to viewport dimensions if no specific container
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight - 60; // Account for toolbar

    const offsetX = Math.max(0, (viewportWidth - activeWhiteboardSize.width) / 2);
    const offsetY = Math.max(0, (viewportHeight - activeWhiteboardSize.height) / 2);

    return { x: offsetX, y: offsetY };
  }, [activeWhiteboardSize.width, activeWhiteboardSize.height]);

  return {
    getCanvasOffset,
    canvasOffset
  };
};