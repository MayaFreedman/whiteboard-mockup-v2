import { useEffect, useCallback, useRef } from 'react';
import { useWhiteboardStore } from '../stores/whiteboardStore';
import { useMultiplayer } from './useMultiplayer';
import { Viewport } from '../types/viewport';

export const useViewportSync = () => {
  const { viewport, setViewport } = useWhiteboardStore();
  const multiplayer = useMultiplayer();
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const isInitialized = useRef(false);

  const calculateCanvasSize = useCallback(() => {
    // Calculate available space minus UI elements
    const toolbarHeight = 64; // Toolbar height
    const sidebarWidth = 240; // Sidebar width when expanded
    const padding = 32; // Some padding
    
    const availableWidth = window.innerWidth - sidebarWidth - padding;
    const availableHeight = window.innerHeight - toolbarHeight - padding;
    
    // Set minimum canvas size
    const minWidth = 800;
    const minHeight = 600;
    
    const canvasWidth = Math.max(minWidth, availableWidth);
    const canvasHeight = Math.max(minHeight, availableHeight);
    
    return { canvasWidth, canvasHeight };
  }, []);

  const syncViewportToRoom = useCallback((newViewport: Viewport) => {
    if (!multiplayer?.serverInstance || !multiplayer.isConnected) return;
    
    try {
      multiplayer.serverInstance.server.room.send('viewport_sync', {
        viewport: newViewport,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Failed to sync viewport:', error);
    }
  }, [multiplayer]);

  const handleWindowResize = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      const { canvasWidth, canvasHeight } = calculateCanvasSize();
      
      // Only sync if we're connected and this is a meaningful change
      if (multiplayer?.isConnected && multiplayer?.connectedUsers.length > 1) {
        const newViewport = {
          ...viewport,
          canvasWidth,
          canvasHeight
        };
        
        setViewport(newViewport);
        syncViewportToRoom(newViewport);
      } else if (!multiplayer?.isConnected || multiplayer?.connectedUsers.length <= 1) {
        // Update local viewport when alone
        setViewport({
          ...viewport,
          canvasWidth,
          canvasHeight
        });
      }
    }, 300);
  }, [viewport, setViewport, multiplayer, calculateCanvasSize, syncViewportToRoom]);

  const handleReceivedViewport = useCallback((receivedViewport: Viewport) => {
    if (receivedViewport.canvasWidth && receivedViewport.canvasHeight) {
      setViewport(receivedViewport);
    }
  }, [setViewport]);

  // Initialize canvas size on mount
  useEffect(() => {
    if (!isInitialized.current) {
      const { canvasWidth, canvasHeight } = calculateCanvasSize();
      setViewport({
        ...viewport,
        canvasWidth,
        canvasHeight
      });
      isInitialized.current = true;
    }
  }, [calculateCanvasSize, setViewport, viewport]);

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

    const handleMessage = (message: any) => {
      if (message.type === 'viewport_sync') {
        handleReceivedViewport(message.viewport);
      }
    };

    multiplayer.serverInstance.server.room.onMessage('viewport_sync', handleMessage);
    
    return () => {
      if (multiplayer.serverInstance?.server?.room) {
        multiplayer.serverInstance.server.room.removeAllListeners('viewport_sync');
      }
    };
  }, [multiplayer?.serverInstance, handleReceivedViewport]);

  return {
    syncViewportToRoom,
    handleReceivedViewport
  };
};