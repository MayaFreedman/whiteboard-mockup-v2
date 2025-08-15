import React, { useEffect, useState } from 'react';
import { useWhiteboardStore } from '../stores/whiteboardStore';
import { Card } from './ui/card';

interface DragDebugState {
  isDragging: boolean;
  dragStart: any;
  selectedCount: number;
  liveDragCount: number;
  timestamp: number;
}

export const DragDebugOverlay: React.FC = () => {
  const { selectedObjectIds } = useWhiteboardStore();
  const [debugState, setDebugState] = useState<DragDebugState>({
    isDragging: false,
    dragStart: null,
    selectedCount: 0,
    liveDragCount: 0,
    timestamp: Date.now()
  });

  // Listen for debug messages in console
  useEffect(() => {
    const originalConsoleLog = console.log;
    
    console.log = (...args) => {
      // Call original console.log
      originalConsoleLog.apply(console, args);
      
      // Check for drag debug messages
      const message = args[0];
      if (typeof message === 'string' && message.includes('DRAG DEBUG')) {
        setDebugState(prev => ({
          ...prev,
          timestamp: Date.now()
        }));
      }
    };

    return () => {
      console.log = originalConsoleLog;
    };
  }, []);

  // Update selection count when it changes
  useEffect(() => {
    setDebugState(prev => ({
      ...prev,
      selectedCount: selectedObjectIds.length,
      timestamp: Date.now()
    }));
  }, [selectedObjectIds.length]);

  if (!selectedObjectIds.length && !debugState.isDragging) {
    return null;
  }

  return (
    <Card className="fixed top-4 right-4 p-3 text-xs bg-yellow-100 border-yellow-300 z-[9999] max-w-xs">
      <div className="font-bold text-yellow-800 mb-2">🐛 Drag Debug</div>
      <div className="space-y-1 text-yellow-700">
        <div>Selected: {selectedObjectIds.length}</div>
        <div>IDs: {selectedObjectIds.map(id => id.slice(0, 6)).join(', ')}</div>
        <div>Last Update: {new Date(debugState.timestamp).toLocaleTimeString()}</div>
        {selectedObjectIds.length > 0 && (
          <div className="mt-2 p-2 bg-yellow-200 rounded text-xs">
            <div className="font-semibold">Expected Behavior:</div>
            <div>• Drag should move all selected objects</div>
            <div>• Release should complete drag</div>
            <div>• No "wall" effect should occur</div>
          </div>
        )}
      </div>
    </Card>
  );
};