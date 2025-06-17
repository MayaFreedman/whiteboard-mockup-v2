
import React, { useState } from 'react';
import { useWhiteboardStore } from '../../../stores/whiteboardStore';
import { useToolStore } from '../../../stores/toolStore';
import { Badge } from '../../ui/badge';
import { StateVersions } from './StateVersions';
import { CurrentState } from './CurrentState';
import { ActivityHistory } from './ActivityHistory';
import { StateActions } from './StateActions';

export const MultiplayerStatePanel: React.FC = () => {
  const whiteboardStore = useWhiteboardStore();
  const toolStore = useToolStore();
  const [lastSync] = useState<number>(Date.now());

  // Get state snapshots
  const whiteboardSnapshot = whiteboardStore.getStateSnapshot();
  const toolSnapshot = toolStore.getToolStateSnapshot();
  
  // Get recent actions and changes
  const recentActions = whiteboardStore.getActionsSince(lastSync - 30000); // Last 30 seconds
  const recentToolChanges = toolStore.getToolChangesSince(lastSync - 30000);

  return (
    <div className="space-y-4 text-xs">
      {/* State Versions */}
      <StateVersions 
        whiteboardSnapshot={whiteboardSnapshot}
        toolSnapshot={toolSnapshot}
      />

      {/* Current State Summary */}
      <CurrentState 
        whiteboardSnapshot={whiteboardSnapshot}
        toolSnapshot={toolSnapshot}
      />

      {/* Action History Stats */}
      <div className="space-y-2">
        <div className="font-medium">History Tracking</div>
        <div className="bg-muted/30 p-2 rounded space-y-1">
          <div>Total Actions: {whiteboardSnapshot.actionCount}</div>
          <div>Tool Changes: {toolStore.toolChangeHistory.length}</div>
          <div>Recent Activity (30s): {recentActions.length + recentToolChanges.length}</div>
          <div>Can Undo: <Badge variant={whiteboardStore.canUndo() ? "default" : "secondary"}>{whiteboardStore.canUndo() ? "YES" : "NO"}</Badge></div>
          <div>Can Redo: <Badge variant={whiteboardStore.canRedo() ? "default" : "secondary"}>{whiteboardStore.canRedo() ? "YES" : "NO"}</Badge></div>
        </div>
      </div>

      {/* Recent Activity */}
      <ActivityHistory 
        recentActions={recentActions}
        recentToolChanges={recentToolChanges}
      />

      {/* State Synchronization Readiness */}
      <div className="space-y-2">
        <div className="font-medium">Sync Readiness</div>
        <div className="bg-muted/30 p-2 rounded text-xs space-y-1">
          <div>✓ Action-based state management</div>
          <div>✓ State versioning</div>
          <div>✓ Timestamp tracking</div>
          <div>✓ Serializable state</div>
          <div>✓ History management</div>
          <div>✓ Undo/Redo support</div>
        </div>
      </div>

      {/* Actions */}
      <StateActions 
        whiteboardSnapshot={whiteboardSnapshot}
        toolSnapshot={toolSnapshot}
        whiteboardStore={whiteboardStore}
        toolStore={toolStore}
      />
    </div>
  );
};
