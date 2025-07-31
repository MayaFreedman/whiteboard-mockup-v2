import { useEffect, useCallback, useRef } from 'react';
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

  const calculateAvailableSpace = useCallback(() => {
    // Return full screen dimensions for full-screen canvas
    return {
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      availableWidth: window.innerWidth,
      availableHeight: window.innerHeight
    };
  }, []);

  const calculateOptimalCanvasSize = useCallback((otherUserDimensions?: UserScreenDimensions) => {
    const isConnected = multiplayer?.isConnected && multiplayer?.connectedUserCount > 1;
    
    if (!isConnected) {
      // Use full screen if not connected
      const { availableWidth, availableHeight } = calculateAvailableSpace();
      return { canvasWidth: availableWidth, canvasHeight: availableHeight };
    }
    
    // Get current user's dimensions
    const currentDimensions = calculateAvailableSpace();
    let minAvailableWidth = currentDimensions.availableWidth;
    let minAvailableHeight = currentDimensions.availableHeight;
    
    // If we have other user dimensions, include them in calculation
    if (otherUserDimensions) {
      minAvailableWidth = Math.min(minAvailableWidth, otherUserDimensions.availableWidth);
      minAvailableHeight = Math.min(minAvailableHeight, otherUserDimensions.availableHeight);
    }
    
    return {
      canvasWidth: Math.max(400, minAvailableWidth),
      canvasHeight: Math.max(300, minAvailableHeight)
    };
  }, [multiplayer, calculateAvailableSpace]);

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
    
    if (!multiplayer?.serverInstance?.server?.room) return;
    
    const sessionId = multiplayer.serverInstance.server.room.sessionId;
    
    // Get all currently connected users from Colyseus room state
    const connectedUsers = Array.from(multiplayer.serverInstance.server.room.state.players?.keys() || []);
    connectedUsers.push(sessionId); // Include current user
    connectedUsers.sort();
    
    const isAuthoritative = connectedUsers[0] === sessionId;
    
    console.log('📏 User authority check:', { 
      mySessionId: sessionId, 
      allConnectedUsers: connectedUsers, 
      isAuthoritative,
      receivedFrom: dimensions.userId
    });
    
    // Immediately recalculate canvas size with the new dimension
    if (isAuthoritative) {
      console.log('📏 Acting as authoritative user - recalculating with new dimensions');
      
      // Calculate optimal size including the received dimensions
      const optimalSize = calculateOptimalCanvasSize(dimensions);
      
      const newViewport = {
        ...viewport,
        canvasWidth: optimalSize.canvasWidth,
        canvasHeight: optimalSize.canvasHeight
      };
      
      // Update local viewport
      setViewport(newViewport);
      
      // Broadcast the new viewport
      const timestamp = Date.now();
      if (timestamp - lastBroadcastTimestamp.current >= 200) {
        lastBroadcastTimestamp.current = timestamp;
        
        try {
          multiplayer.serverInstance.server.room.send("broadcast", {
            type: 'viewport_sync',
            viewport: newViewport,
            timestamp,
            source: 'dimension_update'
          });
          console.log('📡 Broadcasted viewport update after dimension change:', newViewport);
        } catch (error) {
          console.error('Failed to broadcast viewport after dimension update:', error);
        }
      }
    } else {
      console.log('📏 Non-authoritative user - waiting for viewport update from authority');
    }
  }, [multiplayer, calculateOptimalCanvasSize, viewport, setViewport]);

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

  return {
    syncCanvasSizeToRoom,
    handleReceivedViewport,
    connectedUserCount: multiplayer?.connectedUserCount || 0
  };
};