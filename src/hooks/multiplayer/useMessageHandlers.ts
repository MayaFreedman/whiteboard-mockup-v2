import { useEffect } from 'react'
import { WhiteboardAction } from '../../types/whiteboard'
import { useWhiteboardStore } from '../../stores/whiteboardStore'

interface MessageHandlers {
  onStateRequest: (requesterId: string) => void
  onStateResponse: (requesterId: string, state: any) => void
}

export const useMessageHandlers = (
  serverInstance: any,
  isConnected: boolean,
  sentActionIds: Set<string>,
  handlers: MessageHandlers
) => {
  const whiteboardStore = useWhiteboardStore()

  useEffect(() => {
    if (!serverInstance?.server?.room || !isConnected) {
      return
    }

    const room = serverInstance.server.room
    
    const handleBroadcastMessage = (message: any) => {
      switch (message.type) {
        case 'request_state':
          console.log('📥 State request from:', message.requesterId)
          handlers.onStateRequest(message.requesterId)
          break
          
        case 'state_response':
          console.log('📥 State response for:', message.requesterId)
          handlers.onStateResponse(message.requesterId, message.state)
          break
          
        case 'whiteboard_action':
          if (message.action && !sentActionIds.has(message.action.id)) {
            console.log('📥 Received action:', message.action.type, message.action.id);
            whiteboardStore.applyRemoteAction(message.action as WhiteboardAction)
          } else if (message.action && sentActionIds.has(message.action.id)) {
            console.log('📥 Ignoring own action:', message.action.type, message.action.id);
          }
          break
          
        case 'state_sync':
          if (message.data?.actions && Array.isArray(message.data.actions)) {
            console.log('📥 Received state_sync with', message.data.actions.length, 'actions');
            whiteboardStore.batchUpdate(message.data.actions)
          }
          break
      }
    }

    room.onMessage('broadcast', handleBroadcastMessage)

    return () => {
      room.onMessage('broadcast', () => {})
    }
  }, [serverInstance, isConnected, handlers, sentActionIds, whiteboardStore])
}