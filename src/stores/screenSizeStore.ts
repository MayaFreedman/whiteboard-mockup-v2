import { create } from 'zustand';

interface UserScreenSize {
  width: number;
  height: number;
  timestamp: number;
}

interface ScreenSizeState {
  userScreenSizes: Record<string, UserScreenSize>;
  minimumScreenSize: { width: number; height: number };
  activeWhiteboardSize: { width: number; height: number };
  
  // Actions
  updateUserScreenSize: (userId: string, size: { width: number; height: number }) => void;
  updateLocalUserScreenSize: (userId: string, size: { width: number; height: number }) => void;
  removeUser: (userId: string) => void;
  clearAllSizes: () => void;
  recalculateMinimumSize: () => void;
  setActiveWhiteboardSize: (size: { width: number; height: number }) => void;
}

const calculateUsableScreenSize = () => {
  // Calculate usable screen area minus UI chrome (toolbar, etc.)
  const toolbarHeight = 60; // Approximate toolbar height
  return {
    width: window.innerWidth,
    height: Math.max(window.innerHeight - toolbarHeight, 400) // Ensure minimum height
  };
};

export const useScreenSizeStore = create<ScreenSizeState>((set, get) => ({
  userScreenSizes: {},
  minimumScreenSize: calculateUsableScreenSize(),
  activeWhiteboardSize: calculateUsableScreenSize(),

  updateUserScreenSize: (userId: string, size: { width: number; height: number }) => {
    console.log('📏 Remote screen size update:', userId, size);
    set((state) => {
      const newUserScreenSizes = {
        ...state.userScreenSizes,
        [userId]: {
          ...size,
          timestamp: Date.now()
        }
      };
      
      return {
        userScreenSizes: newUserScreenSizes
      };
    });
    
    // Recalculate minimum after remote update
    get().recalculateMinimumSize();
  },

  updateLocalUserScreenSize: (userId: string, size: { width: number; height: number }) => {
    console.log('📏 Local screen size update:', userId, size);
    set((state) => {
      const newUserScreenSizes = {
        ...state.userScreenSizes,
        [userId]: {
          ...size,
          timestamp: Date.now()
        }
      };
      
      return {
        userScreenSizes: newUserScreenSizes
      };
    });
    
    // Don't recalculate for local updates - wait for broadcast response
  },

  removeUser: (userId: string) => {
    set((state) => {
      const newUserScreenSizes = { ...state.userScreenSizes };
      delete newUserScreenSizes[userId];
      
      return {
        userScreenSizes: newUserScreenSizes
      };
    });
    
    // Recalculate minimum after removal
    get().recalculateMinimumSize();
  },

  clearAllSizes: () => {
    console.log('📏 Clearing all screen sizes for fresh recalculation');
    set({ userScreenSizes: {} });
    
    // Recalculate minimum after clearing (will use current screen size)
    get().recalculateMinimumSize();
  },

  recalculateMinimumSize: () => {
    const { userScreenSizes, activeWhiteboardSize } = get();
    const sizes = Object.values(userScreenSizes);
    
    if (sizes.length === 0) {
      // No other users, use current screen size (full whiteboard)
      const currentSize = calculateUsableScreenSize();
      const hasChanged = currentSize.width !== activeWhiteboardSize.width || 
                        currentSize.height !== activeWhiteboardSize.height;
      
      set({
        minimumScreenSize: currentSize,
        activeWhiteboardSize: currentSize
      });
      
      if (hasChanged) {
        console.log('📏 Canvas size changed to single-user mode, scheduling immediate redraw');
        // Force immediate redraw after size change
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('force-canvas-redraw', { 
            detail: { reason: 'screen-size-change', newSize: currentSize } 
          }));
        }, 0);
      }
      return;
    }
    
    // Find minimum width and height across all users
    const minWidth = Math.min(...sizes.map(s => s.width));
    const minHeight = Math.min(...sizes.map(s => s.height));
    
    const newMinimumSize = { width: minWidth, height: minHeight };
    const hasChanged = newMinimumSize.width !== activeWhiteboardSize.width || 
                      newMinimumSize.height !== activeWhiteboardSize.height;
    
    set({
      minimumScreenSize: newMinimumSize,
      activeWhiteboardSize: newMinimumSize
    });
    
    if (hasChanged) {
      console.log('📏 Canvas size changed to:', newMinimumSize, 'scheduling immediate redraw');
      // Force immediate redraw after size change
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('force-canvas-redraw', { 
          detail: { reason: 'screen-size-change', newSize: newMinimumSize } 
        }));
      }, 0);
    }
  },

  setActiveWhiteboardSize: (size: { width: number; height: number }) => {
    set({ activeWhiteboardSize: size });
  }
}));