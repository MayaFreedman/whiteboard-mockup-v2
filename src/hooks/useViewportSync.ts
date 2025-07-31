import { useEffect, useCallback, useRef } from 'react';
import { useWhiteboardStore } from '../stores/whiteboardStore';
import { useMultiplayerSync } from './useMultiplayerSync';
import { useUser } from '../contexts/UserContext';
import { nanoid } from 'nanoid';
import { ViewportResizeAction } from '../types/whiteboard';

export const useViewportSync = () => {
  const { viewport, setViewport } = useWhiteboardStore();
  const { userId } = useUser();
  const { sendWhiteboardAction, isConnected } = useMultiplayerSync();
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const isInitialized = useRef(false);

  const updateCanvasSize = useCallback((newWidth?: number, newHeight?: number) => {
    const currentViewport = useWhiteboardStore.getState().viewport;
    const targetWidth = newWidth || window.innerWidth;
    const targetHeight = newHeight || window.innerHeight;
    
    // Only update if dimensions actually changed to prevent loops
    if (currentViewport.canvasWidth !== targetWidth || 
        currentViewport.canvasHeight !== targetHeight) {
      const newViewport = {
        ...currentViewport,
        canvasWidth: targetWidth,
        canvasHeight: targetHeight
      };
      
      setViewport(newViewport);
      console.log('📐 Updated canvas size:', { width: targetWidth, height: targetHeight });
    }
  }, [setViewport]);

  const sendResizeAction = useCallback(() => {
    if (!isConnected) {
      // Not connected - just update local canvas
      updateCanvasSize();
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
  }, [isConnected, sendWhiteboardAction, userId, updateCanvasSize]);

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

  // Initialize canvas size on mount and force full size when offline
  useEffect(() => {
    if (!isInitialized.current) {
      console.log('🔄 Initializing canvas size to full window:', { width: window.innerWidth, height: window.innerHeight });
      updateCanvasSize(window.innerWidth, window.innerHeight);
      isInitialized.current = true;
    }
  }, [updateCanvasSize]);

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

  // Listen for incoming resize actions
  useEffect(() => {
    const unsubscribe = useWhiteboardStore.subscribe(
      (state) => {
        const lastAction = state.lastAction;
        if (lastAction?.type === 'VIEWPORT_RESIZE' && lastAction.userId !== userId) {
          console.log('📥 Received resize from user:', lastAction.userId, lastAction.payload.screenSize);
          
          const currentViewport = useWhiteboardStore.getState().viewport;
          const incomingSize = lastAction.payload.screenSize;
          
          // If incoming screen size is smaller than current canvas, resize to match
          const shouldResizeWidth = incomingSize.width < (currentViewport.canvasWidth || window.innerWidth);
          const shouldResizeHeight = incomingSize.height < (currentViewport.canvasHeight || window.innerHeight);
          
          if (shouldResizeWidth || shouldResizeHeight) {
            const newWidth = shouldResizeWidth ? incomingSize.width : currentViewport.canvasWidth;
            const newHeight = shouldResizeHeight ? incomingSize.height : currentViewport.canvasHeight;
            
            console.log('📐 Resizing canvas to smaller size:', { newWidth, newHeight });
            updateCanvasSize(newWidth, newHeight);
          }
        }
      }
    );

    return unsubscribe;
  }, [userId, updateCanvasSize]);

  return {
    updateCanvasSize
  };
};