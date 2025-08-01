import { useEffect, useRef } from 'react'

export const useStateRequester = (
  serverInstance: any,
  isConnected: boolean,
  connectedUserCount: number,
  setIsWaitingForInitialState: (waiting: boolean) => void
) => {
  const hasReceivedInitialStateRef = useRef(false)
  const hasEverBeenInRoomRef = useRef(false)
  const hasRequestedStateRef = useRef(false)

  const isReadyToSend = () => {
    return !!serverInstance && !!serverInstance.server?.room && isConnected
  }

  const requestInitialState = () => {
    if (!isReadyToSend() || hasReceivedInitialStateRef.current || hasRequestedStateRef.current) {
      return
    }

    console.log('📤 Requesting initial state...')
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
  }

  // Request state when joining room with others
  useEffect(() => {
    if (!isReadyToSend()) return
    
    if (!hasReceivedInitialStateRef.current && 
        connectedUserCount > 1 && 
        !hasEverBeenInRoomRef.current && 
        !hasRequestedStateRef.current) {
      
      hasEverBeenInRoomRef.current = true
      setTimeout(requestInitialState, 100)
    }
  }, [connectedUserCount, isConnected, serverInstance])

  // Reset on disconnect
  useEffect(() => {
    if (!isConnected) {
      hasReceivedInitialStateRef.current = false
      hasEverBeenInRoomRef.current = false
      hasRequestedStateRef.current = false
      setIsWaitingForInitialState(false)
    }
  }, [isConnected])

  return { hasReceivedInitialStateRef }
}