import { useEffect, useRef, useState } from 'react'
import { useWhiteboardStore } from '../../stores/whiteboardStore'

interface StateSyncHandlers {
  onStateRequest: (requesterId: string) => void
  onStateResponse: (requesterId: string, state: any) => void
}

export const useStateSync = (
  serverInstance: any,
  isConnected: boolean,
  sessionId: string
): StateSyncHandlers & { isWaitingForInitialState: boolean } => {
  const whiteboardStore = useWhiteboardStore()
  const hasReceivedInitialStateRef = useRef(false)
  const [isWaitingForInitialState, setIsWaitingForInitialState] = useState(false)

  const onStateRequest = (requesterId: string) => {
    if (requesterId !== sessionId) {
      const currentState = whiteboardStore.getStateSnapshot()
      console.log('📤 Sending state response with objects:', Object.keys(currentState.objects).length)
      
      // Random delay to avoid collision
      setTimeout(() => {
        serverInstance.sendStateResponse(requesterId, currentState)
      }, Math.random() * 300 + 100)
    }
  }

  const onStateResponse = (requesterId: string, state: any) => {
    if (requesterId === sessionId && !hasReceivedInitialStateRef.current) {
      console.log('✅ Applying state with', Object.keys(state?.objects || {}).length, 'objects')
      hasReceivedInitialStateRef.current = true
      setIsWaitingForInitialState(false)
      
      // Apply received state
      if (state?.objects && Object.keys(state.objects).length > 0) {
        Object.values(state.objects).forEach((obj: any) => {
          whiteboardStore.addObject({
            ...obj,
            createdAt: obj.createdAt || Date.now(),
            updatedAt: obj.updatedAt || Date.now(),
            data: obj.data || {}
          })
        })
      }
      
      if (state?.viewport) {
        whiteboardStore.setViewport(state.viewport)
      }
      
      if (state?.settings) {
        whiteboardStore.setSettings(state.settings)
      }
    }
  }

  // Reset on disconnect
  useEffect(() => {
    if (!isConnected) {
      hasReceivedInitialStateRef.current = false
      setIsWaitingForInitialState(false)
    }
  }, [isConnected])

  return {
    onStateRequest,
    onStateResponse,
    isWaitingForInitialState
  }
}