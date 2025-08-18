
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
      console.log('🎯 TOOL SELECTION: User manually switched tools, clearing auto-switch state');
      clearAutoSwitchState();
      clearSelection();
      return;
    }
    
    // Clear selection when switching to any tool other than select
    // Only skip clearing if we're currently auto-switching TO select tool
    if (activeTool !== 'select' && !isAutoSwitching) {
      clearSelection();
    } else if (activeTool !== 'select' && isAutoSwitching) {
      console.log('🎯 TOOL SELECTION: Skipping selection clear due to active auto-switch');
    }
  }, [activeTool, clearSelection, isAutoSwitching, wasAutoSwitched, clearAutoSwitchState]);

  // Handle auto-switching back to original tool when selection is cleared naturally (not by manual tool switch)
  useEffect(() => {
    // Only auto-switch back if we're still in select mode and selection was cleared naturally
    if (wasAutoSwitched && selectedObjectIds.length === 0 && autoSwitchedFromTool && activeTool === 'select') {
      console.log('🔄 AUTO-SWITCH: ✅ Switching back from select to:', autoSwitchedFromTool);
      setActiveTool(autoSwitchedFromTool);
      clearAutoSwitchState();
    }
  }, [selectedObjectIds.length, wasAutoSwitched, autoSwitchedFromTool, activeTool, setActiveTool, clearAutoSwitchState]);
};
