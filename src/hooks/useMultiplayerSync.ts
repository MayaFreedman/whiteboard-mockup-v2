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
  const readinessCheckTimeoutRef = useRef<NodeJS.Timeout>()
  const lastStateRef = useRef<boolean>(false)

  // Guard clause for context
  if (!multiplayerContext) {
    throw new Error(
      'useMultiplayerSync must be used within a MultiplayerProvider'
    )
  }

  const { serverInstance, isConnected, sendWhiteboardAction } = multiplayerContext

  // Optimized readiness check with caching
  const isReadyToSend = useRef(() => {
    const hasServerInstance = !!serverInstance
    const hasRoom = !!(serverInstance?.server?.room)
    const ready = hasServerInstance && hasRoom && isConnected
    
    // Only log when state changes
    if (ready !== lastStateRef.current) {
      console.log('🔍 Connection readiness changed:', {
        hasServerInstance,
        hasRoom,
        isConnected,
        roomId: serverInstance?.server?.room?.id || 'none',
        ready
      })
      lastStateRef.current = ready
    }
    
    return ready
  })

  // Process queued actions when connection becomes ready
  const processActionQueue = () => {
    if (actionQueueRef.current.length > 0 && isReadyToSend.current()) {
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
    if (!isReadyToSend.current()) {
      console.log('🔄 Skipping message setup - not ready')
      return
    }

    const room = serverInstance.server.room
    console.log('🔄 Setting up message-based sync for room:', room.id)

    const handleBroadcastMessage = (message: any) => {
      // Reduced logging for performance
      if (message.type === 'whiteboard_action' && message.action) {
        const action: WhiteboardAction = message.action
        
        // Prevent echoing our own actions back
        if (!sentActionIdsRef.current.has(action.id)) {
          console.log('📥 Applying remote action:', action.type)
          whiteboardStore.applyRemoteAction(action)
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

  // Send local actions to other clients (optimized)
  useEffect(() => {
    const unsubscribe = useWhiteboardStore.subscribe(
      (state) => {
        if (state.lastAction && !sentActionIdsRef.current.has(state.lastAction.id)) {
          // Reduced logging for performance
          console.log('📤 New local action:', state.lastAction.type, state.lastAction.id)
          
          if (isReadyToSend.current()) {
            try {
              sendWhiteboardAction(state.lastAction)
              sentActionIdsRef.current.add(state.lastAction.id)
              console.log('✅ Sent action:', state.lastAction.id)
              
              // Clean up old IDs to prevent memory leak (optimized)
              if (sentActionIdsRef.current.size > 500) { // Reduced from 1000
                const idsArray = Array.from(sentActionIdsRef.current)
                const idsToKeep = idsArray.slice(-250) // Reduced from 500
                sentActionIdsRef.current = new Set(idsToKeep)
              }
            } catch (error) {
              console.error('❌ Failed to send action:', state.lastAction.id, error)
              actionQueueRef.current.push(state.lastAction)
            }
          } else {
            console.log('⏳ Queueing action:', state.lastAction.type, state.lastAction.id)
            actionQueueRef.current.push(state.lastAction)
          }
        }
      }
    )

    return unsubscribe
  }, [sendWhiteboardAction])

  // Process queue when connection state changes (debounced)
  useEffect(() => {
    if (readinessCheckTimeoutRef.current) {
      clearTimeout(readinessCheckTimeoutRef.current)
    }
    
    readinessCheckTimeoutRef.current = setTimeout(() => {
      console.log('🔄 Connection state changed, processing queue')
      processActionQueue()
    }, 100) // Debounce by 100ms

    return () => {
      if (readinessCheckTimeoutRef.current) {
        clearTimeout(readinessCheckTimeoutRef.current)
      }
    }
  }, [serverInstance, isConnected])

  return {
    isConnected,
    serverInstance,
    sendWhiteboardAction,
  }
}
