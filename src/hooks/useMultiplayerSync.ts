import { useEffect, useContext, useRef } from 'react'
import { useWhiteboardStore } from '../stores/whiteboardStore'
import { WhiteboardAction } from '../types/whiteboard'
import { MultiplayerContext } from '../contexts/MultiplayerContext'

export const useMultiplayerSync = () => {
  const multiplayerContext = useContext(MultiplayerContext)
  const whiteboardStore = useWhiteboardStore()
  const sentActionIdsRef = useRef<Set<string>>(new Set())

  // Guard clause for context
  if (!multiplayerContext) {
    throw new Error(
      'useMultiplayerSync must be used within a MultiplayerProvider'
    )
  }

  const { serverInstance, isConnected, sendWhiteboardAction } = multiplayerContext

  // Send local actions to other clients
  useEffect(() => {
    if (!serverInstance || !isConnected) return

    const unsubscribe = useWhiteboardStore.subscribe(
      (state) => state.lastAction,
      (lastAction) => {
        if (lastAction && !sentActionIdsRef.current.has(lastAction.id)) {
          console.log(
            '📤 Sending action to room:',
            lastAction.type,
            lastAction.id
          )
          sendWhiteboardAction(lastAction)
          sentActionIdsRef.current.add(lastAction.id)
          
          // Clean up old IDs to prevent memory leak (keep last 1000)
          if (sentActionIdsRef.current.size > 1000) {
            const idsArray = Array.from(sentActionIdsRef.current)
            const idsToKeep = idsArray.slice(-500) // Keep last 500
            sentActionIdsRef.current = new Set(idsToKeep)
          }
        }
      }
    )

    return unsubscribe
  }, [serverInstance, isConnected, sendWhiteboardAction])

  // Receive actions from other clients via the server's message handlers
  useEffect(() => {
    if (!serverInstance?.server?.room || !isConnected) return

    const room = serverInstance.server.room

    const handleBroadcastMessage = (message: any) => {
      console.log('📥 Received broadcast message:', message)
      
      // Handle whiteboard actions
      if (message.type === 'whiteboard_action' && message.action) {
        const action: WhiteboardAction = message.action
        console.log('📥 Processing whiteboard action:', action.type, action.id)
        
        // Prevent echoing our own actions back using the sent IDs set
        if (!sentActionIdsRef.current.has(action.id)) {
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

    // Use the existing message handler pattern from your ServerClass
    room.onMessage('broadcast', handleBroadcastMessage)

    return () => {
      // Clean up the specific message handler
      room.removeAllListeners('broadcast')
    }
  }, [serverInstance, isConnected, whiteboardStore])

  return {
    isConnected,
    serverInstance,
    sendWhiteboardAction,
  }
}
