
import { useEffect } from 'react';
import { useToolStore } from '../stores/toolStore';
import { useWhiteboardStore } from '../stores/whiteboardStore';

/**
 * Custom hook that handles clearing selection when switching away from select tool
 * This avoids circular dependencies between stores
 */
export const useToolSelection = () => {
  const { activeTool, wasAutoSwitched, autoSwitchedFromTool, isAutoSwitching, setActiveTool, clearAutoSwitchState } = useToolStore();
  const { clearSelection, selectedObjectIds } = useWhiteboardStore();
  
  useEffect(() => {
    
    // If user manually switches to a different tool while in auto-switched select mode, clear the auto-switch state
    if (activeTool !== 'select' && wasAutoSwitched && !isAutoSwitching) {
      clearAutoSwitchState();
      clearSelection();
      return;
    }
    
    if (activeTool !== 'select' && !isAutoSwitching) {
      clearSelection();
    }
  }, [activeTool, clearSelection, isAutoSwitching, wasAutoSwitched, clearAutoSwitchState]);

  // Handle auto-switching back to original tool when selection is cleared naturally (not by manual tool switch)
  useEffect(() => {
    // Only auto-switch back if we're still in select mode and selection was cleared naturally
    if (wasAutoSwitched && selectedObjectIds.length === 0 && autoSwitchedFromTool && activeTool === 'select') {
      
      setActiveTool(autoSwitchedFromTool);
      clearAutoSwitchState();
    }
  }, [selectedObjectIds.length, wasAutoSwitched, autoSwitchedFromTool, activeTool, setActiveTool, clearAutoSwitchState]);
};
