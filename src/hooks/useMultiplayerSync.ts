import { useContext } from 'react'
import { MultiplayerContext } from '../contexts/MultiplayerContext'

/**
 * Consumer hook for multiplayer sync - now pulls data from singleton provider
 */
export const useMultiplayerSync = () => {
  const multiplayerContext = useContext(MultiplayerContext)

  // If no multiplayer context, return null values (graceful degradation)
  if (!multiplayerContext) {
    return {
      isConnected: false,
      serverInstance: null,
      sendWhiteboardAction: () => {},
      isWaitingForInitialState: false,
    }
  }

  const { serverInstance, isConnected, sendWhiteboardAction, isWaitingForInitialState } = multiplayerContext

  return {
    isConnected,
    serverInstance,
    sendWhiteboardAction,
    isWaitingForInitialState,
  }
}
