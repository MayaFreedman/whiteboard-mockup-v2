
import React from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useUser } from '../../contexts/UserContext';

interface RotationHandleProps {
  objectId: string;
  onRotate: (objectId: string, rotation: number) => void;
}

export const RotationHandle: React.FC<RotationHandleProps> = ({ objectId, onRotate }) => {
  const { objects } = useWhiteboardStore();
  const { userId } = useUser();
  const obj = objects[objectId];
  
  if (!obj || !obj.width || !obj.height || obj.type !== 'image') return null;

  const handleSize = 8;
  const handleDistance = 30; // Distance from the object edge
  
  // Calculate rotation handle position (above the object)
  const centerX = obj.x + obj.width / 2;
  const rotationHandleX = centerX - handleSize / 2;
  const rotationHandleY = obj.y - handleDistance - handleSize / 2;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const centerX = obj.x + obj.width / 2;
    const centerY = obj.y + obj.height / 2;
    const currentRotation = obj.rotation || 0;
    
    const handleMouseMove = (e: MouseEvent) => {
      // Calculate angle from center to mouse position
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      
      // Get canvas element to calculate proper coordinates
      const canvas = document.querySelector('canvas');
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const canvasX = mouseX - rect.left;
      const canvasY = mouseY - rect.top;
      
      // Calculate angle from center of object to mouse
      const deltaX = canvasX - centerX;
      const deltaY = canvasY - centerY;
      const angle = Math.atan2(deltaY, deltaX);
      
      // Convert from radians to degrees and normalize to 0-360
      let degrees = (angle * 180 / Math.PI) + 90; // +90 to make 0° point up
      if (degrees < 0) degrees += 360;
      
      // Snap to 15-degree increments when Shift is held
      if (e.shiftKey) {
        degrees = Math.round(degrees / 15) * 15;
      }
      
      onRotate(objectId, degrees);
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
      {/* Connection line from object to rotation handle */}
      <div
        style={{
          position: 'absolute',
          left: centerX - 1,
          top: obj.y - handleDistance,
          width: 2,
          height: handleDistance,
          backgroundColor: '#007acc',
          pointerEvents: 'none',
          zIndex: 1000
        }}
      />
      
      {/* Rotation handle */}
      <div
        style={{
          position: 'absolute',
          left: rotationHandleX,
          top: rotationHandleY,
          width: handleSize,
          height: handleSize,
          backgroundColor: '#007acc',
          border: '1px solid #fff',
          borderRadius: '50%',
          cursor: 'grab',
          zIndex: 1001
        }}
        onMouseDown={handleMouseDown}
        title="Drag to rotate (hold Shift for 15° increments)"
      >
        {/* Rotation icon inside the handle */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '8px',
            color: 'white',
            pointerEvents: 'none'
          }}
        >
          ↻
        </div>
      </div>
    </>
  );
};
