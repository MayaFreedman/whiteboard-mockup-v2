import { useEffect, useCallback, useRef, useState } from 'react';
import { useWhiteboardStore } from '../stores/whiteboardStore';
import { useMultiplayer } from './useMultiplayer';
import { Viewport } from '../types/viewport';

interface UserScreenDimensions {
  userId: string;
  screenWidth: number;
  screenHeight: number;
  availableWidth: number;
  availableHeight: number;
}

export const useViewportSync = () => {
  const { viewport, setViewport } = useWhiteboardStore();
  const multiplayer = useMultiplayer();
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const isInitialized = useRef(false);
  const [userScreenDimensions, setUserScreenDimensions] = useState<Map<string, UserScreenDimensions>>(new Map());

  const calculateAvailableSpace = useCallback(() => {
    // Calculate available space minus UI elements
    const toolbarHeight = 64; // Toolbar height
    const sidebarWidth = 240; // Sidebar width when expanded
    const padding = 32; // Some padding
    
    const availableWidth = window.innerWidth - sidebarWidth - padding;
    const availableHeight = window.innerHeight - toolbarHeight - padding;
    
    return {
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      availableWidth: Math.max(400, availableWidth), // Minimum 400px
      availableHeight: Math.max(300, availableHeight) // Minimum 300px
    };
  }, []);

  const calculateOptimalCanvasSize = useCallback(() => {
    const isConnected = multiplayer?.isConnected && multiplayer?.connectedUserCount > 1;
    
    if (!isConnected || userScreenDimensions.size <= 1) {
      // Use full screen if alone or not connected
      const { availableWidth, availableHeight } = calculateAvailableSpace();
      return { canvasWidth: availableWidth, canvasHeight: availableHeight };
    }
    
    // Find the smallest screen dimensions across all users
    let minAvailableWidth = Infinity;
    let minAvailableHeight = Infinity;
    
    userScreenDimensions.forEach((dimensions) => {
      minAvailableWidth = Math.min(minAvailableWidth, dimensions.availableWidth);
      minAvailableHeight = Math.min(minAvailableHeight, dimensions.availableHeight);
    });
    
    // Include current user's dimensions
    const currentDimensions = calculateAvailableSpace();
    minAvailableWidth = Math.min(minAvailableWidth, currentDimensions.availableWidth);
    minAvailableHeight = Math.min(minAvailableHeight, currentDimensions.availableHeight);
    
    return {
      canvasWidth: Math.max(400, minAvailableWidth),
      canvasHeight: Math.max(300, minAvailableHeight)
    };
  }, [userScreenDimensions, multiplayer, calculateAvailableSpace]);

  const broadcastScreenDimensions = useCallback(() => {
    if (!multiplayer?.serverInstance?.server?.room) return;
    
    const dimensions = calculateAvailableSpace();
    const screenDimensionsData: UserScreenDimensions = {
      userId: multiplayer.serverInstance.server.room.sessionId,
      ...dimensions
    };
    
    try {
      multiplayer.serverInstance.server.room.send('screen_dimensions', screenDimensionsData);
    } catch (error) {
      console.error('Failed to broadcast screen dimensions:', error);
    }
  }, [multiplayer, calculateAvailableSpace]);

  const syncCanvasSizeToRoom = useCallback(() => {
    if (!multiplayer?.serverInstance?.server?.room || !multiplayer.isConnected) return;
    
    const { canvasWidth, canvasHeight } = calculateOptimalCanvasSize();
    const newViewport = {
      ...viewport,
      canvasWidth,
      canvasHeight
    };
    
    try {
      multiplayer.serverInstance.server.room.send('viewport_sync', {
        viewport: newViewport,
        timestamp: Date.now()
      });
      
      setViewport(newViewport);
    } catch (error) {
      console.error('Failed to sync canvas size:', error);
    }
  }, [multiplayer, viewport, setViewport, calculateOptimalCanvasSize]);

  const handleWindowResize = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      // Always broadcast new screen dimensions
      broadcastScreenDimensions();
      
      // Calculate and apply new canvas size
      const { canvasWidth, canvasHeight } = calculateOptimalCanvasSize();
      const newViewport = {
        ...viewport,
        canvasWidth,
        canvasHeight
      };
      
      setViewport(newViewport);
      
      // Only the first user (or if alone) syncs canvas size to prevent conflicts
      const isFirstUser = !multiplayer?.connectedUserCount || multiplayer.connectedUserCount <= 1;
      if (isFirstUser && multiplayer?.isConnected) {
        syncCanvasSizeToRoom();
      }
    }, 300);
  }, [viewport, setViewport, multiplayer, calculateOptimalCanvasSize, broadcastScreenDimensions, syncCanvasSizeToRoom]);

  const handleReceivedViewport = useCallback((receivedViewport: Viewport) => {
    if (receivedViewport.canvasWidth && receivedViewport.canvasHeight) {
      setViewport(receivedViewport);
    }
  }, [setViewport]);

  const handleReceivedScreenDimensions = useCallback((dimensions: UserScreenDimensions) => {
    setUserScreenDimensions(prev => {
      const updated = new Map(prev);
      updated.set(dimensions.userId, dimensions);
      return updated;
    });
    
    // Recalculate canvas size with new dimensions
    setTimeout(() => {
      const { canvasWidth, canvasHeight } = calculateOptimalCanvasSize();
      setViewport({
        ...viewport,
        canvasWidth,
        canvasHeight
      });
    }, 100);
  }, [setViewport, calculateOptimalCanvasSize, viewport]);

  // Initialize canvas size on mount
  useEffect(() => {
    if (!isInitialized.current) {
      const { canvasWidth, canvasHeight } = calculateOptimalCanvasSize();
      setViewport({
        ...viewport,
        canvasWidth,
        canvasHeight
      });
      isInitialized.current = true;
      
      // Broadcast initial screen dimensions if connected
      if (multiplayer?.isConnected) {
        broadcastScreenDimensions();
      }
    }
  }, [calculateOptimalCanvasSize, setViewport, viewport, multiplayer, broadcastScreenDimensions]);

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

  // Listen for viewport and screen dimension messages
  useEffect(() => {
    if (!multiplayer?.serverInstance?.server?.room) return;

    const room = multiplayer.serverInstance.server.room;

    const handleViewportSync = (message: any) => {
      handleReceivedViewport(message.viewport);
    };

    const handleScreenDimensions = (dimensions: UserScreenDimensions) => {
      handleReceivedScreenDimensions(dimensions);
    };

    room.onMessage('viewport_sync', handleViewportSync);
    room.onMessage('screen_dimensions', handleScreenDimensions);
    
    return () => {
      room.removeAllListeners('viewport_sync');
      room.removeAllListeners('screen_dimensions');
    };
  }, [multiplayer?.serverInstance, handleReceivedViewport, handleReceivedScreenDimensions]);

  // Broadcast screen dimensions when connecting
  useEffect(() => {
    if (multiplayer?.isConnected) {
      broadcastScreenDimensions();
    }
  }, [multiplayer?.isConnected, broadcastScreenDimensions]);

  // Clean up user dimensions when they disconnect
  useEffect(() => {
    if (!multiplayer?.isConnected) {
      setUserScreenDimensions(new Map());
    }
  }, [multiplayer?.isConnected]);

  return {
    syncCanvasSizeToRoom,
    handleReceivedViewport,
    userScreenDimensions: userScreenDimensions.size
  };
};