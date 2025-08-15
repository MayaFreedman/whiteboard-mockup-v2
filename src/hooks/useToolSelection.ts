
import { useEffect } from 'react';
import { useToolStore } from '../stores/toolStore';
import { useWhiteboardStore } from '../stores/whiteboardStore';

/**
 * Custom hook that handles clearing selection when switching away from select tool
 * This avoids circular dependencies between stores
 */
export const useToolSelection = () => {
  const { activeTool, wasAutoSwitched, autoSwitchedFromTool, setActiveTool, clearAutoSwitchState } = useToolStore();
  const { clearSelection, selectedObjectIds } = useWhiteboardStore();
  
  useEffect(() => {
    // Clear selection when switching to any tool other than select
    // But skip clearing if this was an auto-switch to select tool
    if (activeTool !== 'select' && !wasAutoSwitched) {
      clearSelection();
      console.log('🎯 Cleared selection when switching from select tool');
    }
  }, [activeTool, clearSelection, wasAutoSwitched]);

  // Handle auto-switching back to original tool when selection is cleared
  useEffect(() => {
    if (wasAutoSwitched && selectedObjectIds.length === 0 && autoSwitchedFromTool) {
      console.log('🔄 Auto-switching back to:', autoSwitchedFromTool);
      setActiveTool(autoSwitchedFromTool);
      clearAutoSwitchState();
    }
  }, [selectedObjectIds.length, wasAutoSwitched, autoSwitchedFromTool, setActiveTool, clearAutoSwitchState]);
};
