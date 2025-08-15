
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
    console.log('🎯 TOOL SELECTION: Tool changed to:', activeTool, 'wasAutoSwitched:', wasAutoSwitched);
    // Clear selection when switching to any tool other than select
    // Always clear when switching away from select, regardless of previous auto-switch state
    if (activeTool !== 'select') {
      console.log('🎯 TOOL SELECTION: Clearing selection when switching away from select tool');
      clearSelection();
    }
  }, [activeTool, clearSelection]);

  // Handle auto-switching back to original tool when selection is cleared
  useEffect(() => {
    
    if (wasAutoSwitched && selectedObjectIds.length === 0 && autoSwitchedFromTool) {
      console.log('🔄 AUTO-SWITCH: ✅ Switching back from select to:', autoSwitchedFromTool);
      setActiveTool(autoSwitchedFromTool);
      clearAutoSwitchState();
    }
  }, [selectedObjectIds.length, wasAutoSwitched, autoSwitchedFromTool, setActiveTool, clearAutoSwitchState]);
};
