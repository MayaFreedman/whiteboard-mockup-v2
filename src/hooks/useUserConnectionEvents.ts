import { useEffect } from 'react';
import { useWhiteboardStore } from '../stores/whiteboardStore';
import { useMultiplayerSync } from './useMultiplayerSync';

/**
 * Hook to handle user connection/disconnection events and clean up screen sizes
 */
export const useUserConnectionEvents = () => {
  const { removeUserScreenSize } = useWhiteboardStore();
  const { serverInstance } = useMultiplayerSync();

  useEffect(() => {
    if (!serverInstance?.server) return;

    const room = serverInstance.server;

    // Listen for users leaving through state changes
    const handleStateChange = (state: any) => {
      // Track previous players to detect when someone leaves
      if (state?.players) {
        const currentPlayerIds = Object.keys(state.players);
        
        // Get all tracked screen sizes
        const trackedUserIds = Array.from(useWhiteboardStore.getState().userScreenSizes.keys());
        
        // Remove screen sizes for users no longer in the room
        trackedUserIds.forEach(userId => {
          if (!currentPlayerIds.includes(userId)) {
            console.log('👋 User left, cleaning up screen size:', userId);
            removeUserScreenSize(userId);
          }
        });
      }
    };

    // Listen for state changes to detect user departures
    if (room.onStateChange) {
      room.onStateChange(handleStateChange);
    }

    return () => {
      // Cleanup is handled automatically by Colyseus
    };
  }, [serverInstance, removeUserScreenSize]);
};