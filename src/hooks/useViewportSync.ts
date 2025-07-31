import { useEffect, useCallback, useRef } from 'react';
import { useWhiteboardStore } from '../stores/whiteboardStore';
import { useMultiplayer } from './useMultiplayer';

interface UserDimensions {
  userId: string;
  availableWidth: number;
  availableHeight: number;
  timestamp: number;
}

export const useViewportSync = () => {
  const { viewport, setViewport } = useWhiteboardStore();
  const multiplayer = useMultiplayer();
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const isInitialized = useRef(false);
  const userDimensionsRef = useRef<Map<string, UserDimensions>>(new Map());

  const calculateAvailableSpace = useCallback(() => {
    return {
      availableWidth: window.innerWidth,
      availableHeight: window.innerHeight
    };
  }, []);

  const calculateOptimalCanvasSize = useCallback(() => {
    const isConnected = multiplayer?.isConnected && multiplayer?.connectedUserCount > 1;
    
    if (!isConnected) {
      // Use full screen if not connected
      const { availableWidth, availableHeight } = calculateAvailableSpace();
      return { canvasWidth: availableWidth, canvasHeight: availableHeight };
    }
    
    // When connected, calculate minimum across all known user dimensions
    const allDimensions = Array.from(userDimensionsRef.current.values());
    const currentDimensions = calculateAvailableSpace();
    
    // Add current user's dimensions
    const allSizes = [
      ...allDimensions.map(d => ({ width: d.availableWidth, height: d.availableHeight })),
      { width: currentDimensions.availableWidth, height: currentDimensions.availableHeight }
    ];
    
    if (allSizes.length === 0) {
      return { canvasWidth: currentDimensions.availableWidth, canvasHeight: currentDimensions.availableHeight };
    }
    
    // Find minimum available space across all users
    const minAvailableWidth = Math.min(...allSizes.map(s => s.width));
    const minAvailableHeight = Math.min(...allSizes.map(s => s.height));
    
    return {
      canvasWidth: Math.max(400, minAvailableWidth),
      canvasHeight: Math.max(300, minAvailableHeight)
    };
  }, [multiplayer, calculateAvailableSpace]);

  const broadcastMyDimensions = useCallback(() => {
    if (!multiplayer?.isConnected || !multiplayer?.serverInstance?.server?.room) {
      return;
    }

    const currentDimensions = calculateAvailableSpace();
    const sessionId = multiplayer.serverInstance.server.room.sessionId;
    const timestamp = Date.now();
    
    const dimensionData: UserDimensions = {
      userId: sessionId,
      ...currentDimensions,
      timestamp
    };

    // Update local dimensions map
    userDimensionsRef.current.set(sessionId, dimensionData);

    // Broadcast my dimensions to everyone
    multiplayer.serverInstance.server.room.send("broadcast", {
      type: 'user_dimensions',
      data: dimensionData,
      timestamp
    });
    
    console.log('📤 Broadcasted my dimensions:', dimensionData);
    
    // Recalculate and update canvas size
    updateCanvasSize();
  }, [multiplayer, calculateAvailableSpace]);

  const updateCanvasSize = useCallback(() => {
    const optimalSize = calculateOptimalCanvasSize();
    const newViewport = {
      ...useWhiteboardStore.getState().viewport,
      canvasWidth: optimalSize.canvasWidth,
      canvasHeight: optimalSize.canvasHeight
    };
    
    setViewport(newViewport);
    console.log('📐 Updated canvas size:', optimalSize);
  }, [calculateOptimalCanvasSize, setViewport]);

  const handleReceivedDimensions = useCallback((data: UserDimensions) => {
    console.log('📥 Received dimensions from user:', data);
    
    // Update dimensions for this user
    userDimensionsRef.current.set(data.userId, data);
    
    // Recalculate canvas size with new dimensions
    updateCanvasSize();
  }, [updateCanvasSize]);

  const handleUserLeft = useCallback((userId: string) => {
    console.log('👋 User left, removing dimensions:', userId);
    userDimensionsRef.current.delete(userId);
    updateCanvasSize();
  }, [updateCanvasSize]);

  const handleWindowResize = useCallback(() => {
    console.log('🔄 Window resize triggered');
    
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      console.log('🔄 Processing window resize after debounce');
      broadcastMyDimensions();
    }, 300);
  }, [broadcastMyDimensions]);

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
    }
  }, [calculateOptimalCanvasSize, setViewport, viewport]);

  // Broadcast dimensions when connecting
  useEffect(() => {
    if (multiplayer?.isConnected && isInitialized.current) {
      // Small delay to ensure connection is fully established
      setTimeout(() => {
        broadcastMyDimensions();
      }, 100);
    }
  }, [multiplayer?.isConnected, broadcastMyDimensions]);

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

  // Listen for broadcast messages
  useEffect(() => {
    if (!multiplayer?.serverInstance?.server?.room) return;

    const room = multiplayer.serverInstance.server.room;

    const handleBroadcastMessage = (message: any) => {
      console.log('📥 Received broadcast message:', message);
      
      if (message.type === 'user_dimensions') {
        handleReceivedDimensions(message.data);
      }
    };

    room.onMessage('broadcast', handleBroadcastMessage);
    
    return () => {
      room.removeAllListeners('broadcast');
    };
  }, [multiplayer?.serverInstance, handleReceivedDimensions]);

  // Clean up when disconnecting
  useEffect(() => {
    if (!multiplayer?.isConnected) {
      userDimensionsRef.current.clear();
    }
  }, [multiplayer?.isConnected]);

  return {
    connectedUserCount: multiplayer?.connectedUserCount || 0,
    broadcastMyDimensions,
    updateCanvasSize
  };
};