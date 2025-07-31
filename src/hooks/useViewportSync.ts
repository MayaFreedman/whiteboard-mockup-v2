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

  // Calculate optimal canvas size based on current user's available space only
  const calculateOptimalCanvasSize = useCallback(() => {
    const isConnected = multiplayer?.isConnected && multiplayer?.connectedUserCount > 1;
    
    if (!isConnected) {
      // Use full screen if not connected
      const { availableWidth, availableHeight } = calculateAvailableSpace();
      return { canvasWidth: availableWidth, canvasHeight: availableHeight };
    }
    
    // When connected, use current user's dimensions - real calculation happens in collectAndCalculate
    const currentDimensions = calculateAvailableSpace();
    return {
      canvasWidth: Math.max(400, currentDimensions.availableWidth),
      canvasHeight: Math.max(300, currentDimensions.availableHeight)
    };
  }, [multiplayer, calculateAvailableSpace]);

  // Calculate optimal canvas size from all user dimensions
  const calculateOptimalCanvasSizeFromAll = useCallback((allDimensions: UserScreenDimensions[]) => {
    if (allDimensions.length === 0) return calculateOptimalCanvasSize();
    
    // Find minimum available space across all users
    const minAvailableWidth = Math.min(...allDimensions.map(d => d.availableWidth));
    const minAvailableHeight = Math.min(...allDimensions.map(d => d.availableHeight));
    
    return {
      canvasWidth: Math.max(400, minAvailableWidth),
      canvasHeight: Math.max(300, minAvailableHeight)
    };
  }, [calculateOptimalCanvasSize]);


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

  // Collect all current screen dimensions and calculate optimal canvas size
  const collectDimensionsAndCalculate = useCallback(() => {
    if (!multiplayer?.serverInstance?.server?.room) return;
    
    const sessionId = multiplayer.serverInstance.server.room.sessionId;
    const connectedUsers = Array.from(multiplayer.serverInstance.server.room.state.players?.keys() || []);
    connectedUsers.push(sessionId);
    connectedUsers.sort();
    
    const isAuthoritative = connectedUsers[0] === sessionId;
    
    if (isAuthoritative) {
      console.log('📤 Requesting all screen dimensions from connected users');
      
      // Request dimensions from all users
      multiplayer.serverInstance.server.room.send("broadcast", {
        type: 'request_all_dimensions',
        timestamp: Date.now(),
        requesterId: sessionId
      });
      
      // Collect responses for 300ms, then calculate
      const collectedDimensions: UserScreenDimensions[] = [];
      const currentDimensions = calculateAvailableSpace();
      collectedDimensions.push({
        userId: sessionId,
        ...currentDimensions
      });
      
      // Set up temporary listener for responses only
      const responseHandler = (message: any) => {
        if (message.type === 'dimension_response' && message.requesterId === sessionId) {
          console.log('📥 Received dimension response:', message.data);
          collectedDimensions.push(message.data);
        }
      };
      
      // Add temporary listener - DON'T remove main listener
      const room = multiplayer.serverInstance.server.room;
      room.onMessage('broadcast', responseHandler);
      
      setTimeout(() => {
        // Remove only the temporary response handler
        room.removeListener('broadcast', responseHandler);
        
        console.log('📏 Collected dimensions from all users:', collectedDimensions);
        
        // Calculate optimal size from all collected dimensions
        const optimalSize = calculateOptimalCanvasSizeFromAll(collectedDimensions);
        
        // Get current viewport to avoid stale closure
        const currentViewport = useWhiteboardStore.getState().viewport;
        const newViewport = {
          ...currentViewport,
          canvasWidth: optimalSize.canvasWidth,
          canvasHeight: optimalSize.canvasHeight
        };
        
        // Update local viewport using store directly
        useWhiteboardStore.getState().setViewport(newViewport);
        
        // Broadcast the result
        const timestamp = Date.now();
        lastBroadcastTimestamp.current = timestamp;
        
        room.send("broadcast", {
          type: 'viewport_sync',
          viewport: newViewport,
          timestamp,
          source: 'collected_dimensions'
        });
        
        console.log('📡 Broadcasted viewport after collecting all dimensions:', newViewport);
      }, 300);
    } else {
      console.log('📏 Non-authoritative user - not triggering collection');
    }
  }, [multiplayer, calculateAvailableSpace, calculateOptimalCanvasSizeFromAll]);

  const handleWindowResize = useCallback(() => {
    console.log('🔄 Window resize triggered');
    
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      console.log('🔄 Processing window resize after debounce');
      
      // Trigger collection and calculation of all dimensions
      collectDimensionsAndCalculate();
    }, 300);
  }, [collectDimensionsAndCalculate]);

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

  // Handle requests for screen dimensions
  const handleDimensionRequest = useCallback((requesterId: string) => {
    console.log('📤 Responding to dimension request from:', requesterId);
    
    if (!multiplayer?.serverInstance?.server?.room) return;
    
    const currentDimensions = calculateAvailableSpace();
    const sessionId = multiplayer.serverInstance.server.room.sessionId;
    
    const dimensionData: UserScreenDimensions = {
      userId: sessionId,
      ...currentDimensions
    };
    
    // Send response back
    multiplayer.serverInstance.server.room.send("broadcast", {
      type: 'dimension_response',
      data: dimensionData,
      timestamp: Date.now(),
      requesterId
    });
    
    console.log('📤 Sent dimension response:', dimensionData);
  }, [multiplayer, calculateAvailableSpace]);

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

  // Trigger dimension collection ONLY when first connecting (separate from initialization)
  useEffect(() => {
    if (multiplayer?.isConnected && isInitialized.current) {
      // Small delay to ensure connection is fully established
      setTimeout(() => {
        collectDimensionsAndCalculate();
      }, 100);
    }
  }, [multiplayer?.isConnected]);

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

  // Listen for broadcast messages with viewport sync and dimension requests
  useEffect(() => {
    if (!multiplayer?.serverInstance?.server?.room) return;

    const room = multiplayer.serverInstance.server.room;

    const handleBroadcastMessage = (message: any) => {
      console.log('📥 Received broadcast message (v3):', message);
      
      if (message.type === 'viewport_sync') {
        console.log('📥 Processing viewport_sync broadcast');
        handleReceivedViewport(message);
      } else if (message.type === 'request_all_dimensions') {
        console.log('📥 Processing request_all_dimensions broadcast');
        handleDimensionRequest(message.requesterId);
      }
      // Note: dimension_response is handled within collectDimensionsAndCalculate
    };

    room.onMessage('broadcast', handleBroadcastMessage);
    
    return () => {
      room.removeAllListeners('broadcast');
    };
  }, [multiplayer?.serverInstance, handleReceivedViewport, handleDimensionRequest]);


  return {
    syncCanvasSizeToRoom,
    handleReceivedViewport,
    connectedUserCount: multiplayer?.connectedUserCount || 0
  };
};