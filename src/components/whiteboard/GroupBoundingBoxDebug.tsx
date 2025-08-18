import React from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { getGroupBoundingBox } from '../../utils/boundaryConstraints';

interface GroupBoundingBoxDebugProps {
  liveDragPositions: Record<string, { x: number; y: number }>;
  selectedObjectIds: string[];
  enabled?: boolean;
}

export const GroupBoundingBoxDebug: React.FC<GroupBoundingBoxDebugProps> = ({
  liveDragPositions,
  selectedObjectIds,
  enabled = true
}) => {
  const { objects } = useWhiteboardStore();

  if (!enabled || selectedObjectIds.length <= 1) {
    return null;
  }

  // Get all selected objects with their current positions (including live drag)
  const selectedObjects = selectedObjectIds
    .map(id => {
      const obj = objects[id];
      if (!obj) return null;
      
      // Apply live drag position if available
      const livePos = liveDragPositions[id];
      if (livePos) {
        return {
          ...obj,
          x: livePos.x,
          y: livePos.y
        };
      }
      return obj;
    })
    .filter(obj => obj !== null);

  if (selectedObjects.length === 0) {
    return null;
  }

  // Calculate group bounding box
  const groupBounds = getGroupBoundingBox(selectedObjects);

  return (
    <div
      style={{
        position: 'absolute',
        left: groupBounds.x,
        top: groupBounds.y,
        width: groupBounds.width,
        height: groupBounds.height,
        border: '3px dashed #00ff00',
        backgroundColor: 'rgba(0, 255, 0, 0.1)',
        pointerEvents: 'none',
        zIndex: 1000,
        borderRadius: '4px'
      }}
    >
      {/* Corner markers */}
      <div
        style={{
          position: 'absolute',
          top: -6,
          left: -6,
          width: 12,
          height: 12,
          backgroundColor: '#00ff00',
          borderRadius: '50%',
          border: '2px solid #ffffff'
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: -6,
          right: -6,
          width: 12,
          height: 12,
          backgroundColor: '#00ff00',
          borderRadius: '50%',
          border: '2px solid #ffffff'
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -6,
          left: -6,
          width: 12,
          height: 12,
          backgroundColor: '#00ff00',
          borderRadius: '50%',
          border: '2px solid #ffffff'
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -6,
          right: -6,
          width: 12,
          height: 12,
          backgroundColor: '#00ff00',
          borderRadius: '50%',
          border: '2px solid #ffffff'
        }}
      />
      
      {/* Debug info */}
      <div
        style={{
          position: 'absolute',
          top: -30,
          left: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: '#00ff00',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '12px',
          fontFamily: 'monospace',
          whiteSpace: 'nowrap'
        }}
      >
        GROUP ({selectedObjects.length}) - {Math.round(groupBounds.width)}×{Math.round(groupBounds.height)}
      </div>
    </div>
  );
};