import { useEffect, useCallback, useRef } from 'react';
import { useWhiteboardStore } from '../stores/whiteboardStore';
import { useMultiplayer } from './useMultiplayer';

export const useViewportSync = () => {
  const { viewport, setViewport } = useWhiteboardStore();
  const multiplayer = useMultiplayer();
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const isInitialized = useRef(false);

  const calculateOptimalCanvasSize = useCallback(() => {
    const isConnected = multiplayer?.isConnected && multiplayer?.connectedUserCount > 1;
    
    if (!isConnected) {
      // Use full screen if not connected
      return { 
        canvasWidth: window.innerWidth, 
        canvasHeight: window.innerHeight 
      };
    }
    
    // When connected, everyone uses their own current screen size
    // This will be synchronized when anyone resizes
    return {
      canvasWidth: Math.max(400, window.innerWidth),
      canvasHeight: Math.max(300, window.innerHeight)
    };
  }, [multiplayer]);

  const broadcastResizeAndRecalculate = useCallback(() => {
    if (!multiplayer?.isConnected || !multiplayer?.serverInstance?.server?.room) {
      // Not connected - just update local canvas
      updateCanvasSize();
      return;
    }

    // Broadcast resize event to trigger recalculation everywhere
    multiplayer.serverInstance.server.room.send("broadcast", {
      type: 'viewport_sync',
      action: 'resize',
      timestamp: Date.now()
    });
    
    console.log('📤 Broadcasted resize event');
    
    // Update local canvas immediately
    updateCanvasSize();
  }, [multiplayer]);

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
    if (message.action === 'resize') {
      console.log('📥 Received resize event - recalculating canvas size');
      updateCanvasSize();
    }
  }, [updateCanvasSize]);

  const handleWindowResize = useCallback(() => {
    console.log('🔄 Window resize triggered');
    
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      console.log('🔄 Processing window resize after debounce');
      broadcastResizeAndRecalculate();
    }, 300);
  }, [broadcastResizeAndRecalculate]);

  // Initialize canvas size on mount
  useEffect(() => {
    if (!isInitialized.current) {
      updateCanvasSize();
      isInitialized.current = true;
    }
  }, [updateCanvasSize]);

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