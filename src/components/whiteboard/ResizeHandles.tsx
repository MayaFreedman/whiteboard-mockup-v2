
import React from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { RotateCw } from 'lucide-react';

interface ResizeHandlesProps {
  objectId: string;
  onResize: (objectId: string, newBounds: { x: number; y: number; width: number; height: number }) => void;
}

export const ResizeHandles: React.FC<ResizeHandlesProps> = ({ objectId, onResize }) => {
  const { objects, updateObject } = useWhiteboardStore();
  const obj = objects[objectId];
  
  if (!obj || !obj.width || !obj.height) return null;

  const handleSize = 8;
  const rotation = obj.rotation || 0;

  // Calculate rotation handle position (top-right corner with offset)
  const rotationHandleDistance = 30;
  const centerX = obj.x + obj.width / 2;
  const centerY = obj.y + obj.height / 2;
  const rotationHandleX = obj.x + obj.width + rotationHandleDistance;
  const rotationHandleY = obj.y;

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

  const handleRotationMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    const startRotation = rotation;
    
    const handleMouseMove = (e: MouseEvent) => {
      const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      const deltaAngle = currentAngle - startAngle;
      const newRotation = (startRotation + (deltaAngle * 180 / Math.PI)) % 360;
      
      updateObject(objectId, { rotation: newRotation });
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
          zIndex: 1000,
          transformOrigin: `${obj.width / 2 + 2}px ${obj.height / 2 + 2}px`,
          transform: `rotate(${rotation}deg)`
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
      
      {/* Rotation handle */}
      <div
        style={{
          position: 'absolute',
          left: rotationHandleX - handleSize/2,
          top: rotationHandleY - handleSize/2,
          width: handleSize + 4,
          height: handleSize + 4,
          backgroundColor: '#00cc88',
          border: '2px solid #fff',
          borderRadius: '50%',
          cursor: 'grab',
          zIndex: 1001,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onMouseDown={handleRotationMouseDown}
        title="Rotate object"
      >
        <RotateCw size={8} color="white" />
      </div>
      
      {/* Connection line from object to rotation handle */}
      <div
        style={{
          position: 'absolute',
          left: obj.x + obj.width,
          top: obj.y + obj.height / 2,
          width: rotationHandleDistance,
          height: 1,
          backgroundColor: '#007acc',
          zIndex: 999,
          transformOrigin: '0 50%',
          transform: `rotate(${Math.atan2(rotationHandleY - (obj.y + obj.height / 2), rotationHandleX - (obj.x + obj.width)) * 180 / Math.PI}deg)`
        }}
      />
    </>
  );
};
