import { useEffect, useCallback, useRef } from 'react';
import { useScreenSizeStore } from '../stores/screenSizeStore';
import { useUser } from '../contexts/UserContext';
import { useMultiplayer } from './useMultiplayer';

/**
 * Hook for synchronizing screen sizes across multiplayer users
 */
export const useScreenSizeSync = () => {
  const { updateLocalUserScreenSize, recalculateMinimumSize } = useScreenSizeStore();
  const { userId } = useUser();
  const multiplayer = useMultiplayer();
  const lastBroadcastRef = useRef<{ width: number; height: number } | null>(null);

  const calculateUsableScreenSize = useCallback(() => {
    const toolbarHeight = 60; // Approximate toolbar height
    return {
      width: window.innerWidth,
      height: window.innerHeight - toolbarHeight
    };
  }, []);

  const broadcastScreenSize = useCallback((size: { width: number; height: number }) => {
    if (!multiplayer?.isConnected || !userId) return;

    // Prevent duplicate broadcasts of the same size
    if (lastBroadcastRef.current && 
        lastBroadcastRef.current.width === size.width && 
        lastBroadcastRef.current.height === size.height) {
      return;
    }

    lastBroadcastRef.current = size;

    // Send screen size update via multiplayer
    multiplayer.serverInstance?.server?.room?.send('broadcast', {
      type: 'screen_size_update',
      userId: userId,
      screenSize: size,
      timestamp: Date.now()
    });
  }, [multiplayer, userId]);

  const handleWindowResize = useCallback(() => {
    if (!userId) return;

    const newSize = calculateUsableScreenSize();
    
    // Update local store
    updateLocalUserScreenSize(userId, newSize);
    
    // Broadcast to other users (with duplicate prevention)
    broadcastScreenSize(newSize);

    // Recalculate the minimum/shared whiteboard size locally
    recalculateMinimumSize();
  }, [userId, updateLocalUserScreenSize, broadcastScreenSize, calculateUsableScreenSize, recalculateMinimumSize]);

  // Handle window resize events only
  useEffect(() => {
    // Listen for window resize events
    window.addEventListener('resize', handleWindowResize);
    
    return () => {
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [handleWindowResize]);

  // Set initial screen size once when userId becomes available
  useEffect(() => {
    if (!userId) return;
    
    const initialSize = calculateUsableScreenSize();
    updateLocalUserScreenSize(userId, initialSize);
    recalculateMinimumSize();
  }, [userId, updateLocalUserScreenSize, calculateUsableScreenSize, recalculateMinimumSize]);

  // Handle multiplayer connection state changes
  useEffect(() => {
    if (!multiplayer?.isConnected || !userId) {
      return;
    }

    const userCount = multiplayer.connectedUserCount;
    
    if (userCount <= 1) {
      // Single player mode - ensure local size is present and apply
      console.log('📏 Single player mode - ensuring local size is active');
      const currentSize = calculateUsableScreenSize();
      updateLocalUserScreenSize(userId, currentSize);
      recalculateMinimumSize();
    } else {
      // Multi-player mode - broadcast current size and ensure local presence
      console.log('📏 Multi-player mode - broadcasting screen size');
      const currentSize = calculateUsableScreenSize();
      updateLocalUserScreenSize(userId, currentSize);
      // Force re-broadcast on participant changes so newcomers receive sizes
      lastBroadcastRef.current = null;
      broadcastScreenSize(currentSize);
      recalculateMinimumSize();
    }
  }, [multiplayer?.isConnected, multiplayer?.connectedUserCount, userId, broadcastScreenSize, calculateUsableScreenSize, updateLocalUserScreenSize, recalculateMinimumSize]);

  return {
    broadcastScreenSize
  };
};