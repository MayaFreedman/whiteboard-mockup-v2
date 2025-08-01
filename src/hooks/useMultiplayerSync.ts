import { useEffect, useContext, useRef, useState } from 'react'
import { useWhiteboardStore } from '../stores/whiteboardStore'
import { useUser } from '../contexts/UserContext'
import { WhiteboardAction } from '../types/whiteboard'
import { MultiplayerContext } from '../contexts/MultiplayerContext'

/**
 * Determines if an action should be synchronized across multiplayer clients
 * Selection-related actions are kept local to each user
 */
const shouldSyncAction = (action: WhiteboardAction, whiteboardStore: any): boolean => {
  const localOnlyActions = ['SELECT_OBJECTS', 'CLEAR_SELECTION']
  
  // Don't sync individual UPDATE_OBJECT actions during any active batch operation
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
  const hasReceivedInitialStateRef = useRef(false)
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

  /**
   * Checks if the connection is ready to send messages
   */
  const isReadyToSend = () => {
    return !!serverInstance && !!serverInstance.server?.room && isConnected
  }

  /**
   * Request initial state from other users (simplified for room join only)
   */
  const requestInitialState = () => {
    if (!isReadyToSend() || hasReceivedInitialStateRef.current) {
      return
    }

    console.log('📤 Sending initial state request...')
    setIsWaitingForInitialState(true)
    
    try {
      serverInstance.requestInitialState()
    } catch (error) {
      console.error('❌ Failed to send state request:', error)
      hasReceivedInitialStateRef.current = true
      setIsWaitingForInitialState(false)
    }
  }

  /**
   * Set up message-based sync when connection is ready
   */
  useEffect(() => {
    if (!isReadyToSend()) {
      return
    }

    const room = serverInstance.server.room
    
    const handleBroadcastMessage = (message: any) => {
      // Handle state request messages
      if (message.type === 'request_state') {
        console.log('📥 Received state request from:', message.requesterId)
        if (message.requesterId !== room.sessionId) {
          const currentState = whiteboardStore.getStateSnapshot()
          const hasObjectsToShare = Object.keys(currentState.objects).length > 0
          console.log('📤 Sending state response with objects:', Object.keys(currentState.objects).length)
          
          if (hasObjectsToShare) {
            setTimeout(() => {
              serverInstance.sendStateResponse(message.requesterId, currentState)
            }, Math.random() * 300 + 100)
          }
        }
        return
      }
      
      // Handle state response messages
      if (message.type === 'state_response') {
        console.log('📥 Received state response for:', message.requesterId, 'with objects:', Object.keys(message.state?.objects || {}).length)
        if (message.requesterId === room.sessionId && !hasReceivedInitialStateRef.current) {
          console.log('✅ State response is for us, applying state')
          hasReceivedInitialStateRef.current = true
          setIsWaitingForInitialState(false)
          
          // Apply received state
          if (message.state?.objects && Object.keys(message.state.objects).length > 0) {
            const actions: WhiteboardAction[] = Object.values(message.state.objects).map((obj: any) => ({
              type: 'ADD_OBJECT',
              payload: { 
                object: {
                  ...obj,
                  createdAt: obj.createdAt || Date.now(),
                  updatedAt: obj.updatedAt || Date.now(),
                  data: obj.data || {}
                }
              },
              timestamp: obj.createdAt || Date.now(),
              id: `sync-${obj.id}`,
              userId: 'sync'
            }))
            
            if (actions.length > 0) {
              whiteboardStore.batchUpdate(actions)
            }
          }
          
          if (message.state?.viewport) {
            whiteboardStore.setViewport(message.state.viewport)
          }
          
          if (message.state?.settings) {
            whiteboardStore.setSettings(message.state.settings)
          }
        }
        return
      }
      
      // Handle whiteboard actions
      if (message.type === 'whiteboard_action' && message.action) {
        const action: WhiteboardAction = message.action
        
        if (!sentActionIdsRef.current.has(action.id)) {
          whiteboardStore.applyRemoteAction(action)
        }
      }
      
      // Handle state sync
      if (message.type === 'state_sync' && message.data) {
        if (message.data.actions && Array.isArray(message.data.actions)) {
          whiteboardStore.batchUpdate(message.data.actions)
        }
      }
    }

    room.onMessage('broadcast', handleBroadcastMessage)

    return () => {
      room.onMessage('broadcast', () => {})
    }
  }, [serverInstance, isConnected, sendWhiteboardAction, whiteboardStore, userId, connectedUserCount])

  /**
   * Send local actions to other clients (real-time sync)
   */
  useEffect(() => {
    const unsubscribe = useWhiteboardStore.subscribe(
      (state) => {
        if (state.lastAction && !sentActionIdsRef.current.has(state.lastAction.id)) {
          // Check if this action should be synchronized
          if (!shouldSyncAction(state.lastAction, whiteboardStore)) {
            return
          }
          
          if (isReadyToSend()) {
            try {
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

  /**
   * Request initial state when user count changes (room join scenario)
   */
  useEffect(() => {
    if (!isReadyToSend()) return
    
    console.log('🔄 connectedUserCount changed:', connectedUserCount, 'hasReceived:', hasReceivedInitialStateRef.current)
    
    // Only request state if we haven't received it yet and there are other users
    if (!hasReceivedInitialStateRef.current && connectedUserCount > 1) {
      console.log('📤 Requesting initial state due to user count change')
      // Small delay to ensure room is fully initialized
      setTimeout(() => {
        requestInitialState()
      }, 100)
    }
    // Note: We don't set hasReceived=true when alone - let it stay false until we actually receive state
  }, [connectedUserCount, isConnected, serverInstance])

  /**
   * Reset state sync flags when disconnecting
   */
  useEffect(() => {
    if (!isConnected) {
      hasReceivedInitialStateRef.current = false
      setIsWaitingForInitialState(false)
    }
  }, [isConnected])

  return {
    isConnected,
    serverInstance,
    sendWhiteboardAction,
    isWaitingForInitialState,
  }
}
