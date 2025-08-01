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
  const actionQueueRef = useRef<WhiteboardAction[]>([])
  const stateRequestTimeoutRef = useRef<NodeJS.Timeout>()
  const hasReceivedInitialStateRef = useRef(false)
  const stateRequestAttemptsRef = useRef(0)
  const maxStateRequestAttempts = 3
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
   * Process queued actions when connection becomes ready
   */
  const processActionQueue = () => {
    if (actionQueueRef.current.length > 0 && isReadyToSend()) {
      const actionsToSend = [...actionQueueRef.current.filter(action => shouldSyncAction(action, whiteboardStore))]
      actionQueueRef.current = []
      
      actionsToSend.forEach(action => {
        try {
          sendWhiteboardAction(action)
          sentActionIdsRef.current.add(action.id)
        } catch (error) {
          console.error('❌ Failed to send queued action:', action.id, error)
        }
      })
    }
  }

  /**
   * Request initial state from other users with retry logic
   */
  const requestInitialState = () => {
    if (!isReadyToSend() || hasReceivedInitialStateRef.current) {
      return
    }

    if (stateRequestAttemptsRef.current === 0) {
      setIsWaitingForInitialState(true)
    }

    stateRequestAttemptsRef.current += 1
    
    try {
      serverInstance.requestInitialState()
      
      const timeoutDuration = 3000 + (stateRequestAttemptsRef.current * 2000)
      stateRequestTimeoutRef.current = setTimeout(() => {
        if (stateRequestAttemptsRef.current < maxStateRequestAttempts) {
          requestInitialState()
        } else {
          hasReceivedInitialStateRef.current = true
          setIsWaitingForInitialState(false)
        }
      }, timeoutDuration)
      
    } catch (error) {
      console.error('❌ Failed to send state request:', error)
      if (stateRequestAttemptsRef.current < maxStateRequestAttempts) {
        setTimeout(() => requestInitialState(), 1000)
      } else {
        hasReceivedInitialStateRef.current = true
        setIsWaitingForInitialState(false)
      }
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
        if (message.requesterId !== room.sessionId) {
          const currentState = whiteboardStore.getStateSnapshot()
          const hasObjectsToShare = Object.keys(currentState.objects).length > 0
          
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
        if (message.requesterId === room.sessionId && !hasReceivedInitialStateRef.current) {
          hasReceivedInitialStateRef.current = true
          setIsWaitingForInitialState(false)
          
          if (stateRequestTimeoutRef.current) {
            clearTimeout(stateRequestTimeoutRef.current)
            stateRequestTimeoutRef.current = undefined
          }
          
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

    // Request initial state if other users are present
    if (!hasReceivedInitialStateRef.current) {
      if (connectedUserCount > 1) {
        stateRequestAttemptsRef.current = 0
        requestInitialState()
      } else {
        hasReceivedInitialStateRef.current = true
        setIsWaitingForInitialState(false)
      }
    }

    processActionQueue()

    return () => {
      room.onMessage('broadcast', () => {})
      
      if (stateRequestTimeoutRef.current) {
        clearTimeout(stateRequestTimeoutRef.current)
        stateRequestTimeoutRef.current = undefined
      }
    }
  }, [serverInstance, isConnected, sendWhiteboardAction, whiteboardStore, userId, connectedUserCount])

  /**
   * Send local actions to other clients (with filtering)
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
              actionQueueRef.current.push(state.lastAction)
            }
          } else {
            actionQueueRef.current.push(state.lastAction)
          }
        }
      }
    )

    return unsubscribe
  }, [sendWhiteboardAction])

  /**
   * Process queue when connection state changes
   */
  useEffect(() => {
    processActionQueue()
  }, [serverInstance, isConnected])

  // Reset state sync flag when disconnecting
  useEffect(() => {
    if (!isConnected) {
      hasReceivedInitialStateRef.current = false
      setIsWaitingForInitialState(false)
      if (stateRequestTimeoutRef.current) {
        clearTimeout(stateRequestTimeoutRef.current)
        stateRequestTimeoutRef.current = undefined
      }
    }
  }, [isConnected])

  return {
    isConnected,
    serverInstance,
    sendWhiteboardAction,
    isWaitingForInitialState,
  }
}
