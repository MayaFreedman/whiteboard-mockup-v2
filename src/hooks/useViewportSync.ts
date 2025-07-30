import { useEffect, useCallback, useRef, useState } from 'react';
import { useWhiteboardStore } from '../stores/whiteboardStore';
import { useMultiplayer } from './useMultiplayer';
import { Viewport } from '../types/viewport';

// Simple calculation: use full screen minus minimal UI space
const getScreenDimensions = () => {
  // Just use full window with minimal padding for any UI
  const padding = 20; // Small padding
  
  const availableWidth = window.innerWidth - padding;
  const availableHeight = window.innerHeight - padding;
  
  console.log('📐 Full screen dimensions:', {
    window: { width: window.innerWidth, height: window.innerHeight },
    available: { width: availableWidth, height: availableHeight },
    padding
  });
  
  return {
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    availableWidth: Math.max(300, availableWidth),
    availableHeight: Math.max(200, availableHeight)
  };
};

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
    return getScreenDimensions();
  }, []);

  const calculateOptimalCanvasSize = useCallback(() => {
    const isMultiplayer = multiplayer?.isConnected && userScreenDimensions.size > 0;
    const currentDimensions = calculateAvailableSpace();
    
    console.log('🎯 Calculating canvas size:', {
      isMultiplayer,
      userCount: userScreenDimensions.size,
      currentDimensions
    });
    
    if (!isMultiplayer) {
      // Single user: use full screen
      console.log('🎯 Single user mode - using full screen');
      return { 
        canvasWidth: currentDimensions.availableWidth, 
        canvasHeight: currentDimensions.availableHeight 
      };
    }
    
    // Multiplayer: find the smallest device's FULL SCREEN dimensions
    let smallestScreenWidth = currentDimensions.screenWidth;
    let smallestScreenHeight = currentDimensions.screenHeight;
    let smallestUserId = 'current';
    
    userScreenDimensions.forEach((dims, userId) => {
      console.log(`🎯 User ${userId} screen:`, { 
        screen: { width: dims.screenWidth, height: dims.screenHeight },
        available: { width: dims.availableWidth, height: dims.availableHeight }
      });
      
      // Find smallest by total screen area
      const currentArea = smallestScreenWidth * smallestScreenHeight;
      const userArea = dims.screenWidth * dims.screenHeight;
      
      if (userArea < currentArea) {
        smallestScreenWidth = dims.screenWidth;
        smallestScreenHeight = dims.screenHeight;
        smallestUserId = userId;
      }
    });
    
    // Use the smallest device's full screen dimensions (minus small padding)
    const padding = 20;
    const result = {
      canvasWidth: Math.max(300, smallestScreenWidth - padding),
      canvasHeight: Math.max(200, smallestScreenHeight - padding)
    };
    
    console.log('🎯 Multiplayer result - using smallest device full screen:', {
      ...result,
      smallestUserId,
      smallestDevice: { width: smallestScreenWidth, height: smallestScreenHeight },
      padding
    });
    
    return result;
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
      
      // Broadcast new screen dimensions first (if connected)
      if (multiplayer?.isConnected) {
        broadcastScreenDimensions();
      }
      
      // Use the unified calculation function
      const { canvasWidth, canvasHeight } = calculateOptimalCanvasSize();
      
      const newViewport = {
        ...viewport,
        canvasWidth,
        canvasHeight
      };
      
      console.log('🔄 Window resize - updating viewport:', {
        old: { width: viewport.canvasWidth, height: viewport.canvasHeight },
        new: { canvasWidth, canvasHeight }
      });
      
      // Update local viewport immediately
      setViewport(newViewport);
      
      // Broadcast to multiplayer room (if connected)
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
            console.log('🔄 Broadcasted viewport sync after resize');
          } catch (error) {
            console.error('Failed to sync canvas size after resize:', error);
          }
        }
      }
    }, 300);
  }, [viewport, setViewport, multiplayer, calculateOptimalCanvasSize, broadcastScreenDimensions]);

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
    console.log('📡 Received screen dimensions from user:', dimensions);
    
    setUserScreenDimensions(prev => {
      const updated = new Map(prev);
      updated.set(dimensions.userId, dimensions);
      
      console.log('📡 Updated user screen dimensions map:', {
        totalUsers: updated.size,
        users: Array.from(updated.entries()).map(([userId, dims]) => ({
          userId,
          available: { width: dims.availableWidth, height: dims.availableHeight }
        }))
      });
      
      // Immediately recalculate using the unified function
      setTimeout(() => {
        const { canvasWidth, canvasHeight } = calculateOptimalCanvasSize();
        
        const newViewport = {
          ...viewport,
          canvasWidth,
          canvasHeight
        };
        
        console.log('📡 Recalculated canvas size after dimension update:', {
          old: { width: viewport.canvasWidth, height: viewport.canvasHeight },
          new: { canvasWidth, canvasHeight }
        });
        
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
              console.log('📡 Broadcasted viewport sync after dimension update');
            } catch (error) {
              console.error('Failed to sync canvas size after dimension update:', error);
            }
          }
        }
      }, 50);
      
      return updated;
    });
  }, [setViewport, viewport, calculateOptimalCanvasSize, multiplayer]);

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