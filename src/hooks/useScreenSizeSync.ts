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
    // Set initial screen size
    handleWindowResize();

    // Listen for window resize events
    window.addEventListener('resize', handleWindowResize);
    
    return () => {
      window.removeEventListener('resize', handleWindowResize);
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

  // Handle user departures - cleanup screen sizes and recalculate (debounced)
  useEffect(() => {
    const userCount = multiplayer?.connectedUserCount ?? 0;
    
    if (multiplayer?.isConnected && userId && userCount > 0) {
      // Debounce rapid user count changes
      const timeoutId = setTimeout(() => {
        if (userCount <= 1) {
          // Single player mode - use full local screen size
          console.log('📏 Switching to single-player mode');
          clearAllSizes();
        } else if (userCount > 1) {
          // Multiple users - only refresh if we haven't done so recently
          console.log('📏 User count changed, refreshing screen sizes');
          clearAllSizes();
          
          // Re-broadcast current size after ensuring store is cleared
          setTimeout(() => {
            const currentSize = calculateUsableScreenSize();
            updateLocalUserScreenSize(userId, currentSize);
            broadcastScreenSize(currentSize);
          }, 100);
        }
      }, 200); // 200ms debounce
      
      return () => clearTimeout(timeoutId);
    }
  }, [multiplayer?.connectedUserCount, multiplayer?.isConnected, userId, clearAllSizes, updateLocalUserScreenSize, broadcastScreenSize, calculateUsableScreenSize]);

  return {
    broadcastScreenSize
  };
};