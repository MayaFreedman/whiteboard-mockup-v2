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
    // Return full screen dimensions for full-screen canvas
    return {
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      availableWidth: window.innerWidth,
      availableHeight: window.innerHeight
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
    if (!multiplayer?.serverInstance) return;
    
    const dimensions = calculateAvailableSpace();
    const screenDimensionsData: UserScreenDimensions = {
      userId: multiplayer.serverInstance.server?.room?.sessionId || 'unknown',
      ...dimensions
    };
    
    console.log('📤 Broadcasting screen dimensions via sendEvent:', screenDimensionsData);
    
    try {
      // Use the same structure as other working messages
      multiplayer.serverInstance.server.room.send("broadcast", {
        type: 'screen_dimensions',
        timestamp: Date.now(),
        senderId: screenDimensionsData.userId,
        data: screenDimensionsData
      });
    } catch (error) {
      console.error('Failed to broadcast screen dimensions:', error);
    }
  }, [multiplayer, calculateAvailableSpace]);

  const syncCanvasSizeToRoom = useCallback(() => {
    if (!multiplayer?.isConnected || !multiplayer?.serverInstance?.server?.room) {
      console.log('📡 Cannot sync - not connected to multiplayer room');
      return;
    }

    const optimalSize = calculateOptimalCanvasSize();
    if (!optimalSize) {
      console.log('📐 No optimal size calculated - skipping sync');
      return;
    }

    console.log('📐 Calculated optimal canvas size:', optimalSize);

    const newViewport = {
      ...viewport,
      canvasWidth: optimalSize.canvasWidth,
      canvasHeight: optimalSize.canvasHeight
    };

    // Update local viewport
    setViewport(newViewport);

    // Phase 3: Broadcast authoritative viewport with conflict resolution
    const timestamp = Date.now();
    
    // Prevent spam broadcasts
    if (timestamp - lastBroadcastTimestamp.current < 200) {
      console.log('📡 Skipping broadcast - too recent');
      return;
    }
    
    lastBroadcastTimestamp.current = timestamp;

    try {
      multiplayer.serverInstance.server.room.send("broadcast", {
        type: 'viewport_sync',
        viewport: newViewport,
        timestamp,
        source: 'authoritative_sync'
      });
      console.log('📡 Broadcasted new viewport via room.send:', newViewport);
    } catch (error) {
      console.error('Failed to sync viewport:', error);
    }
  }, [multiplayer, calculateOptimalCanvasSize, viewport, setViewport]);

  const handleWindowResize = useCallback(() => {
    console.log('🔄 Window resize triggered');
    
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      console.log('🔄 Processing window resize after debounce');
      
      // Phase 1: Only broadcast new screen dimensions, don't calculate canvas size yet
      broadcastScreenDimensions();
      
      // Note: Canvas size recalculation will happen in handleReceivedScreenDimensions
      // when this user receives their own dimension broadcast, ensuring all users
      // recalculate together with the same data
    }, 300);
  }, [broadcastScreenDimensions]);

  const handleReceivedViewport = useCallback((data: { viewport: Viewport; timestamp: number; source?: string }) => {
    const { viewport: receivedViewport, timestamp, source } = data;
    
    console.log('📥 Received viewport update:', { receivedViewport, timestamp, source });
    
    // Phase 3: Conflict resolution - only apply if timestamp is newer
    if (timestamp > lastBroadcastTimestamp.current) {
      console.log('📥 Applying newer viewport update');
      setViewport(receivedViewport);
      lastBroadcastTimestamp.current = timestamp;
    } else {
      console.log('📥 Ignoring older viewport update');
    }
  }, [setViewport]);

  const handleReceivedScreenDimensions = useCallback((dimensions: UserScreenDimensions) => {
    console.log('📏 Received screen dimensions from user:', dimensions.userId, dimensions);
    
    setUserScreenDimensions(prev => {
      const updated = new Map(prev);
      updated.set(dimensions.userId, dimensions);
      
      console.log('📏 Updated dimensions cache, total users:', updated.size);
      
      // Phase 2: Collective recalculation - all users recalculate, but only one broadcasts
      // Use deterministic selection: user with lexicographically smallest userId becomes authoritative
      if (multiplayer?.serverInstance?.server?.room) {
        const sessionId = multiplayer.serverInstance.server.room.sessionId;
        
        // Get all connected session IDs and sort them - use the UPDATED dimensions
        const allSessionIds = Array.from(updated.keys());
        allSessionIds.push(sessionId); // Include current user
        allSessionIds.sort();
        
        const isAuthoritative = allSessionIds[0] === sessionId;
        
        console.log('📏 User authority check:', { 
          mySessionId: sessionId, 
          allSessions: allSessionIds, 
          isAuthoritative,
          updatedCacheSize: updated.size
        });
        
        // Small delay to ensure all dimension updates are processed
        setTimeout(() => {
          if (isAuthoritative) {
            console.log('📏 Acting as authoritative user - broadcasting new viewport');
            syncCanvasSizeToRoom();
          } else {
            console.log('📏 Non-authoritative user - waiting for viewport update');
          }
        }, 100);
      }
      
      return updated;
    });
  }, [syncCanvasSizeToRoom, multiplayer?.serverInstance?.server?.room]);

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

  // Listen for broadcast messages with viewport sync and screen dimensions
  useEffect(() => {
    if (!multiplayer?.serverInstance?.server?.room) return;

    const room = multiplayer.serverInstance.server.room;

    const handleBroadcastMessage = (message: any) => {
      console.log('📥 Received broadcast message:', message);
      
      if (message.type === 'viewport_sync') {
        console.log('📥 Processing viewport_sync broadcast');
        handleReceivedViewport(message);
      } else if (message.type === 'screen_dimensions') {
        console.log('📥 Processing screen_dimensions broadcast');
        handleReceivedScreenDimensions(message.data);
      }
    };

    room.onMessage('broadcast', handleBroadcastMessage);
    
    return () => {
      room.removeAllListeners('broadcast');
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