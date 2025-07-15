
import React from 'react';
import { Badge } from '../../ui/badge';

interface CurrentStateProps {
  whiteboardSnapshot: {
    objects: Record<string, any>;
    viewport: {
      x: number;
      y: number;
      zoom: number;
    };
    settings: {
      gridVisible: boolean;
      linedPaperVisible: boolean;
      showDots: boolean;
      backgroundColor: string;
    };
    actionCount: number;
    timestamp: number;
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
        <div>Objects: {Object.keys(whiteboardSnapshot.objects || {}).length}</div>
        <div>Viewport: ({whiteboardSnapshot.viewport?.x || 0}, {whiteboardSnapshot.viewport?.y || 0}) @ {Math.round((whiteboardSnapshot.viewport?.zoom || 1) * 100)}%</div>
        <div>Active Tool: <Badge variant="outline">{toolSnapshot.activeTool}</Badge></div>
        <div>Stroke Color: <span className="inline-block w-3 h-3 border rounded ml-1" style={{ backgroundColor: toolSnapshot.settings.strokeColor }}></span> {toolSnapshot.settings.strokeColor}</div>
        <div>Actions: {whiteboardSnapshot.actionCount || 0}</div>
      </div>
    </div>
  );
};
