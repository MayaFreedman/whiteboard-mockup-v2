
import React from 'react';
import { Badge } from '../../ui/badge';

interface CurrentStateProps {
  whiteboardSnapshot: {
    state: {
      objects: Record<string, any>;
      selectedObjectIds: string[];
      viewport: {
        x: number;
        y: number;
        zoom: number;
      };
    };
  };
  toolSnapshot: {
    activeTool: string;
    settings: {
      strokeColor: string;
    };
  };
}

export const CurrentState: React.FC<CurrentStateProps> = ({
  whiteboardSnapshot,
  toolSnapshot
}) => {
  return (
    <div className="space-y-2">
      <div className="font-medium">Current State</div>
      <div className="bg-muted/30 p-2 rounded space-y-1">
        <div>Objects: {Object.keys(whiteboardSnapshot.state.objects).length}</div>
        <div>Selected: {whiteboardSnapshot.state.selectedObjectIds.length}</div>
        <div>Viewport: ({whiteboardSnapshot.state.viewport.x}, {whiteboardSnapshot.state.viewport.y}) @ {Math.round(whiteboardSnapshot.state.viewport.zoom * 100)}%</div>
        <div>Active Tool: <Badge variant="outline">{toolSnapshot.activeTool}</Badge></div>
        <div>Stroke Color: <span className="inline-block w-3 h-3 border rounded ml-1" style={{ backgroundColor: toolSnapshot.settings.strokeColor }}></span> {toolSnapshot.settings.strokeColor}</div>
      </div>
    </div>
  );
};
