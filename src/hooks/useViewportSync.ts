import { useEffect, useCallback, useRef, useState } from 'react';
import { useWhiteboardStore } from '../stores/whiteboardStore';
import { useMultiplayer } from './useMultiplayer';
import { useUser } from '../contexts/UserContext';

export const useViewportSync = () => {
  const { viewport, setViewport } = useWhiteboardStore();
  const { userId } = useUser();
  const multiplayer = useMultiplayer();
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const isInitialized = useRef(false);
  const [userScreenSizes, setUserScreenSizes] = useState<Record<string, { width: number; height: number }>>({});

  const calculateOptimalCanvasSize = useCallback(() => {
    const isConnected = multiplayer?.isConnected && multiplayer?.connectedUserCount > 1;
    
    if (!isConnected) {
      // Use full screen if not connected
      return { 
        canvasWidth: window.innerWidth, 
        canvasHeight: window.innerHeight 
      };
    }
    
    // Include current user's screen size
    const currentUserSize = { width: window.innerWidth, height: window.innerHeight };
    const allSizes = { ...userScreenSizes, current: currentUserSize };
    
    // Find minimum dimensions among all connected users
    const screenSizes = Object.values(allSizes);
    if (screenSizes.length === 0) {
      return {
        canvasWidth: Math.max(400, window.innerWidth),
        canvasHeight: Math.max(300, window.innerHeight)
      };
    }
    
    const minWidth = Math.min(...screenSizes.map(s => s.width));
    const minHeight = Math.min(...screenSizes.map(s => s.height));
    
    return {
      canvasWidth: Math.max(400, minWidth),
      canvasHeight: Math.max(300, minHeight)
    };
  }, [multiplayer, userScreenSizes]);

  const broadcastResize = useCallback(() => {
    if (!multiplayer?.isConnected || !multiplayer?.serverInstance?.server?.room) {
      // Not connected - just update local canvas
      updateCanvasSize();
      return;
    }

    // Broadcast resize event with actual screen size and userId
    multiplayer.serverInstance.server.room.send("broadcast", {
      type: 'viewport_sync',
      action: 'resize',
      userId: userId,
      screenSize: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      timestamp: Date.now()
    });
    
    console.log('📤 Broadcasted resize event with userId:', userId);
    
    // DON'T update canvas immediately - wait for broadcast to come back
    // This ensures everyone calculates using the same updated data
  }, [multiplayer, userId]);

  const updateCanvasSize = useCallback(() => {
    const optimalSize = calculateOptimalCanvasSize();
    const currentViewport = useWhiteboardStore.getState().viewport;
    
    // Only update if dimensions actually changed to prevent loops
    if (currentViewport.canvasWidth !== optimalSize.canvasWidth || 
        currentViewport.canvasHeight !== optimalSize.canvasHeight) {
      const newViewport = {
        ...currentViewport,
        canvasWidth: optimalSize.canvasWidth,
        canvasHeight: optimalSize.canvasHeight
      };
      
      setViewport(newViewport);
      console.log('📐 Updated canvas size:', optimalSize);
    }
  }, [calculateOptimalCanvasSize, setViewport]);

  const handleViewportSyncMessage = useCallback((message: any) => {
    if ((message.action === 'resize' || message.action === 'initial_screen_size') && message.screenSize) {
      console.log('📥 Received', message.action, 'with screen size:', message.screenSize, 'from user:', message.userId);
      
      // Update screen sizes from all users (including self)
      setUserScreenSizes(prev => ({
        ...prev,
        [message.userId || 'unknown']: {
          width: message.screenSize.width,
          height: message.screenSize.height
        }
      }));
      
      // Recalculate canvas size with new information
      updateCanvasSize();
    }
  }, [updateCanvasSize]);

  const broadcastInitialScreenSize = useCallback(() => {
    if (!multiplayer?.isConnected || !multiplayer?.serverInstance?.server?.room) return;

    // Broadcast current screen size when connecting
    multiplayer.serverInstance.server.room.send("broadcast", {
      type: 'viewport_sync',
      action: 'initial_screen_size',
      userId: userId,
      screenSize: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      timestamp: Date.now()
    });
    
    console.log('📤 Broadcasted initial screen size:', { width: window.innerWidth, height: window.innerHeight });
  }, [multiplayer, userId]);

  const handleWindowResize = useCallback(() => {
    console.log('🔄 Window resize triggered');
    
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      console.log('🔄 Processing window resize after debounce');
      broadcastResize();
    }, 300);
  }, [broadcastResize]);

  // Initialize canvas size on mount
  useEffect(() => {
    if (!isInitialized.current) {
      updateCanvasSize();
      isInitialized.current = true;
    }
  }, [updateCanvasSize]);

  // Broadcast initial screen size when connecting
  useEffect(() => {
    if (multiplayer?.isConnected && isInitialized.current) {
      console.log('🔗 Connection established - broadcasting initial screen size');
      broadcastInitialScreenSize();
    }
  }, [multiplayer?.isConnected, broadcastInitialScreenSize]);

  // Recalculate canvas when user count changes
  useEffect(() => {
    if (multiplayer?.isConnected && isInitialized.current) {
      console.log('👥 Connected user count changed:', multiplayer.connectedUserCount);
      updateCanvasSize();
    }
  }, [multiplayer?.connectedUserCount, updateCanvasSize]);

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

  // Listen for viewport sync messages
  useEffect(() => {
    if (!multiplayer?.serverInstance?.server?.room) return;

    const room = multiplayer.serverInstance.server.room;

    const handleBroadcastMessage = (message: any) => {
      if (message.type === 'viewport_sync') {
        handleViewportSyncMessage(message);
      }
    };

    room.onMessage('broadcast', handleBroadcastMessage);
    
    return () => {
      room.removeAllListeners('broadcast');
    };
  }, [multiplayer?.serverInstance, handleViewportSyncMessage]);

  return {
    connectedUserCount: multiplayer?.connectedUserCount || 0,
    updateCanvasSize
  };
};