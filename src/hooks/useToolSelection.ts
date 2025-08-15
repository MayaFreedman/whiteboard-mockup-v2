
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
    // But skip clearing if this was an auto-switch to select tool
    if (activeTool !== 'select' && !wasAutoSwitched) {
      console.log('🎯 TOOL SELECTION: Clearing selection when switching from select tool');
      clearSelection();
    } else if (activeTool !== 'select' && wasAutoSwitched) {
      console.log('🎯 TOOL SELECTION: Skipping selection clear due to auto-switch');
    }
  }, [activeTool, clearSelection, wasAutoSwitched]);

  // Handle auto-switching back to original tool when selection is cleared
  useEffect(() => {
    console.log('🔄 AUTO-SWITCH CHECK: Selection length:', selectedObjectIds.length, 'wasAutoSwitched:', wasAutoSwitched, 'autoSwitchedFromTool:', autoSwitchedFromTool);
    if (wasAutoSwitched && selectedObjectIds.length === 0 && autoSwitchedFromTool) {
      console.log('🔄 AUTO-SWITCH: ✅ Switching back from select to:', autoSwitchedFromTool);
      setActiveTool(autoSwitchedFromTool);
      clearAutoSwitchState();
    }
  }, [selectedObjectIds.length, wasAutoSwitched, autoSwitchedFromTool, setActiveTool, clearAutoSwitchState]);
};
