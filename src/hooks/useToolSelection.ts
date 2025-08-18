
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
    console.log('🎯 TOOL SELECTION: Tool changed to:', activeTool, 'wasAutoSwitched:', wasAutoSwitched, 'isAutoSwitching:', isAutoSwitching);
    // Clear selection when switching to any tool other than select
    // Only skip clearing if we're currently auto-switching TO select tool
    if (activeTool !== 'select' && !isAutoSwitching) {
      console.log('🎯 TOOL SELECTION: Clearing selection when switching from select tool');
      clearSelection();
    } else if (activeTool !== 'select' && isAutoSwitching) {
      console.log('🎯 TOOL SELECTION: Skipping selection clear due to active auto-switch');
    }
  }, [activeTool, clearSelection, isAutoSwitching]);

  // Handle auto-switching back to original tool when selection is cleared
  useEffect(() => {
    
    if (wasAutoSwitched && selectedObjectIds.length === 0 && autoSwitchedFromTool) {
      console.log('🔄 AUTO-SWITCH: ✅ Switching back from select to:', autoSwitchedFromTool);
      setActiveTool(autoSwitchedFromTool);
      clearAutoSwitchState();
    }
  }, [selectedObjectIds.length, wasAutoSwitched, autoSwitchedFromTool, setActiveTool, clearAutoSwitchState]);
};
