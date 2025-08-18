
import React, { useEffect, useState, useRef } from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useCanvasOffset } from '../../hooks/useCanvasOffset';

interface ResizeHandlesProps {
  objectId: string;
  getLiveDragPositions?: () => Record<string, { x: number; y: number }>;
  onResize: (objectId: string, newBounds: { x: number; y: number; width: number; height: number }) => void;
  onResizeStart?: (objectId: string) => void;
  onResizeEnd?: (objectId: string) => void;
}

export const ResizeHandles: React.FC<ResizeHandlesProps> = ({ objectId, getLiveDragPositions, onResize, onResizeStart, onResizeEnd }) => {
  const { objects } = useWhiteboardStore();
  const { canvasOffset } = useCanvasOffset();
  const [, forceUpdate] = useState({});
  
  // Force re-render when live drag positions might change
  useEffect(() => {
    if (!getLiveDragPositions) return;
    
    const checkForLiveDrag = () => {
      const liveDragPositions = getLiveDragPositions();
      if (Object.keys(liveDragPositions).length > 0) {
        forceUpdate({});
      }
    };
    
    // Check immediately and continuously during potential drag
    const intervalId = setInterval(checkForLiveDrag, 16); // ~60fps
    
    return () => clearInterval(intervalId);
  }, [getLiveDragPositions]);
  
  let obj = objects[objectId];
  
  // Hide resize handles while object is being dragged
  if (getLiveDragPositions) {
    const liveDragPositions = getLiveDragPositions();
    const liveDragKeys = Object.keys(liveDragPositions);
    
    // Add safety check for stuck drag states (zombie drags)
    if (liveDragKeys.length > 0) {
      // Check if this appears to be a stuck state by looking for very old drag data
      const hasSuspiciouslyLongDrag = liveDragKeys.some(id => {
        // If we're repeatedly rendering the same drag position, it might be stuck
        return true; // For now, we'll trust the live drag positions are valid
      });
      
      console.log("🔍 ResizeHandles debug:", {
        objectId: objectId.slice(0, 8),
        fullObjectId: objectId,
        liveDragKeys: liveDragKeys.map(id => id.slice(0, 8)),
        fullLiveDragKeys: liveDragKeys,
        hasThisObject: !!liveDragPositions[objectId],
        position: liveDragPositions[objectId]
      });
    }
    
    if (liveDragPositions[objectId]) {
      console.log("🚫 Hiding resize handles during drag for:", objectId.slice(0, 8));
      return null; // Don't render handles during drag
    }
  } else {
    console.log("🔍 ResizeHandles: No getLiveDragPositions function");
  }
  
  // Apply live drag position if object is being dragged
  const originalPosition = { x: obj?.x, y: obj?.y };
  if (getLiveDragPositions) {
    const liveDragPositions = getLiveDragPositions();
    console.log("🔄 ResizeHandles - Live drag positions:", Object.keys(liveDragPositions).length, "objects");
    
    if (liveDragPositions[objectId]) {
      console.log("🔄 ResizeHandles - Applying live position:", liveDragPositions[objectId], "Original:", originalPosition);
      obj = {
        ...obj,
        x: liveDragPositions[objectId].x,
        y: liveDragPositions[objectId].y,
      };
    }
  }
  
  if (!obj || !obj.width || !obj.height) return null;

  const handleSize = 8;
  const handles = [
    { id: 'nw', x: obj.x + canvasOffset.x - handleSize/2, y: obj.y + canvasOffset.y - handleSize/2, cursor: 'nw-resize' },
    { id: 'n', x: obj.x + canvasOffset.x + obj.width/2 - handleSize/2, y: obj.y + canvasOffset.y - handleSize/2, cursor: 'n-resize' },
    { id: 'ne', x: obj.x + canvasOffset.x + obj.width - handleSize/2, y: obj.y + canvasOffset.y - handleSize/2, cursor: 'ne-resize' },
    { id: 'e', x: obj.x + canvasOffset.x + obj.width - handleSize/2, y: obj.y + canvasOffset.y + obj.height/2 - handleSize/2, cursor: 'e-resize' },
    { id: 'se', x: obj.x + canvasOffset.x + obj.width - handleSize/2, y: obj.y + canvasOffset.y + obj.height - handleSize/2, cursor: 'se-resize' },
    { id: 's', x: obj.x + canvasOffset.x + obj.width/2 - handleSize/2, y: obj.y + canvasOffset.y + obj.height - handleSize/2, cursor: 's-resize' },
    { id: 'sw', x: obj.x + canvasOffset.x - handleSize/2, y: obj.y + canvasOffset.y + obj.height - handleSize/2, cursor: 'sw-resize' },
    { id: 'w', x: obj.x + canvasOffset.x - handleSize/2, y: obj.y + canvasOffset.y + obj.height/2 - handleSize/2, cursor: 'w-resize' },
  ];

  const handleMouseDown = (e: React.MouseEvent, handleId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    onResizeStart?.(objectId);
    
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
      
      // Maximum size constraints for stamps (600px limit)
      if (newBounds.width > 600) {
        if (handleId.includes('w')) {
          newBounds.x = startBounds.x + startBounds.width - 600;
        }
        newBounds.width = 600;
      }
      if (newBounds.height > 600) {
        if (handleId.includes('n')) {
          newBounds.y = startBounds.y + startBounds.height - 600;
        }
        newBounds.height = 600;
      }
      
      console.log('🔄 Manual resize:', { objectId, handleId, newBounds, oldBounds: startBounds });
      onResize(objectId, newBounds);
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      onResizeEnd?.(objectId);
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
          left: obj.x + canvasOffset.x - 2,
          top: obj.y + canvasOffset.y - 2,
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
