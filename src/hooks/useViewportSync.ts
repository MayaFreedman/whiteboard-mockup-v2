import { useEffect, useCallback, useRef } from 'react';
import { useWhiteboardStore } from '../stores/whiteboardStore';
import { useMultiplayerSync } from './useMultiplayerSync';
import { useUser } from '../contexts/UserContext';
import { nanoid } from 'nanoid';
import { ViewportResizeAction } from '../types/whiteboard';

export const useViewportSync = () => {
  const { 
    viewport, 
    setViewport, 
    updateUserScreenSize, 
    removeUserScreenSize, 
    calculateMinimumScreenSize 
  } = useWhiteboardStore();
  const { userId } = useUser();
  const { sendWhiteboardAction, isConnected } = useMultiplayerSync();
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const isInitialized = useRef(false);

  // Update user's screen size and recalculate canvas based on global minimum
  const updateMyScreenSize = useCallback((newWidth?: number, newHeight?: number) => {
    const targetWidth = newWidth || window.innerWidth;
    const targetHeight = newHeight || window.innerHeight;
    
    console.log('📐 Updating my screen size:', { userId, width: targetWidth, height: targetHeight });
    updateUserScreenSize(userId, targetWidth, targetHeight);
  }, [userId, updateUserScreenSize]);

  const sendResizeAction = useCallback(() => {
    // Always update my screen size first (this will trigger canvas resize if needed)
    updateMyScreenSize();
    
    if (!isConnected) {
      console.log('📐 Not connected - screen size updated locally only');
      return;
    }

    // Send resize action through the existing action system
    const resizeAction: ViewportResizeAction = {
      type: 'VIEWPORT_RESIZE',
      payload: {
        screenSize: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      },
      timestamp: Date.now(),
      id: nanoid(),
      userId: userId
    };
    
    console.log('📤 Sending resize action:', resizeAction);
    sendWhiteboardAction(resizeAction);
  }, [isConnected, sendWhiteboardAction, userId, updateMyScreenSize]);

  const handleWindowResize = useCallback(() => {
    console.log('🔄 Window resize triggered');
    
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      console.log('🔄 Processing window resize after debounce');
      sendResizeAction();
    }, 300);
  }, [sendResizeAction]);

  // Initialize with my screen size on mount
  useEffect(() => {
    if (!isInitialized.current) {
      console.log('🔄 Initializing with my screen size:', { width: window.innerWidth, height: window.innerHeight });
      updateMyScreenSize(window.innerWidth, window.innerHeight);
      isInitialized.current = true;
    }
  }, [updateMyScreenSize]);

  // Send initial screen size when connecting
  useEffect(() => {
    if (isConnected && isInitialized.current) {
      console.log('🔗 Connection established - sending initial screen size');
      sendResizeAction();
    }
  }, [isConnected, sendResizeAction]);

  // Listen for window resize
  useEffect(() => {
    window.addEventListener('resize', handleWindowResize);
    return () => {
      window.removeEventListener('resize', handleWindowResize);
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [handleWindowResize]);

  // Listen for incoming resize actions and update user screen sizes
  useEffect(() => {
    const unsubscribe = useWhiteboardStore.subscribe(
      (state) => {
        const lastAction = state.lastAction;
        if (lastAction?.type === 'VIEWPORT_RESIZE' && lastAction.userId !== userId) {
          console.log('📥 Received resize from user:', lastAction.userId, lastAction.payload.screenSize);
          
          // Update the screen size for this user
          const incomingSize = lastAction.payload.screenSize;
          updateUserScreenSize(lastAction.userId, incomingSize.width, incomingSize.height);
        }
      }
    );

    return unsubscribe;
  }, [userId, updateUserScreenSize]);

  // Handle user disconnection
  useEffect(() => {
    return () => {
      // Clean up this user's screen size when component unmounts
      removeUserScreenSize(userId);
    };
  }, [userId, removeUserScreenSize]);

  return {
    updateMyScreenSize
  };
};