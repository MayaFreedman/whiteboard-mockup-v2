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
      console.log('🚫 Filtering UPDATE_OBJECT during batch:', currentBatch.actionType)
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
    console.log('🔌 No multiplayer context available - running in offline mode')
    return {
      isConnected: false,
      serverInstance: null,
      sendWhiteboardAction: () => {},
      isWaitingForInitialState: false,
    }
  }

  const { serverInstance, isConnected, sendWhiteboardAction, connectedUserCount } = multiplayerContext

  // Improved readiness check with detailed logging
  const isReadyToSend = () => {
    const hasServerInstance = !!serverInstance
    const hasRoom = !!(serverInstance?.server?.room)
    const ready = hasServerInstance && hasRoom && isConnected
    
    console.log('🔍 Detailed connection readiness check:', {
      hasServerInstance,
      hasRoom,
      isConnected,
      roomId: serverInstance?.server?.room?.id || 'none',
      ready
    })
    
    return ready
  }

  // Process queued actions when connection becomes ready
  const processActionQueue = () => {
    if (actionQueueRef.current.length > 0 && isReadyToSend()) {
      console.log('📤 Processing queued actions:', actionQueueRef.current.length)
      const actionsToSend = [...actionQueueRef.current.filter(action => shouldSyncAction(action, whiteboardStore))]
      actionQueueRef.current = []
      
      actionsToSend.forEach(action => {
        console.log('📤 Sending queued action:', action.type, action.id)
        try {
          sendWhiteboardAction(action)
          sentActionIdsRef.current.add(action.id)
          console.log('✅ Successfully sent queued action:', action.id)
        } catch (error) {
          console.error('❌ Failed to send queued action:', action.id, error)
        }
      })
    }
  }

  // Improved state request function with retry logic
  const requestInitialState = () => {
    if (!isReadyToSend() || hasReceivedInitialStateRef.current) {
      return
    }

    // Set loading state when we start requesting
    if (stateRequestAttemptsRef.current === 0) {
      setIsWaitingForInitialState(true)
    }

    stateRequestAttemptsRef.current += 1
    console.log(`🔄 Requesting initial state (attempt ${stateRequestAttemptsRef.current}/${maxStateRequestAttempts})`)
    
    try {
      serverInstance.requestInitialState()
      console.log('✅ Successfully sent state request')
      
      // Set timeout for this attempt - longer timeout for later attempts
      const timeoutDuration = 3000 + (stateRequestAttemptsRef.current * 2000) // 3s, 5s, 7s
      stateRequestTimeoutRef.current = setTimeout(() => {
        console.log(`⏰ State request attempt ${stateRequestAttemptsRef.current} timed out after ${timeoutDuration}ms`)
        
        if (stateRequestAttemptsRef.current < maxStateRequestAttempts) {
          console.log('🔄 Retrying state request...')
          requestInitialState()
        } else {
          console.log('⏰ All state request attempts exhausted - proceeding without initial state')
          hasReceivedInitialStateRef.current = true
          setIsWaitingForInitialState(false)
        }
      }, timeoutDuration)
      
    } catch (error) {
      console.error('❌ Failed to send state request:', error)
      if (stateRequestAttemptsRef.current < maxStateRequestAttempts) {
        setTimeout(() => requestInitialState(), 1000) // Retry after 1 second
      } else {
        hasReceivedInitialStateRef.current = true
        setIsWaitingForInitialState(false)
      }
    }
  }

  // Set up message-based sync when connection is ready
  useEffect(() => {
    if (!isReadyToSend()) {
      console.log('🔄 Skipping message setup - not ready')
      return
    }

    const room = serverInstance.server.room
    console.log('🔄 Setting up message-based sync for room:', room.id)

    const handleBroadcastMessage = (message: any) => {
      console.log('📥 Received broadcast message:', {
        type: message.type,
        hasAction: !!message.action,
        actionId: message.action?.id,
        actionType: message.action?.type,
        actionUserId: message.action?.userId
      })
      
      // Handle state request messages
      if (message.type === 'request_state') {
        console.log('🔄 Received state request from:', message.requesterId)
        
        // Only respond if we're not the requester AND we have objects to share
        if (message.requesterId !== room.sessionId) {
          const currentState = whiteboardStore.getStateSnapshot()
          const hasObjectsToShare = Object.keys(currentState.objects).length > 0
          
          console.log('🔍 State sharing decision:', {
            isRequester: message.requesterId === room.sessionId,
            hasObjects: hasObjectsToShare,
            objectCount: Object.keys(currentState.objects).length,
            willRespond: hasObjectsToShare
          })
          
          if (hasObjectsToShare) {
            console.log('📤 Responding to state request with', Object.keys(currentState.objects).length, 'objects')
            
            // Increased random delay to better avoid conflicts
            setTimeout(() => {
              serverInstance.sendStateResponse(message.requesterId, currentState)
            }, Math.random() * 300 + 100) // 100-400ms random delay
          } else {
            console.log('🔄 Not responding to state request - no objects to share')
          }
        } else {
          console.log('🔄 Not responding to state request - we are the requester')
        }
        return
      }
      
      // Handle state response messages
      if (message.type === 'state_response') {
        console.log('📥 Received state response from another user')
        
        // Only apply if this response is for us and we haven't received initial state yet
        if (message.requesterId === room.sessionId && !hasReceivedInitialStateRef.current) {
          console.log('📥 Applying initial state from another user:', {
            objectCount: message.state?.objects ? Object.keys(message.state.objects).length : 0,
            hasViewport: !!message.state?.viewport,
            hasSettings: !!message.state?.settings
          })
          
          hasReceivedInitialStateRef.current = true
          setIsWaitingForInitialState(false)
          
          // Clear any existing timeout
          if (stateRequestTimeoutRef.current) {
            clearTimeout(stateRequestTimeoutRef.current)
            stateRequestTimeoutRef.current = undefined
          }
          
          // Apply the received state with improved object conversion
          if (message.state?.objects && Object.keys(message.state.objects).length > 0) {
            console.log('🔄 Converting and applying received objects...')
            
            // Convert objects to actions and apply them
            const actions: WhiteboardAction[] = Object.values(message.state.objects).map((obj: any) => ({
              type: 'ADD_OBJECT',
              payload: { 
                object: {
                  ...obj,
                  // Ensure all required properties are present
                  createdAt: obj.createdAt || Date.now(),
                  updatedAt: obj.updatedAt || Date.now(),
                  // Preserve all object data including brush metadata
                  data: obj.data || {}
                }
              },
              timestamp: obj.createdAt || Date.now(),
              id: `sync-${obj.id}`,
              userId: 'sync'
            }))
            
            if (actions.length > 0) {
              whiteboardStore.batchUpdate(actions)
              console.log('✅ Successfully applied initial state with', actions.length, 'objects')
            }
          }
          
          // Apply viewport if provided
          if (message.state?.viewport) {
            whiteboardStore.setViewport(message.state.viewport)
            console.log('✅ Applied viewport state')
          }
          
          // Apply settings if provided
          if (message.state?.settings) {
            whiteboardStore.setSettings(message.state.settings)
            console.log('✅ Applied settings state')
          }
        } else {
          console.log('🔄 Ignoring state response - not for us or already received initial state')
        }
        return
      }
      
      // Handle whiteboard actions
      if (message.type === 'whiteboard_action' && message.action) {
        const action: WhiteboardAction = message.action
        console.log('📥 Processing remote whiteboard action:', {
          type: action.type,
          id: action.id,
          userId: action.userId,
          fromOwnAction: sentActionIdsRef.current.has(action.id),
          isOwnUser: action.userId === userId
        })
        
        // Prevent echoing our own actions back
        if (!sentActionIdsRef.current.has(action.id)) {
          console.log('📥 Applying remote action to store:', action.type)
          whiteboardStore.applyRemoteAction(action)
        } else {
          console.log('🔄 Ignoring echo of our own action:', action.id)
        }
      }
      
      // Handle state sync
      if (message.type === 'state_sync' && message.data) {
        console.log('📥 Processing state sync with', message.data.actions?.length || 0, 'actions')
        if (message.data.actions && Array.isArray(message.data.actions)) {
          whiteboardStore.batchUpdate(message.data.actions)
        }
      }
    }

    // Set up message handler
    console.log('🔍 [SYNC] Room object details:', {
      roomId: room.id,
      sessionId: room.sessionId,
      hasOnMessage: typeof room.onMessage === 'function',
      roomObjectId: room.constructor.name,
      sameAsServerRoom: room === serverInstance.server.room
    })
    
    room.onMessage('broadcast', handleBroadcastMessage)
    console.log('✅ [SYNC] broadcast handler registered for room:', room.id)

    // Only request initial state if there are other users in the room
    if (!hasReceivedInitialStateRef.current) {
      if (connectedUserCount > 1) {
        console.log('🔄 Starting initial state request process... (other users present:', connectedUserCount, ')')
        stateRequestAttemptsRef.current = 0
        requestInitialState()
      } else {
        console.log('🏠 No other users in room - proceeding without state request')
        hasReceivedInitialStateRef.current = true
        setIsWaitingForInitialState(false)
      }
    }

    // Process any queued actions now that we're connected
    processActionQueue()

    return () => {
      console.log('🧹 Cleaning up message-based sync for room:', room.id)
      // Only remove the specific broadcast handler we added, not all listeners
      room.onMessage('broadcast', () => {}) // Replace with empty handler instead of removing all
      
      if (stateRequestTimeoutRef.current) {
        clearTimeout(stateRequestTimeoutRef.current)
        stateRequestTimeoutRef.current = undefined
      }
    }
  }, [serverInstance, isConnected, sendWhiteboardAction, whiteboardStore, userId, connectedUserCount])

  // Send local actions to other clients (with filtering)
  useEffect(() => {
    console.log('🔄 Setting up action subscription')

    const unsubscribe = useWhiteboardStore.subscribe(
      (state) => {
        if (state.lastAction && !sentActionIdsRef.current.has(state.lastAction.id)) {
          console.log('📤 New local action detected:', {
            type: state.lastAction.type,
            id: state.lastAction.id,
            userId: state.lastAction.userId,
            shouldSync: shouldSyncAction(state.lastAction, whiteboardStore),
            isReadyToSend: isReadyToSend()
          })
          
          // Check if this action should be synchronized
          if (!shouldSyncAction(state.lastAction, whiteboardStore)) {
            console.log('🔒 Action filtered - keeping local:', state.lastAction.type)
            return
          }
          
          // Send the action (including BATCH_UPDATE actions) as-is to preserve batching
          if (isReadyToSend()) {
            console.log('📤 Attempting to send action immediately:', state.lastAction.type, state.lastAction.id)
            try {
              sendWhiteboardAction(state.lastAction)
              sentActionIdsRef.current.add(state.lastAction.id)
              console.log('✅ Successfully sent action:', state.lastAction.id)
              
              // Clean up old IDs to prevent memory leak
              if (sentActionIdsRef.current.size > 1000) {
                const idsArray = Array.from(sentActionIdsRef.current)
                const idsToKeep = idsArray.slice(-500)
                sentActionIdsRef.current = new Set(idsToKeep)
              }
            } catch (error) {
              console.error('❌ Failed to send action:', state.lastAction.id, error)
              console.log('⏳ Adding failed action to queue for retry')
              actionQueueRef.current.push(state.lastAction)
            }
          } else {
            console.log('⏳ Queueing action until connection ready:', state.lastAction.type, state.lastAction.id)
            actionQueueRef.current.push(state.lastAction)
          }
        }
      }
    )

    return unsubscribe
  }, [sendWhiteboardAction])

  // Process queue when connection state changes
  useEffect(() => {
    console.log('🔄 Connection state changed, processing queue')
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
