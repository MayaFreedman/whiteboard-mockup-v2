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
  const lastBroadcastTimestamp = useRef<number>(0);
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
    console.log('🔄 Window resize triggered');
    
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      console.log('🔄 Processing window resize after debounce');
      // Always broadcast new screen dimensions first
      broadcastScreenDimensions();
      
      // Immediately recalculate canvas size with new dimensions for ALL users
      const currentDimensions = calculateAvailableSpace();
      let minAvailableWidth = currentDimensions.availableWidth;
      let minAvailableHeight = currentDimensions.availableHeight;
      
      // Include all other users' dimensions
      userScreenDimensions.forEach((userDims) => {
        minAvailableWidth = Math.min(minAvailableWidth, userDims.availableWidth);
        minAvailableHeight = Math.min(minAvailableHeight, userDims.availableHeight);
      });
      
      const newCanvasSize = {
        canvasWidth: Math.max(400, minAvailableWidth),
        canvasHeight: Math.max(300, minAvailableHeight)
      };
      
      const newViewport = {
        ...viewport,
        ...newCanvasSize
      };
      
      // Update local viewport immediately
      setViewport(newViewport);
      
      // Broadcast to multiplayer room with timestamp-based conflict resolution
      if (multiplayer?.isConnected && multiplayer?.serverInstance?.server?.room) {
        const timestamp = Date.now();
        
        // Only broadcast if enough time has passed since last broadcast (prevent spam)
        if (timestamp - lastBroadcastTimestamp.current > 100) {
          lastBroadcastTimestamp.current = timestamp;
          
          try {
            multiplayer.serverInstance.server.room.send('viewport_sync', {
              viewport: newViewport,
              timestamp,
              source: 'resize'
            });
          } catch (error) {
            console.error('Failed to sync canvas size after resize:', error);
          }
        }
      }
    }, 300);
  }, [viewport, setViewport, multiplayer, calculateOptimalCanvasSize, broadcastScreenDimensions, userScreenDimensions, calculateAvailableSpace]);

  const handleReceivedViewport = useCallback((message: { viewport: Viewport; timestamp: number; source?: string }) => {
    const { viewport: receivedViewport, timestamp, source } = message;
    
    // Conflict resolution: only accept if timestamp is newer than our last broadcast
    // or if we haven't broadcast recently (meaning we're not the one driving changes)
    const timeSinceLastBroadcast = Date.now() - lastBroadcastTimestamp.current;
    const shouldAccept = timestamp > lastBroadcastTimestamp.current || timeSinceLastBroadcast > 500;
    
    if (shouldAccept && receivedViewport.canvasWidth && receivedViewport.canvasHeight) {
      setViewport(receivedViewport);
    }
  }, [setViewport]);

  const handleReceivedScreenDimensions = useCallback((dimensions: UserScreenDimensions) => {
    setUserScreenDimensions(prev => {
      const updated = new Map(prev);
      updated.set(dimensions.userId, dimensions);
      
      // Immediately recalculate and broadcast new canvas size to everyone
      setTimeout(() => {
        const currentDimensions = calculateAvailableSpace();
        
        // Find the smallest screen dimensions across all users including current
        let minAvailableWidth = currentDimensions.availableWidth;
        let minAvailableHeight = currentDimensions.availableHeight;
        
        updated.forEach((userDims) => {
          minAvailableWidth = Math.min(minAvailableWidth, userDims.availableWidth);
          minAvailableHeight = Math.min(minAvailableHeight, userDims.availableHeight);
        });
        
        const newCanvasSize = {
          canvasWidth: Math.max(400, minAvailableWidth),
          canvasHeight: Math.max(300, minAvailableHeight)
        };
        
        const newViewport = {
          ...viewport,
          ...newCanvasSize
        };
        
        // Update local viewport
        setViewport(newViewport);
        
        // Broadcast to all users with timestamp-based conflict resolution
        if (multiplayer?.serverInstance?.server?.room) {
          const timestamp = Date.now();
          
          // Only broadcast if enough time has passed since last broadcast
          if (timestamp - lastBroadcastTimestamp.current > 100) {
            lastBroadcastTimestamp.current = timestamp;
            
            try {
              multiplayer.serverInstance.server.room.send('viewport_sync', {
                viewport: newViewport,
                timestamp,
                source: 'dimension_change'
              });
            } catch (error) {
              console.error('Failed to sync canvas size after dimension update:', error);
            }
          }
        }
      }, 50);
      
      return updated;
    });
  }, [setViewport, viewport, calculateAvailableSpace, multiplayer]);

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
      handleReceivedViewport(message);
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
      // Small delay to ensure connection is fully established
      setTimeout(() => {
        broadcastScreenDimensions();
      }, 100);
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