
import { useContext } from 'react';
import { MultiplayerContext } from '../contexts/MultiplayerContext';

export const useMultiplayer = () => {
  const context = useContext(MultiplayerContext);
  // Return null if not in multiplayer context (allows hook to work in non-multiplayer scenarios)
  return context;
};
