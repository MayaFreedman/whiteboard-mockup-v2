
import { useEffect, useContext, useRef } from 'react'
import { useWhiteboardStore } from '../stores/whiteboardStore'
import { WhiteboardAction } from '../types/whiteboard'
import { MultiplayerContext } from '../contexts/MultiplayerContext'

export const useMultiplayerSync = () => {
  const multiplayerContext = useContext(MultiplayerContext)
  const whiteboardStore = useWhiteboardStore()
  const sentActionIdsRef = useRef<Set<string>>(new Set())
  const actionQueueRef = useRef<WhiteboardAction[]>([])

  // Guard clause for context
  if (!multiplayerContext) {
    throw new Error(
      'useMultiplayerSync must be used within a MultiplayerProvider'
    )
  }

  const { serverInstance, isConnected, sendWhiteboardAction } = multiplayerContext

  // Helper function to check if we're truly ready to send actions
  const isReadyToSend = () => {
    const ready = !!(serverInstance?.server?.room && isConnected)
    console.log('🔍 Connection readiness check:', {
      hasServerInstance: !!serverInstance,
      hasRoom: !!serverInstance?.server?.room,
      isConnected,
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
        sendWhiteboardAction(action)
        sentActionIdsRef.current.add(action.id)
      })
    }
  }

  // Set up message-based sync when connection is ready
  useEffect(() => {
    if (!isReadyToSend()) {
      console.log('🔄 Skipping message setup - not ready:', {
        hasServerInstance: !!serverInstance,
        hasRoom: !!serverInstance?.server?.room,
        isConnected
      })
      return
    }

    const room = serverInstance.server.room
    console.log('🔄 Setting up message-based sync for room:', room.id)

    const handleBroadcastMessage = (message: any) => {
      console.log('📥 Received broadcast message:', message)
      
      // Handle whiteboard actions
      if (message.type === 'whiteboard_action' && message.action) {
        const action: WhiteboardAction = message.action
        console.log('📥 Processing whiteboard action:', action.type, action.id)
        
        // Prevent echoing our own actions back
        if (!sentActionIdsRef.current.has(action.id)) {
          console.log('📥 Applying remote action to store')
          whiteboardStore.applyRemoteAction(action)
        } else {
          console.log('🔄 Ignoring echo of our own action:', action.id)
        }
      }
      
      // Handle state sync
      if (message.type === 'state_sync' && message.data) {
        console.log('📥 Processing state sync')
        if (message.data.actions && Array.isArray(message.data.actions)) {
          whiteboardStore.batchUpdate(message.data.actions)
        }
      }
    }

    // Set up message handler
    room.onMessage('broadcast', handleBroadcastMessage)
    console.log('✅ Message handlers set up, waiting for initial state')

    // Process any queued actions now that we're connected
    processActionQueue()

    return () => {
      console.log('🧹 Cleaning up message-based sync')
      room.removeAllListeners('broadcast')
    }
  }, [serverInstance, isConnected, sendWhiteboardAction, whiteboardStore])

  // Send local actions to other clients
  useEffect(() => {
    console.log('🔄 Setting up action subscription')

    const unsubscribe = useWhiteboardStore.subscribe(
      (state) => state.lastAction,
      (lastAction) => {
        if (lastAction && !sentActionIdsRef.current.has(lastAction.id)) {
          console.log('📤 New local action detected:', lastAction.type, lastAction.id)
          
          if (isReadyToSend()) {
            console.log('📤 Sending action immediately:', lastAction.type, lastAction.id)
            sendWhiteboardAction(lastAction)
            sentActionIdsRef.current.add(lastAction.id)
            
            // Clean up old IDs to prevent memory leak
            if (sentActionIdsRef.current.size > 1000) {
              const idsArray = Array.from(sentActionIdsRef.current)
              const idsToKeep = idsArray.slice(-500)
              sentActionIdsRef.current = new Set(idsToKeep)
            }
          } else {
            console.log('⏳ Queueing action until connection ready:', lastAction.type, lastAction.id)
            actionQueueRef.current.push(lastAction)
          }
        }
      }
    )

    return unsubscribe
  }, [sendWhiteboardAction])

  // Process queue when connection state changes
  useEffect(() => {
    processActionQueue()
  }, [serverInstance, isConnected])

  return {
    isConnected,
    serverInstance,
    sendWhiteboardAction,
  }
}
