import React from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { getObjectDimensions } from '../../utils/boundaryConstraints';

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

  console.log('🔴 BoundingBoxDebug render:', { 
    enabled, 
    selectedCount: selectedObjectIds.length, 
    selectedIds: selectedObjectIds,
    totalObjects: Object.keys(objects).length 
  });

  if (!enabled) return null;

  const selectedObjects = selectedObjectIds
    .map(id => ({ id, obj: objects[id] }))
    .filter(({ obj }) => obj);

  console.log('🔴 Filtered selected objects:', selectedObjects.length);

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1000 }}>
      {/* Always show a test box */}
      <div 
        className="absolute border-4 border-red-500 bg-red-500/20"
        style={{
          left: 50,
          top: 50, 
          width: 100,
          height: 50
        }}
      >
        <div className="text-red-500 font-bold">DEBUG ACTIVE</div>
      </div>
      
      {selectedObjects.map(({ id, obj }) => {
        // Get the current position (including live drag if applicable)
        const currentPos = liveDragPositions[id] || { x: obj.x, y: obj.y };
        const dimensions = getObjectDimensions(obj);

        return (
          <div
            key={`debug-${id}`}
            className="absolute border-2 border-red-500 border-dashed bg-red-500/10"
            style={{
              left: currentPos.x - 1, // -1 for border
              top: currentPos.y - 1,
              width: dimensions.width + 2, // +2 for borders
              height: dimensions.height + 2,
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
              {obj.type}: {Math.round(dimensions.width)}×{Math.round(dimensions.height)}
              {obj.type === 'path' && obj.strokeWidth && ` (stroke: ${obj.strokeWidth})`}
            </div>
          </div>
        );
      })}
    </div>
  );
};