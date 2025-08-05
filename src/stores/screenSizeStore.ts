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

// Debounce function for batching updates
let recalculateTimeout: NodeJS.Timeout | null = null;

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
    
    // Debounced recalculation to prevent cascading updates
    if (recalculateTimeout) {
      clearTimeout(recalculateTimeout);
    }
    recalculateTimeout = setTimeout(() => {
      get().recalculateMinimumSize();
    }, 50);
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
    
    // Debounced recalculation
    if (recalculateTimeout) {
      clearTimeout(recalculateTimeout);
    }
    recalculateTimeout = setTimeout(() => {
      get().recalculateMinimumSize();
    }, 50);
  },

  clearAllSizes: () => {
    console.log('📏 Clearing all screen sizes for fresh recalculation');
    set({ userScreenSizes: {} });
    
    // Immediate recalculation after clearing
    get().recalculateMinimumSize();
  },

  recalculateMinimumSize: () => {
    const { userScreenSizes, activeWhiteboardSize } = get();
    const sizes = Object.values(userScreenSizes);
    
    if (sizes.length === 0) {
      // No other users, use current screen size (full whiteboard)
      const currentSize = calculateUsableScreenSize();
      
      // Only update if size actually changed to prevent unnecessary re-renders
      if (activeWhiteboardSize.width !== currentSize.width || activeWhiteboardSize.height !== currentSize.height) {
        set({
          minimumScreenSize: currentSize,
          activeWhiteboardSize: currentSize
        });
      }
      return;
    }
    
    // Find minimum width and height across all users
    const minWidth = Math.min(...sizes.map(s => s.width));
    const minHeight = Math.min(...sizes.map(s => s.height));
    
    const newMinimumSize = { width: minWidth, height: minHeight };
    
    // Only update if size actually changed
    if (activeWhiteboardSize.width !== newMinimumSize.width || activeWhiteboardSize.height !== newMinimumSize.height) {
      set({
        minimumScreenSize: newMinimumSize,
        activeWhiteboardSize: newMinimumSize
      });
    }
  },

  setActiveWhiteboardSize: (size: { width: number; height: number }) => {
    set({ activeWhiteboardSize: size });
  }
}));