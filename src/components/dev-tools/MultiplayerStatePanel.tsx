
import React, { useState, useEffect } from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useToolStore } from '../../stores/toolStore';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { 
  Copy, 
  Download, 
  Trash2, 
  Clock, 
  Hash,
  Activity
} from 'lucide-react';

export const MultiplayerStatePanel: React.FC = () => {
  const whiteboardStore = useWhiteboardStore();
  const toolStore = useToolStore();
  const [lastSync, setLastSync] = useState<number>(Date.now());

  // Get state snapshots
  const whiteboardSnapshot = whiteboardStore.getStateSnapshot();
  const toolSnapshot = toolStore.getToolStateSnapshot();
  
  // Get recent actions and changes
  const recentActions = whiteboardStore.getActionsSince(lastSync - 30000); // Last 30 seconds
  const recentToolChanges = toolStore.getToolChangesSince(lastSync - 30000);

  const handleCopyState = () => {
    const state = {
      whiteboard: whiteboardSnapshot,
      tools: toolSnapshot,
      timestamp: Date.now()
    };
    navigator.clipboard.writeText(JSON.stringify(state, null, 2));
    console.log('📋 State copied to clipboard');
  };

  const handleDownloadState = () => {
    const state = {
      whiteboard: whiteboardSnapshot,
      tools: toolSnapshot,
      actions: whiteboardStore.actionHistory,
      toolChanges: toolStore.toolChangeHistory,
      timestamp: Date.now()
    };
    
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whiteboard-state-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    console.log('💾 State downloaded');
  };

  const handleClearHistory = () => {
    whiteboardStore.clearActionHistory();
    toolStore.clearToolHistory();
    console.log('🧹 All history cleared');
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="space-y-4 text-xs">
      {/* State Versions */}
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

      {/* Current State Summary */}
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
      <div className="space-y-2">
        <div className="flex items-center gap-2 font-medium">
          <Activity className="w-4 h-4" />
          Recent Activity (30s)
        </div>
        <ScrollArea className="h-32">
          <div className="space-y-1">
            {[...recentActions, ...recentToolChanges.map(change => ({
              type: 'TOOL_CHANGE',
              timestamp: change.timestamp,
              id: `tool-${change.timestamp}`,
              payload: { tool: change.tool }
            }))].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10).map((item) => (
              <div key={item.id} className="text-xs p-1 bg-muted/20 rounded">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs py-0">
                    {item.type}
                  </Badge>
                  <span className="text-muted-foreground">
                    {formatTimestamp(item.timestamp)}
                  </span>
                </div>
                {item.type === 'TOOL_CHANGE' && 'tool' in item.payload && (
                  <div className="text-muted-foreground">
                    Tool: {item.payload.tool}
                  </div>
                )}
                {item.type === 'ADD_OBJECT' && 'object' in item.payload && item.payload.object && (
                  <div className="text-muted-foreground">
                    Added: {item.payload.object.type} at ({item.payload.object.x}, {item.payload.object.y})
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

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
      <div className="space-y-2">
        <div className="font-medium">Actions</div>
        <div className="grid grid-cols-2 gap-2">
          <Button 
            onClick={handleCopyState}
            variant="outline" 
            size="sm"
            className="gap-1"
          >
            <Copy className="w-3 h-3" />
            Copy State
          </Button>
          <Button 
            onClick={handleDownloadState}
            variant="outline" 
            size="sm"
            className="gap-1"
          >
            <Download className="w-3 h-3" />
            Download
          </Button>
        </div>
        <Button 
          onClick={handleClearHistory}
          variant="destructive" 
          size="sm"
          className="w-full gap-1"
        >
          <Trash2 className="w-3 h-3" />
          Clear History
        </Button>
      </div>
    </div>
  );
};
