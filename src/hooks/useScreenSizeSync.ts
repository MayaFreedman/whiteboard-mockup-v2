/**
 * Consumer hook for screen size sync - now handled by singleton provider
 * This hook is kept for backwards compatibility but does nothing
 */
export const useScreenSizeSync = () => {
  // Screen size sync is now handled by the singleton MultiplayerProvider
  // This hook is kept for backwards compatibility but returns empty functions
  return {
    broadcastScreenSize: () => {}
  };
};