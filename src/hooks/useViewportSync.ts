import { useEffect, useCallback, useRef, useState } from 'react';
import { useWhiteboardStore } from '../stores/whiteboardStore';
import { useMultiplayer } from './useMultiplayer';
import { Viewport } from '../types/viewport';

// Utility to detect if we're running in an iframe
const isInIframe = () => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
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
    const inIframe = isInIframe();
    
    console.log('📐 Calculating available space:', {
      inIframe,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight
    });
    
    if (inIframe) {
      // In iframe context - use full window dimensions with minimal padding
      const padding = 16; // Minimal padding for iframe
      const availableWidth = window.innerWidth - padding;
      const availableHeight = window.innerHeight - padding;
      
      console.log('📐 Iframe calculation:', {
        availableWidth,
        availableHeight,
        padding
      });
      
      return {
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        availableWidth: Math.max(300, availableWidth),
        availableHeight: Math.max(200, availableHeight)
      };
    } else {
      // Full page context - account for UI elements
      const toolbarHeight = 64;
      const sidebarWidth = 240;
      const padding = 32;
      
      const availableWidth = window.innerWidth - sidebarWidth - padding;
      const availableHeight = window.innerHeight - toolbarHeight - padding;
      
      console.log('📐 Full page calculation:', {
        availableWidth,
        availableHeight,
        toolbarHeight,
        sidebarWidth,
        padding
      });
      
      return {
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        availableWidth: Math.max(400, availableWidth),
        availableHeight: Math.max(300, availableHeight)
      };
    }
  }, []);

  const calculateOptimalCanvasSize = useCallback(() => {
    const isConnected = multiplayer?.isConnected && multiplayer?.connectedUserCount > 1;
    const currentDimensions = calculateAvailableSpace();
    
    console.log('🎯 Calculating optimal canvas size:', {
      isConnected,
      connectedUserCount: multiplayer?.connectedUserCount,
      userScreenDimensionsCount: userScreenDimensions.size,
      currentDimensions
    });
    
    if (!isConnected || userScreenDimensions.size === 0) {
      // Single user mode - use current user's full available space
      const result = { 
        canvasWidth: currentDimensions.availableWidth, 
        canvasHeight: currentDimensions.availableHeight 
      };
      
      console.log('🎯 Single user mode result:', result);
      return result;
    }
    
    // Multi-user mode - find the smallest dimensions across all users
    let minAvailableWidth = currentDimensions.availableWidth;
    let minAvailableHeight = currentDimensions.availableHeight;
    
    console.log('🎯 Starting with current user dimensions:', {
      minAvailableWidth,
      minAvailableHeight
    });
    
    userScreenDimensions.forEach((dimensions, userId) => {
      console.log(`🎯 Comparing with user ${userId}:`, dimensions);
      minAvailableWidth = Math.min(minAvailableWidth, dimensions.availableWidth);
      minAvailableHeight = Math.min(minAvailableHeight, dimensions.availableHeight);
    });
    
    // Apply minimum constraints
    const inIframe = isInIframe();
    const minWidth = inIframe ? 300 : 400;
    const minHeight = inIframe ? 200 : 300;
    
    const result = {
      canvasWidth: Math.max(minWidth, minAvailableWidth),
      canvasHeight: Math.max(minHeight, minAvailableHeight)
    };
    
    console.log('🎯 Multi-user mode result:', {
      ...result,
      appliedMinConstraints: { minWidth, minHeight },
      beforeConstraints: { minAvailableWidth, minAvailableHeight }
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