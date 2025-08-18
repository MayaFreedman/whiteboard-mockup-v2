import React from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { getObjectBoundingBox } from '../../utils/boundaryConstraints';

interface BoundingBoxDebugProps {
  liveDragPositions: Record<string, { x: number; y: number }>;
  selectedObjectIds: string[];
  enabled?: boolean;
}

export const BoundingBoxDebug: React.FC<BoundingBoxDebugProps> = ({
  liveDragPositions,
  selectedObjectIds,
  enabled = true
}) => {
  const { objects } = useWhiteboardStore();

  if (!enabled) return null;

  const selectedObjects = selectedObjectIds
    .map(id => ({ id, obj: objects[id] }))
    .filter(({ obj }) => obj);

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1000 }}>
      
      {selectedObjects.map(({ id, obj }) => {
        // Get the bounding box with proper coordinates
        const boundingBox = getObjectBoundingBox(obj);
        
        // Apply live drag offset if applicable
        const dragOffset = liveDragPositions[id];
        const finalX = dragOffset ? boundingBox.x + (dragOffset.x - obj.x) : boundingBox.x;
        const finalY = dragOffset ? boundingBox.y + (dragOffset.y - obj.y) : boundingBox.y;


        return (
          <div
            key={`debug-${id}`}
            className="absolute border-2 border-red-500 border-dashed bg-red-500/10"
            style={{
              left: finalX - 1, // -1 for border
              top: finalY - 1,
              width: boundingBox.width + 2, // +2 for borders
              height: boundingBox.height + 2,
              pointerEvents: 'none'
            }}
          >
            {/* Corner markers */}
            <div className="absolute -top-1 -left-1 w-2 h-2 bg-red-500"></div>
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500"></div>
            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-red-500"></div>
            <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-red-500"></div>
            
            {/* Debug info label */}
            <div className="absolute -top-8 left-0 bg-red-500 text-white text-xs px-1 rounded whitespace-nowrap">
              {obj.type}: {Math.round(boundingBox.width)}×{Math.round(boundingBox.height)}
              {obj.type === 'path' && obj.strokeWidth && ` (stroke: ${obj.strokeWidth})`}
            </div>
          </div>
        );
      })}
    </div>
  );
};