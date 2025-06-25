
import React from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useUser } from '../../contexts/UserContext';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import { historyManager } from '../../services/HistoryManager';
import { Badge } from '../ui/badge';

export const ActionHistoryPanel: React.FC = () => {
  const { userId } = useUser();
  const { canUndo, canRedo } = useUndoRedo();
  
  // Get history data from HistoryManager instead of store
  const userHistory = historyManager.getUserHistory(userId);
  const currentHistoryIndex = historyManager.getUserHistoryIndex(userId);
  const globalHistory = historyManager.getHistorySnapshot().globalActionHistory;

  const recentActions = globalHistory.slice(-10);
  const canUndoValue = canUndo(userId);
  const canRedoValue = canRedo(userId);

  return (
    <div className="space-y-4 text-xs">
      {/* Undo/Redo Status */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-muted/50 p-2 rounded">
          <div className="font-medium">Can Undo</div>
          <Badge variant={canUndoValue ? "default" : "secondary"}>
            {canUndoValue ? "YES" : "NO"}
          </Badge>
        </div>
        <div className="bg-muted/50 p-2 rounded">
          <div className="font-medium">Can Redo</div>
          <Badge variant={canRedoValue ? "default" : "secondary"}>
            {canRedoValue ? "YES" : "NO"}
          </Badge>
        </div>
      </div>

      {/* History Stats */}
      <div className="bg-muted/30 p-2 rounded space-y-1">
        <div>Total Actions: {globalHistory.length}</div>
        <div>Current Index: {currentHistoryIndex}</div>
        <div>User History: {userHistory.length}</div>
        <div>Available Undos: {currentHistoryIndex + 1}</div>
        <div>Available Redos: {userHistory.length - currentHistoryIndex - 1}</div>
      </div>

      {/* Recent Actions */}
      <div className="space-y-2">
        <div className="font-medium">Recent Actions ({recentActions.length})</div>
        <div className="max-h-80 overflow-auto space-y-1">
          {recentActions.reverse().map((action, index) => {
            const isCurrentAction = globalHistory.length - 1 - index === currentHistoryIndex;
            const actionTime = new Date(action.timestamp).toLocaleTimeString();
            
            return (
              <div 
                key={action.id} 
                className={`p-2 rounded border text-xs ${
                  isCurrentAction ? 'bg-primary/10 border-primary' : 'bg-muted/30'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Badge 
                    variant={isCurrentAction ? "default" : "outline"} 
                    className="text-xs py-0"
                  >
                    {action.type}
                  </Badge>
                  <span className="text-muted-foreground">{actionTime}</span>
                </div>
                
                <div className="text-muted-foreground">
                  ID: {action.id.slice(0, 8)}...
                </div>
                
                {/* Action-specific details */}
                {action.type === 'ADD_OBJECT' && action.payload.object && (
                  <div className="text-muted-foreground">
                    Added: {action.payload.object.type} at ({action.payload.object.x}, {action.payload.object.y})
                  </div>
                )}
                
                {action.type === 'UPDATE_OBJECT' && (
                  <div className="text-muted-foreground">
                    Updated: {action.payload.id.slice(0, 8)}...
                  </div>
                )}
                
                {action.type === 'DELETE_OBJECT' && (
                  <div className="text-muted-foreground">
                    Deleted: {action.payload.id.slice(0, 8)}...
                  </div>
                )}
                
                {action.type === 'SELECT_OBJECTS' && (
                  <div className="text-muted-foreground">
                    Selected: {action.payload.objectIds.length} objects
                  </div>
                )}
                
                {action.type === 'UPDATE_VIEWPORT' && (
                  <div className="text-muted-foreground">
                    Viewport: {Object.keys(action.payload).join(', ')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {globalHistory.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          No actions yet. Start drawing to see action history!
        </div>
      )}
    </div>
  );
};
