import { useEffect, useCallback, useRef } from 'react';
import { useScreenSizeStore } from '../stores/screenSizeStore';
import { useUser } from '../contexts/UserContext';
import { useMultiplayer } from './useMultiplayer';

/**
 * Hook for synchronizing screen sizes across multiplayer users
 */
export const useScreenSizeSync = () => {
  const { updateLocalUserScreenSize, recalculateMinimumSize, clearAllSizes } = useScreenSizeStore();
  const { userId } = useUser();
  const multiplayer = useMultiplayer();

  const calculateUsableScreenSize = useCallback(() => {
    const toolbarHeight = 60; // Approximate toolbar height
    return {
      width: window.innerWidth,
      height: window.innerHeight - toolbarHeight
    };
  }, []);

  const broadcastTimeoutRef = useRef<number | null>(null);

  const broadcastScreenSize = useCallback((size: { width: number; height: number }) => {
    if (!multiplayer?.isConnected || !userId) return;

    // Debounce broadcasts to prevent spam
    if (broadcastTimeoutRef.current) {
      window.clearTimeout(broadcastTimeoutRef.current);
    }

    broadcastTimeoutRef.current = window.setTimeout(() => {
      multiplayer.serverInstance?.server?.room?.send('broadcast', {
        type: 'screen_size_update',
        userId: userId,
        screenSize: size,
        timestamp: Date.now()
      });
    }, 100); // 100ms debounce
  }, [multiplayer, userId]);

  const handleWindowResize = useCallback(() => {
    if (!userId) return;

    const newSize = calculateUsableScreenSize();
    
    console.log('📏 Window resized, updating screen size:', newSize);
    
    // Update local store without triggering recalculation
    updateLocalUserScreenSize(userId, newSize);
    
    // Broadcast to other users
    broadcastScreenSize(newSize);
  }, [userId, updateLocalUserScreenSize, broadcastScreenSize, calculateUsableScreenSize]);

  // Handle initial screen size on mount and window resize
  useEffect(() => {
    // Set initial screen size
    handleWindowResize();

    // Listen for window resize events
    window.addEventListener('resize', handleWindowResize);
    
    return () => {
      window.removeEventListener('resize', handleWindowResize);
      if (broadcastTimeoutRef.current) {
        window.clearTimeout(broadcastTimeoutRef.current);
      }
    };
  }, [handleWindowResize]);

  // Send screen size when user connects to multiplayer
  useEffect(() => {
    if (multiplayer?.isConnected && userId) {
      const currentSize = calculateUsableScreenSize();
      updateLocalUserScreenSize(userId, currentSize);
      broadcastScreenSize(currentSize);
    }
  }, [multiplayer?.isConnected, userId, updateLocalUserScreenSize, broadcastScreenSize, calculateUsableScreenSize]);

  // Handle user departures - cleanup screen sizes and recalculate
  useEffect(() => {
    const userCount = multiplayer?.connectedUserCount ?? 0;
    
    if (multiplayer?.isConnected && userId && userCount > 0) {
      if (userCount <= 1) {
        // Single player mode - use full local screen size
        console.log('📏 Switching to single-player mode');
        clearAllSizes();
      } else if (userCount > 1) {
        // Multiple users - clear and re-broadcast to get fresh calculation
        console.log('📏 User departure detected, refreshing screen sizes');
        clearAllSizes();
        
        // Re-broadcast current size after a brief delay to ensure store is cleared
        setTimeout(() => {
          const currentSize = calculateUsableScreenSize();
          updateLocalUserScreenSize(userId, currentSize);
          broadcastScreenSize(currentSize);
        }, 50);
      }
    }
  }, [multiplayer?.connectedUserCount, multiplayer?.isConnected, userId, clearAllSizes, updateLocalUserScreenSize, broadcastScreenSize, calculateUsableScreenSize]);

  return {
    broadcastScreenSize
  };
};