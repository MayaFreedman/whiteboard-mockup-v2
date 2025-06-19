
import { useEffect, useContext, useRef } from 'react'
import { useWhiteboardStore } from '../stores/whiteboardStore'
import { useUser } from '../contexts/UserContext'
import { WhiteboardAction } from '../types/whiteboard'
import { MultiplayerContext } from '../contexts/MultiplayerContext'

export const useMultiplayerSync = () => {
  const multiplayerContext = useContext(MultiplayerContext)
  const whiteboardStore = useWhiteboardStore()
  const { userId } = useUser()
  const sentActionIdsRef = useRef<Set<string>>(new Set())
  const actionQueueRef = useRef<WhiteboardAction[]>([])

  // If no multiplayer context, return null values (graceful degradation)
  if (!multiplayerContext) {
    console.log('🔌 No multiplayer context available - running in offline mode')
    return {
      isConnected: false,
      serverInstance: null,
      sendWhiteboardAction: () => {},
    }
  }

  const { serverInstance, isConnected, sendWhiteboardAction } = multiplayerContext

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
      const actionsToSend = [...actionQueueRef.current]
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
    room.onMessage('broadcast', handleBroadcastMessage)
    console.log('✅ Message handlers set up for room:', room.id)

    // Process any queued actions now that we're connected
    processActionQueue()

    return () => {
      console.log('🧹 Cleaning up message-based sync for room:', room.id)
      room.removeAllListeners('broadcast')
    }
  }, [serverInstance, isConnected, sendWhiteboardAction, whiteboardStore, userId])

  // Send local actions to other clients
  useEffect(() => {
    console.log('🔄 Setting up action subscription')

    const unsubscribe = useWhiteboardStore.subscribe(
      (state) => {
        if (state.lastAction && !sentActionIdsRef.current.has(state.lastAction.id)) {
          console.log('📤 New local action detected:', {
            type: state.lastAction.type,
            id: state.lastAction.id,
            userId: state.lastAction.userId,
            isReadyToSend: isReadyToSend()
          })
          
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

  return {
    isConnected,
    serverInstance,
    sendWhiteboardAction,
  }
}
