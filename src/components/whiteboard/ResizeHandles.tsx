
import React from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';

interface ResizeHandlesProps {
  objectId: string;
  onResize: (objectId: string, newBounds: { x: number; y: number; width: number; height: number }) => void;
}

export const ResizeHandles: React.FC<ResizeHandlesProps> = ({ objectId, onResize }) => {
  const { objects } = useWhiteboardStore();
  const obj = objects[objectId];
  
  if (!obj || !obj.width || !obj.height) return null;

  const handleSize = 8;
  const handles = [
    { id: 'nw', x: obj.x - handleSize/2, y: obj.y - handleSize/2, cursor: 'nw-resize' },
    { id: 'n', x: obj.x + obj.width/2 - handleSize/2, y: obj.y - handleSize/2, cursor: 'n-resize' },
    { id: 'ne', x: obj.x + obj.width - handleSize/2, y: obj.y - handleSize/2, cursor: 'ne-resize' },
    { id: 'e', x: obj.x + obj.width - handleSize/2, y: obj.y + obj.height/2 - handleSize/2, cursor: 'e-resize' },
    { id: 'se', x: obj.x + obj.width - handleSize/2, y: obj.y + obj.height - handleSize/2, cursor: 'se-resize' },
    { id: 's', x: obj.x + obj.width/2 - handleSize/2, y: obj.y + obj.height - handleSize/2, cursor: 's-resize' },
    { id: 'sw', x: obj.x - handleSize/2, y: obj.y + obj.height - handleSize/2, cursor: 'sw-resize' },
    { id: 'w', x: obj.x - handleSize/2, y: obj.y + obj.height/2 - handleSize/2, cursor: 'w-resize' },
  ];

  const handleMouseDown = (e: React.MouseEvent, handleId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startBounds = { x: obj.x, y: obj.y, width: obj.width, height: obj.height };
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      let newBounds = { ...startBounds };
      
      switch (handleId) {
        case 'nw':
          newBounds.x = startBounds.x + deltaX;
          newBounds.y = startBounds.y + deltaY;
          newBounds.width = startBounds.width - deltaX;
          newBounds.height = startBounds.height - deltaY;
          break;
        case 'n':
          newBounds.y = startBounds.y + deltaY;
          newBounds.height = startBounds.height - deltaY;
          break;
        case 'ne':
          newBounds.y = startBounds.y + deltaY;
          newBounds.width = startBounds.width + deltaX;
          newBounds.height = startBounds.height - deltaY;
          break;
        case 'e':
          newBounds.width = startBounds.width + deltaX;
          break;
        case 'se':
          newBounds.width = startBounds.width + deltaX;
          newBounds.height = startBounds.height + deltaY;
          break;
        case 's':
          newBounds.height = startBounds.height + deltaY;
          break;
        case 'sw':
          newBounds.x = startBounds.x + deltaX;
          newBounds.width = startBounds.width - deltaX;
          newBounds.height = startBounds.height + deltaY;
          break;
        case 'w':
          newBounds.x = startBounds.x + deltaX;
          newBounds.width = startBounds.width - deltaX;
          break;
      }
      
      // Minimum size constraints
      if (newBounds.width < 10) {
        if (handleId.includes('w')) {
          newBounds.x = startBounds.x + startBounds.width - 10;
        }
        newBounds.width = 10;
      }
      if (newBounds.height < 10) {
        if (handleId.includes('n')) {
          newBounds.y = startBounds.y + startBounds.height - 10;
        }
        newBounds.height = 10;
      }
      
      onResize(objectId, newBounds);
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <>
      {/* Selection outline */}
      <div
        style={{
          position: 'absolute',
          left: obj.x - 2,
          top: obj.y - 2,
          width: obj.width + 4,
          height: obj.height + 4,
          border: '2px dashed #007acc',
          pointerEvents: 'none',
          zIndex: 1000
        }}
      />
      
      {/* Resize handles */}
      {handles.map(handle => (
        <div
          key={handle.id}
          style={{
            position: 'absolute',
            left: handle.x,
            top: handle.y,
            width: handleSize,
            height: handleSize,
            backgroundColor: '#007acc',
            border: '1px solid #fff',
            cursor: handle.cursor,
            zIndex: 1001
          }}
          onMouseDown={(e) => handleMouseDown(e, handle.id)}
        />
      ))}
    </>
  );
};
