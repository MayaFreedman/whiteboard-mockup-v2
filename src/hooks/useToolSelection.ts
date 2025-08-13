
import { useEffect } from 'react';
import { useToolStore } from '../stores/toolStore';
import { useWhiteboardStore } from '../stores/whiteboardStore';

/**
 * Custom hook that handles clearing selection when switching away from select tool
 * This avoids circular dependencies between stores
 */
export const useToolSelection = (clearTextInteractionState?: () => void) => {
  const { activeTool } = useToolStore();
  const { clearSelection } = useWhiteboardStore();
  
  useEffect(() => {
    // Clear selection when switching to any tool other than select
    if (activeTool !== 'select') {
      clearSelection();
      console.log('🎯 Cleared selection when switching from select tool');
    }
    
    // Reset text editing state when switching tools
    if (clearTextInteractionState) {
      clearTextInteractionState();
      console.log('🔧 Tool changed, cleared text editing state');
    }
  }, [activeTool, clearSelection, clearTextInteractionState]);
};
