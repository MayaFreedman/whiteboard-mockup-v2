import { useEffect, useContext, useRef, useState, useCallback } from 'react'
import { useWhiteboardStore } from '../stores/whiteboardStore'
import { useUser } from '../contexts/UserContext'
import { WhiteboardAction } from '../types/whiteboard'
import { MultiplayerContext } from '../contexts/MultiplayerContext'
import { useScreenSizeStore } from '../stores/screenSizeStore'
import { addCustomBackgroundFromObject, removeCustomBackgroundById, removeCustomBackgroundByDataUrl, type CustomBackground } from '../utils/customBackgrounds'

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
  const userJoinTimeRef = useRef<number | null>(null)
  const [isWaitingForInitialState, setIsWaitingForInitialState] = useState(false)
  const handlersReadyRef = useRef(false)
  const responseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
   * Checks if user has existing whiteboard content (not genuinely new)
   */
  const hasExistingContent = useCallback(() => {
    const state = whiteboardStore.getState()
    return Object.keys(state.objects).length > 0 || state.actionHistory.length > 0
  }, [whiteboardStore])

  /**
   * Checks if user is genuinely new to the room
   */
  const isGenuinelyNewUser = useCallback(() => {
    const now = Date.now()
    const joinTime = userJoinTimeRef.current
    
    // User is new if they joined recently (within last 5 seconds) AND have no existing content
    return joinTime && (now - joinTime < 5000) && !hasExistingContent()
  }, [hasExistingContent])

  /**
   * Request initial state from other users (only on first connection)
   */
  const requestInitialState = useCallback(() => {
    if (!isReadyToSend() || hasReceivedInitialStateRef.current) {
      return
    }

    // Ensure handlers are attached before requesting
    if (!handlersReadyRef.current) {
      setTimeout(() => {
        requestInitialState()
      }, 100)
      return
    }

    if (hasRequestedStateRef.current) {
      return
    }

    console.log('📤 Sending initial state request...')
    hasRequestedStateRef.current = true
    setIsWaitingForInitialState(true)
    
    try {
      serverInstance.requestInitialState()

      // Start timeout: if no response, assume empty room and clear loader
      if (responseTimeoutRef.current) {
        clearTimeout(responseTimeoutRef.current)
      }
      responseTimeoutRef.current = setTimeout(() => {
        if (!hasReceivedInitialStateRef.current) {
          console.warn('⏳ No state response received; assuming empty room');
          // Finalize initial state attempt to avoid infinite loader/retry loop
          hasReceivedInitialStateRef.current = true;
          setIsWaitingForInitialState(false);
          // allow a future manual retry if needed (keep requested=false)
          hasRequestedStateRef.current = false;
        }
      }, 2000)
    } catch (error) {
      console.error('❌ Failed to send state request:', error)
      hasReceivedInitialStateRef.current = true
      hasRequestedStateRef.current = false
      setIsWaitingForInitialState(false)
      if (responseTimeoutRef.current) {
        clearTimeout(responseTimeoutRef.current)
        responseTimeoutRef.current = null
      }
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
        console.log('📥 Received state response for:', message.requesterId, 'with objects:', Object.keys(message.state?.objects || {}).length, ' ourSession:', room.sessionId)
        
        // Only apply if this response is for us AND we haven't already applied initial state
        if (message.requesterId === room.sessionId && !hasReceivedInitialStateRef.current) {
          console.log('✅ State response is for us, applying state (first time only)')
          
          // Immediately mark as received to prevent duplicate applications
          hasReceivedInitialStateRef.current = true
          if (responseTimeoutRef.current) {
            clearTimeout(responseTimeoutRef.current)
            responseTimeoutRef.current = null
          }
          setIsWaitingForInitialState(false)
          
          // Clear any existing objects first to prevent duplicates
          whiteboardStore.clearObjects()
          
          // Apply received state using batch update to prevent multiple redraws
          if (message.state?.objects && Object.keys(message.state.objects).length > 0) {
            console.log('🎯 Batching', Object.keys(message.state.objects).length, 'objects from state response')
            
            // Create all ADD_OBJECT actions for batch processing
            const addActions: WhiteboardAction[] = Object.values(message.state.objects).map((obj: any) => ({
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
            }))
            
            // Apply all objects in a single batch update to trigger only one redraw
            whiteboardStore.batchUpdate(addActions)
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
        
        // Prevent echo loops by marking the action as seen BEFORE applying
        if (!sentActionIdsRef.current.has(action.id)) {
          sentActionIdsRef.current.add(action.id)
          
          // Handle BATCH_UPDATE actions specially
          if (action.type === 'BATCH_UPDATE') {
            console.log('🔄 Processing remote BATCH_UPDATE:', action.id?.slice(0, 8), 'with', action.payload.actions?.length, 'nested actions')
            if (action.payload.actions && Array.isArray(action.payload.actions)) {
              // Apply updates to objects
              whiteboardStore.batchUpdate(action.payload.actions)
              // Record the batch as a single action in history for the sender
              try {
                whiteboardStore.recordAction(action)
              } catch (e) {
                console.warn('⚠️ Failed to record remote batch action in history:', e)
              }
            }
          } else {
            whiteboardStore.applyRemoteAction(action)
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
      if (message.type === 'screen_size_update' && message.screenSize) {
        const senderSessionId = message.senderSessionId || message.userId
        if (!senderSessionId) return
        // Ignore our own echo
        if (senderSessionId === room.sessionId) return
        console.log('📥 Received screen size update from participant:', senderSessionId, message.screenSize)
        updateUserScreenSize(senderSessionId, message.screenSize)
      }

      // Handle custom backgrounds sync (add)
      if (message.type === 'custom_background_added' && message.background) {
        const sender = message.senderSessionId || message.userId
        if (sender && sender === room.sessionId) return
        try {
          const bg = message.background as CustomBackground
          addCustomBackgroundFromObject(bg)
          console.log('🧩 Added remote custom background to local storage:', bg.id)
        } catch (e) {
          console.warn('Failed to apply remote custom background:', e)
        }
      }

      // Handle custom backgrounds sync (remove)
      if (message.type === 'custom_background_removed' && (message.backgroundId || message.dataUrl)) {
        const sender = message.senderSessionId || message.userId
        if (sender && sender === room.sessionId) return
        try {
          if (message.backgroundId) {
            removeCustomBackgroundById(String(message.backgroundId))
          } else if (message.dataUrl) {
            // Fallback removal by dataUrl
            removeCustomBackgroundByDataUrl(String(message.dataUrl))
          }
          console.log('🧽 Removed remote custom background from local storage')
        } catch (e) {
          console.warn('Failed to remove remote custom background:', e)
        }
      }

    }

    room.onMessage('broadcast', handleBroadcastMessage)
    handlersReadyRef.current = true

    return () => {
      handlersReadyRef.current = false
      room.onMessage('broadcast', () => {})
      if (responseTimeoutRef.current) {
        clearTimeout(responseTimeoutRef.current)
        responseTimeoutRef.current = null
      }
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
              // Special handling for BATCH_UPDATE actions - optimize payload
              let actionToSend = state.lastAction;
              if (state.lastAction.type === 'BATCH_UPDATE') {
                console.log('🎯 Optimizing batch for network:', {
                  originalSize: state.lastAction.payload.actions?.length || 0,
                  actionType: state.lastAction.type
                });
                
                // Verify payload size is reasonable for batch operations
                const payloadSize = JSON.stringify(actionToSend).length;
                if (payloadSize > 50000) { // 50KB limit
                  console.warn('⚠️ Large batch payload detected:', payloadSize, 'bytes');
                }
              }
              
              sendWhiteboardAction(actionToSend)
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
   * Track when user joins the room for the first time
   */
  useEffect(() => {
    if (isConnected && !userJoinTimeRef.current) {
      userJoinTimeRef.current = Date.now()
      console.log('👋 User joined room at:', userJoinTimeRef.current)
    }
  }, [isConnected])

  /**
   * Request initial state only for genuinely new users
   */
  useEffect(() => {
    if (isConnected && connectedUserCount > 1 && !hasReceivedInitialStateRef.current && !hasRequestedStateRef.current) {
      if (isGenuinelyNewUser()) {
        console.log('🔄 Genuinely new user detected - requesting initial state')
        
        // Small delay to ensure room is fully initialized
        setTimeout(() => {
          requestInitialState()
        }, 100)
      } else {
        console.log('⏭️ Existing user detected - skipping initial state request')
      }
    }
  }, [isConnected, connectedUserCount, isGenuinelyNewUser])

  /**
   * Reset state sync flags when disconnecting
   */
  useEffect(() => {
    if (!isConnected) {
      hasReceivedInitialStateRef.current = false
      hasRequestedStateRef.current = false
      userJoinTimeRef.current = null
      setIsWaitingForInitialState(false)
      handlersReadyRef.current = false
      if (responseTimeoutRef.current) {
        clearTimeout(responseTimeoutRef.current)
        responseTimeoutRef.current = null
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