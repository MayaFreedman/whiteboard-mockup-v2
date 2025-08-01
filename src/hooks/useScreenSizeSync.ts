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
  
  // Track last sent size to prevent duplicates
  const lastSentSizeRef = useRef<{ width: number; height: number } | null>(null);

  const calculateUsableScreenSize = useCallback(() => {
    const toolbarHeight = 60; // Approximate toolbar height
    return {
      width: window.innerWidth,
      height: window.innerHeight - toolbarHeight
    };
  }, []);

  const broadcastScreenSize = useCallback((size: { width: number; height: number }) => {
    if (!multiplayer?.isConnected || !userId) return;

    // Check if size has actually changed
    const lastSent = lastSentSizeRef.current;
    if (lastSent && lastSent.width === size.width && lastSent.height === size.height) {
      return; // Don't send duplicate
    }

    // Send screen size update via multiplayer
    multiplayer.serverInstance?.server?.room?.send('broadcast', {
      type: 'screen_size_update',
      userId: userId,
      screenSize: size,
      timestamp: Date.now()
    });
    
    // Track last sent size
    lastSentSizeRef.current = size;
  }, [multiplayer, userId]);

  // Handle initial screen size on mount and window resize
  useEffect(() => {
    if (!userId) return;

    const handleWindowResize = () => {
      const newSize = calculateUsableScreenSize();
      
      // Update local store without triggering recalculation
      updateLocalUserScreenSize(userId, newSize);
      
      // Broadcast to other users
      broadcastScreenSize(newSize);
    };

    // Set initial screen size
    handleWindowResize();

    // Listen for window resize events
    window.addEventListener('resize', handleWindowResize);
    
    return () => {
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [userId]); // Only depend on userId

  // Send screen size when user connects to multiplayer
  useEffect(() => {
    if (multiplayer?.isConnected && userId) {
      const currentSize = calculateUsableScreenSize();
      updateLocalUserScreenSize(userId, currentSize);
      broadcastScreenSize(currentSize);
    }
  }, [multiplayer?.isConnected, userId]); // Only depend on connection state and userId

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
  }, [multiplayer?.connectedUserCount, multiplayer?.isConnected, userId]); // Only depend on primitive values

  return {
    broadcastScreenSize
  };
};