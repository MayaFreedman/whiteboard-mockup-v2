
import { useEffect, useRef, useCallback } from 'react';
import { useWhiteboardStore } from '../stores/whiteboardStore';
import { useMultiplayer } from './useMultiplayer';
import { Viewport } from '../types/viewport';
import { nanoid } from 'nanoid';

export const useViewportSync = () => {
  const multiplayer = useMultiplayer();
  const whiteboardStore = useWhiteboardStore();
  const lastSentViewportRef = useRef<Viewport | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const isApplyingRemoteViewportRef = useRef(false);

  // Debounced viewport sender
  const sendViewportUpdate = useCallback((viewport: Viewport) => {
    if (!multiplayer?.isConnected || !multiplayer.sendWhiteboardAction) {
      return;
    }

    // Skip if this is the same viewport we just sent
    if (lastSentViewportRef.current && 
        lastSentViewportRef.current.x === viewport.x &&
        lastSentViewportRef.current.y === viewport.y &&
        lastSentViewportRef.current.zoom === viewport.zoom) {
      return;
    }

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Debounce the viewport update
    debounceTimeoutRef.current = setTimeout(() => {
      try {
        const action = {
          type: 'UPDATE_VIEWPORT' as const,
          payload: { viewport },
          timestamp: Date.now(),
          id: nanoid(),
          userId: 'local'
        };

        multiplayer.sendWhiteboardAction(action);
        lastSentViewportRef.current = { ...viewport };
        console.log('📡 Sent viewport update:', viewport);
      } catch (error) {
        console.error('❌ Failed to send viewport update:', error);
      }
    }, 150); // 150ms debounce
  }, [multiplayer]);

  // Apply remote viewport changes
  const applyRemoteViewport = useCallback((viewport: Viewport) => {
    if (isApplyingRemoteViewportRef.current) {
      return; // Prevent feedback loops
    }

    isApplyingRemoteViewportRef.current = true;
    console.log('📥 Applying remote viewport:', viewport);
    
    whiteboardStore.setViewport(viewport);
    lastSentViewportRef.current = { ...viewport };
    
    // Reset flag after a short delay
    setTimeout(() => {
      isApplyingRemoteViewportRef.current = false;
    }, 100);
  }, [whiteboardStore]);

  // Subscribe to local viewport changes
  useEffect(() => {
    if (!multiplayer?.isConnected) {
      return;
    }

    const unsubscribe = useWhiteboardStore.subscribe((state) => {
      // Skip if we're applying a remote viewport change
      if (isApplyingRemoteViewportRef.current) {
        return;
      }

      const currentViewport = state.viewport;
      sendViewportUpdate(currentViewport);
    });

    return unsubscribe;
  }, [multiplayer?.isConnected, sendViewportUpdate]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    applyRemoteViewport,
    isConnected: multiplayer?.isConnected || false
  };
};
