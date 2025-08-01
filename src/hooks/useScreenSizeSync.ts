import { useEffect, useCallback } from 'react';
import { useScreenSizeStore } from '../stores/screenSizeStore';
import { useUser } from '../contexts/UserContext';
import { useMultiplayer } from './useMultiplayer';

/**
 * Hook for synchronizing screen sizes across multiplayer users
 */
export const useScreenSizeSync = () => {
  const { updateUserScreenSize, recalculateMinimumSize } = useScreenSizeStore();
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
    
    // Update local store
    updateUserScreenSize(userId, newSize);
    
    // Broadcast to other users
    broadcastScreenSize(newSize);
  }, [userId, updateUserScreenSize, broadcastScreenSize, calculateUsableScreenSize]);

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
      updateUserScreenSize(userId, currentSize);
      broadcastScreenSize(currentSize);
    }
  }, [multiplayer?.isConnected, userId, updateUserScreenSize, broadcastScreenSize, calculateUsableScreenSize]);

  return {
    broadcastScreenSize
  };
};