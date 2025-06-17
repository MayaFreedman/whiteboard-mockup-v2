
import React from 'react';
import { Hash } from 'lucide-react';

interface StateVersionsProps {
  whiteboardSnapshot: {
    version: number;
    timestamp: number;
  };
  toolSnapshot: {
    version: number;
    timestamp: number;
  };
}

export const StateVersions: React.FC<StateVersionsProps> = ({
  whiteboardSnapshot,
  toolSnapshot
}) => {
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="space-y-2">
      <div className="font-medium">State Versions</div>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-muted/30 p-2 rounded">
          <div className="flex items-center gap-1 mb-1">
            <Hash className="w-3 h-3" />
            <span className="font-medium">Whiteboard</span>
          </div>
          <div>v{whiteboardSnapshot.version}</div>
          <div className="text-muted-foreground text-xs">
            {formatTimestamp(whiteboardSnapshot.timestamp)}
          </div>
        </div>
        <div className="bg-muted/30 p-2 rounded">
          <div className="flex items-center gap-1 mb-1">
            <Hash className="w-3 h-3" />
            <span className="font-medium">Tools</span>
          </div>
          <div>v{toolSnapshot.version}</div>
          <div className="text-muted-foreground text-xs">
            {formatTimestamp(toolSnapshot.timestamp)}
          </div>
        </div>
      </div>
    </div>
  );
};
