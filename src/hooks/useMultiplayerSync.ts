import { useEffect, useContext, useRef, useState, useCallback } from 'react'
import { useWhiteboardStore } from '../stores/whiteboardStore'
import { useUser } from '../contexts/UserContext'
import { WhiteboardAction } from '../types/whiteboard'
import { MultiplayerContext } from '../contexts/MultiplayerContext'
import { useScreenSizeStore } from '../stores/screenSizeStore'

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
  const { updateUserScreenSize } = useScreenSizeStore()
  const sentActionIdsRef = useRef<Set<string>>(new Set())
  const hasReceivedInitialStateRef = useRef(false)
  const hasRequestedStateRef = useRef(false)
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
  const isReadyToSend = useCallback(() => {
    return !!serverInstance && !!serverInstance.server?.room && isConnected
  }, [serverInstance, isConnected])

  /**
   * Request initial state from other users (only on first connection)
   */
  const requestInitialState = useCallback(() => {
    if (!isReadyToSend() || hasReceivedInitialStateRef.current || hasRequestedStateRef.current) {
      return
    }

    console.log('📤 Sending initial state request...')
    hasRequestedStateRef.current = true
    setIsWaitingForInitialState(true)
    
    try {
      serverInstance.requestInitialState()
    } catch (error) {
      console.error('❌ Failed to send state request:', error)
      hasReceivedInitialStateRef.current = true
      hasRequestedStateRef.current = false
      setIsWaitingForInitialState(false)
    }
  }, [isReadyToSend, serverInstance])

  /**
   * Set up message handlers once when connection is established
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
          console.log('📤 Sending state response with objects:', Object.keys(currentState.objects).length)
          
          // Always respond, even with empty state (so requester knows they got a response)
          setTimeout(() => {
            serverInstance.sendStateResponse(message.requesterId, currentState)
          }, Math.random() * 300 + 100)
        }
        return
      }
      
      // Handle state response messages
      if (message.type === 'state_response') {
        console.log('📥 Received state response for:', message.requesterId, 'with objects:', Object.keys(message.state?.objects || {}).length)
        
        // Only apply if this response is for us AND we haven't already applied initial state
        if (message.requesterId === room.sessionId && !hasReceivedInitialStateRef.current) {
          console.log('✅ State response is for us, applying state (first time only)')
          
          // Immediately mark as received to prevent duplicate applications
          hasReceivedInitialStateRef.current = true
          setIsWaitingForInitialState(false)
          
          // Clear any existing objects first to prevent duplicates
          whiteboardStore.clearObjects()
          
          // Apply received state using the same code path as regular multiplayer
          if (message.state?.objects && Object.keys(message.state.objects).length > 0) {
            console.log('🎯 Applying', Object.keys(message.state.objects).length, 'objects from state response')
            Object.values(message.state.objects).forEach((obj: any) => {
              // Create an ADD_OBJECT action with the original object data to preserve IDs
              const addAction: WhiteboardAction = {
                id: `sync-${obj.id}`,
                type: 'ADD_OBJECT',
                userId: obj.userId || 'unknown',
                timestamp: obj.createdAt || Date.now(),
                payload: {
                  object: {
                    ...obj,
                    createdAt: obj.createdAt || Date.now(),
                    updatedAt: obj.updatedAt || Date.now(),
                    data: obj.data || {}
                  }
                }
              }
              
              whiteboardStore.applyRemoteAction(addAction)
            })
          }
          
          if (message.state?.viewport) {
            whiteboardStore.setViewport(message.state.viewport)
          }
          
          if (message.state?.settings) {
            whiteboardStore.setSettings(message.state.settings)
          }
          
          // Apply history state if available
          if (message.state?.actionHistory && message.state?.userActionHistories) {
            console.log('🔄 Applying history state with', message.state.actionHistory.length, 'actions')
            whiteboardStore.restoreHistoryState({
              actionHistory: message.state.actionHistory,
              userActionHistories: message.state.userActionHistories,
              userHistoryIndices: message.state.userHistoryIndices || {},
              currentHistoryIndex: message.state.currentHistoryIndex || 0,
              objectRelationships: message.state.objectRelationships || {}
            })
          }
        }
        return
      }
      
      // Handle whiteboard actions
      if (message.type === 'whiteboard_action' && message.action) {
        const action: WhiteboardAction = message.action
        
        if (!sentActionIdsRef.current.has(action.id)) {
          // Handle BATCH_UPDATE actions specially
          if (action.type === 'BATCH_UPDATE') {
            console.log('🔄 Processing remote BATCH_UPDATE:', action.id?.slice(0, 8), 'with', action.payload.actions?.length, 'nested actions')
            if (action.payload.actions && Array.isArray(action.payload.actions)) {
              whiteboardStore.batchUpdate(action.payload.actions)
              sentActionIdsRef.current.add(action.id)
            }
          } else {
            whiteboardStore.applyRemoteAction(action)
            sentActionIdsRef.current.add(action.id)
          }
        }
      }
      
      // Handle state sync
      if (message.type === 'state_sync' && message.data) {
        if (message.data.actions && Array.isArray(message.data.actions)) {
          whiteboardStore.batchUpdate(message.data.actions)
        }
      }
      
      // Handle screen size updates
      if (message.type === 'screen_size_update' && message.userId && message.screenSize) {
        console.log('📥 Received screen size update from:', message.userId, message.screenSize)
        updateUserScreenSize(message.userId, message.screenSize)
      }
    }

    room.onMessage('broadcast', handleBroadcastMessage)

    return () => {
      room.onMessage('broadcast', () => {})
    }
  }, [serverInstance, isConnected, whiteboardStore, updateUserScreenSize])

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
  }, [sendWhiteboardAction, isReadyToSend, whiteboardStore])

  /**
   * Request initial state only on first connection establishment
   */
  useEffect(() => {
    if (isConnected && connectedUserCount > 1 && !hasReceivedInitialStateRef.current && !hasRequestedStateRef.current) {
      console.log('🔄 New connection with other users - requesting initial state')
      
      // Small delay to ensure room is fully initialized
      setTimeout(() => {
        requestInitialState()
      }, 100)
    }
  }, [isConnected, connectedUserCount, requestInitialState])

  /**
   * Reset state sync flags when disconnecting
   */
  useEffect(() => {
    if (!isConnected) {
      hasReceivedInitialStateRef.current = false
      hasRequestedStateRef.current = false
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