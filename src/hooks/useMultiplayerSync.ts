
import { useEffect, useContext, useRef } from 'react'
import { useWhiteboardStore } from '../stores/whiteboardStore'
import { WhiteboardAction } from '../types/whiteboard'
import { MultiplayerContext } from '../contexts/MultiplayerContext'

export const useMultiplayerSync = () => {
  const multiplayerContext = useContext(MultiplayerContext)
  const whiteboardStore = useWhiteboardStore()
  const lastActionIdRef = useRef<string | null>(null)

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
        if (lastAction && lastAction.id !== lastActionIdRef.current) {
          console.log(
            '📤 Sending action to room:',
            lastAction.type,
            lastAction.id
          )
          sendWhiteboardAction(lastAction)
          lastActionIdRef.current = lastAction.id
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
        
        // Prevent echoing our own actions back
        if (action.id !== lastActionIdRef.current) {
          whiteboardStore.applyRemoteAction(action)
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
