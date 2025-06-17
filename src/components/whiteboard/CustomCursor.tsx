
import React, { useEffect, useState } from 'react';
import { useToolStore } from '../../stores/toolStore';

interface CustomCursorProps {
  canvas: HTMLCanvasElement | null;
}

/**
 * Custom cursor component that shows a circle preview for drawing and erasing tools
 */
export const CustomCursor: React.FC<CustomCursorProps> = ({ canvas }) => {
  const { activeTool, toolSettings } = useToolStore();
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);

  // Tools that should show the custom cursor
  const toolsWithCustomCursor = ['pencil', 'brush', 'eraser'];
  const shouldShowCursor = toolsWithCustomCursor.includes(activeTool);

  // Get the appropriate size for the cursor
  const getCursorSize = () => {
    switch (activeTool) {
      case 'pencil':
      case 'brush':
        return toolSettings.strokeWidth * 2; // Make it a bit more visible
      case 'eraser':
        return toolSettings.eraserSize;
      default:
        return 20;
    }
  };

  useEffect(() => {
    if (!canvas || !shouldShowCursor) {
      setIsVisible(false);
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      // Check if cursor is within canvas bounds
      const isInBounds = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height;
      
      setCursorPosition({ x: event.clientX, y: event.clientY });
      setIsVisible(isInBounds);
    };

    const handleMouseEnter = () => {
      setIsVisible(true);
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseenter', handleMouseEnter);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseenter', handleMouseEnter);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [canvas, shouldShowCursor]);

  if (!shouldShowCursor || !isVisible) {
    return null;
  }

  const size = getCursorSize();

  return (
    <div
      className="fixed pointer-events-none z-50"
      style={{
        left: cursorPosition.x - size / 2,
        top: cursorPosition.y - size / 2,
        width: size,
        height: size,
        borderRadius: '50%',
        border: '1px solid #6b7280',
        backgroundColor: 'transparent',
        transform: 'translate(0, 0)', // Prevent sub-pixel rendering issues
      }}
    />
  );
};
