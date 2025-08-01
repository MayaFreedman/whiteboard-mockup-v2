import { useEffect, useContext, useRef, useState } from 'react'
import { useWhiteboardStore } from '../stores/whiteboardStore'
import { useUser } from '../contexts/UserContext'
import { WhiteboardAction } from '../types/whiteboard'
import { MultiplayerContext } from '../contexts/MultiplayerContext'
import { useStateSync } from './multiplayer/useStateSync'
import { useStateRequester } from './multiplayer/useStateRequester'
import { useMessageHandlers } from './multiplayer/useMessageHandlers'

/**
 * Determines if an action should be synchronized across multiplayer clients
 */
const shouldSyncAction = (action: WhiteboardAction, whiteboardStore: any): boolean => {
  const localOnlyActions = ['SELECT_OBJECTS', 'CLEAR_SELECTION']
  
  if (action.type === 'UPDATE_OBJECT') {
    const currentBatch = whiteboardStore.getState().currentBatch
    if (currentBatch.id) {
      return false
    }
  }
  
  return !localOnlyActions.includes(action.type)
}

export const useMultiplayerSync = () => {
  const multiplayerContext = useContext(MultiplayerContext)
  const whiteboardStore = useWhiteboardStore()
  const { userId } = useUser()
  const sentActionIdsRef = useRef<Set<string>>(new Set())
  const [isWaitingForInitialState, setIsWaitingForInitialState] = useState(false)

  // If no multiplayer context, return null values (graceful degradation)
  if (!multiplayerContext) {
    return {
      isConnected: false,
      serverInstance: null,
      sendWhiteboardAction: () => {},
      isWaitingForInitialState: false,
    }
  }

  const { serverInstance, isConnected, sendWhiteboardAction, connectedUserCount } = multiplayerContext
  const sessionId = serverInstance?.server?.room?.sessionId

  // Initialize state sync hooks
  const stateSync = useStateSync(serverInstance, isConnected, sessionId)
  const { hasReceivedInitialStateRef } = useStateRequester(
    serverInstance, 
    isConnected, 
    connectedUserCount, 
    setIsWaitingForInitialState
  )

  // Set up message handlers
  useMessageHandlers(serverInstance, isConnected, sentActionIdsRef.current, {
    onStateRequest: stateSync.onStateRequest,
    onStateResponse: stateSync.onStateResponse
  })

  /**
   * Send local actions to other clients (real-time sync)
   */
  useEffect(() => {
    const unsubscribe = useWhiteboardStore.subscribe(
      (state) => {
        if (state.lastAction && !sentActionIdsRef.current.has(state.lastAction.id)) {
          // Check if this action should be synchronized
          if (!shouldSyncAction(state.lastAction, whiteboardStore)) {
            console.log('🔄 Skipping sync for local-only action:', state.lastAction.type);
            return
          }
          
          if (serverInstance && serverInstance.server?.room && isConnected) {
            try {
              console.log('📤 Syncing action:', state.lastAction.type, state.lastAction.id);
              sendWhiteboardAction(state.lastAction)
              sentActionIdsRef.current.add(state.lastAction.id)
              
              // Clean up old IDs to prevent memory leak
              if (sentActionIdsRef.current.size > 1000) {
                const idsArray = Array.from(sentActionIdsRef.current)
                const idsToKeep = idsArray.slice(-500)
                sentActionIdsRef.current = new Set(idsToKeep)
              }
            } catch (error) {
              console.error('❌ Failed to send action:', state.lastAction.id, error)
            }
          }
        }
      }
    )

    return unsubscribe
  }, [sendWhiteboardAction])


  return {
    isConnected,
    serverInstance,
    sendWhiteboardAction,
    isWaitingForInitialState: stateSync.isWaitingForInitialState,
  }
}
