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
  removeUser: (userId: string) => void;
  recalculateMinimumSize: () => void;
  setActiveWhiteboardSize: (size: { width: number; height: number }) => void;
}

const calculateUsableScreenSize = () => {
  // Calculate usable screen area minus UI chrome (toolbar, etc.)
  const toolbarHeight = 60; // Approximate toolbar height
  return {
    width: window.innerWidth,
    height: window.innerHeight - toolbarHeight
  };
};

export const useScreenSizeStore = create<ScreenSizeState>((set, get) => ({
  userScreenSizes: {},
  minimumScreenSize: calculateUsableScreenSize(),
  activeWhiteboardSize: calculateUsableScreenSize(),

  updateUserScreenSize: (userId: string, size: { width: number; height: number }) => {
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
    
    // Recalculate minimum after update
    get().recalculateMinimumSize();
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

  recalculateMinimumSize: () => {
    const { userScreenSizes } = get();
    const sizes = Object.values(userScreenSizes);
    
    if (sizes.length === 0) {
      // No other users, use current screen size
      const currentSize = calculateUsableScreenSize();
      set({
        minimumScreenSize: currentSize,
        activeWhiteboardSize: currentSize
      });
      return;
    }
    
    // Find minimum width and height across all users
    const minWidth = Math.min(...sizes.map(s => s.width));
    const minHeight = Math.min(...sizes.map(s => s.height));
    
    const newMinimumSize = { width: minWidth, height: minHeight };
    
    set({
      minimumScreenSize: newMinimumSize,
      activeWhiteboardSize: newMinimumSize
    });
  },

  setActiveWhiteboardSize: (size: { width: number; height: number }) => {
    set({ activeWhiteboardSize: size });
  }
}));