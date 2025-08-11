
import React, { useEffect, useState } from 'react';
import { useToolStore } from '../../stores/toolStore';
import { Droplet } from 'lucide-react';

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
  const toolsWithCustomCursor = ['pencil', 'brush', 'eraser', 'fill'];
  const shouldShowCursor = toolsWithCustomCursor.includes(activeTool);

  // Get the appropriate size for the cursor
  const getCursorSize = () => {
    switch (activeTool) {
      case 'pencil':
        return (toolSettings.pencilSize || 4) * 2; // Make it a bit more visible
      case 'brush':
        return (toolSettings.brushSize || 8) * 2; // Make it a bit more visible
      case 'eraser':
        return toolSettings.eraserSize; // Use the full size (diameter), not radius
      case 'fill':
        return 24; // Fixed size for fill tool
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

  // Render water droplet for fill tool
  if (activeTool === 'fill') {
    return (
      <div
        className="fixed pointer-events-none z-50 flex items-center justify-center"
        style={{
          left: cursorPosition.x - size / 2,
          top: cursorPosition.y - size / 2,
          width: size,
          height: size,
        }}
      >
        <Droplet 
          size={size * 0.8} 
          className="text-black"
          fill="currentColor"
        />
      </div>
    );
  }

  // Render circle for other tools
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
