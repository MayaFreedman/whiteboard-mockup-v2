
import React from 'react';
import { Button } from '../../ui/button';
import { Copy, Download, Trash2 } from 'lucide-react';

interface StateActionsProps {
  whiteboardSnapshot: any;
  toolSnapshot: any;
  whiteboardStore: any;
  toolStore: any;
}

export const StateActions: React.FC<StateActionsProps> = ({
  whiteboardSnapshot,
  toolSnapshot,
  whiteboardStore,
  toolStore
}) => {
  const handleCopyState = () => {
    const state = {
      whiteboard: whiteboardSnapshot,
      tools: toolSnapshot,
      timestamp: Date.now()
    };
    navigator.clipboard.writeText(JSON.stringify(state, null, 2));
    
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
    
  };

  const handleClearHistory = () => {
    whiteboardStore.clearActionHistory();
    toolStore.clearToolHistory();
    
  };

  return (
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
  );
};
