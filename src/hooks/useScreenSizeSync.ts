import { useEffect, useCallback } from 'react';
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

  const broadcastScreenSize = useCallback((size: { width: number; height: number }) => {
    if (!multiplayer?.isConnected || !userId) return;

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
    
    // Update local store without triggering recalculation
    updateLocalUserScreenSize(userId, newSize);
    
    // Broadcast to other users
    broadcastScreenSize(newSize);
  }, [userId, updateLocalUserScreenSize, broadcastScreenSize, calculateUsableScreenSize]);

  // Handle initial screen size on mount and window resize
  useEffect(() => {
    const handleResize = () => {
      if (!userId) return;

      const newSize = calculateUsableScreenSize();
      
      // Update local store without triggering recalculation
      updateLocalUserScreenSize(userId, newSize);
      
      // Broadcast to other users
      broadcastScreenSize(newSize);
    };

    // Set initial screen size
    handleResize();

    // Listen for window resize events
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [userId]); // Only depend on userId, define handler inside effect

  // Send screen size when user connects to multiplayer
  useEffect(() => {
    if (multiplayer?.isConnected && userId) {
      const currentSize = calculateUsableScreenSize();
      updateLocalUserScreenSize(userId, currentSize);
      broadcastScreenSize(currentSize);
    }
  }, [multiplayer?.isConnected, userId]); // Remove function dependencies

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
  }, [multiplayer?.connectedUserCount, multiplayer?.isConnected, userId]); // Remove function dependencies

  return {
    broadcastScreenSize
  };
};