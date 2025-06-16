
import { useEffect, useContext, useRef, useState } from 'react'
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

  const { serverInstance, isConnected, sendWhiteboardAction, connectionPhase } = multiplayerContext

  // Handle connection phase changes and room setup
  useEffect(() => {
    if (!serverInstance || !isConnected || !serverInstance.server?.room) {
      return
    }

    const room = serverInstance.server.room
    console.log('🔄 Setting up message-based sync for room:', room.roomId)

    // Handle initial room state (replaces schema onStateChange)
    const handleDefaultRoomState = (message: any) => {
      console.log('🏠 Received initial room state via message')
      console.log('📦 State data:', {
        hasData: !!message,
        dataKeys: message ? Object.keys(message) : [],
        hasWhiteboardState: message && message.whiteboardState ? 'yes' : 'no'
      })

      if (message && message.whiteboardState) {
        console.log('📥 Loading full whiteboard state from server')
        whiteboardStore.loadFullState(message.whiteboardState)
      } else {
        console.log('✅ No initial whiteboard state, starting fresh')
      }
      
      // Process any queued actions now that we're ready
      if (actionQueueRef.current.length > 0) {
        console.log('📤 Processing queued actions:', actionQueueRef.current.length)
        actionQueueRef.current.forEach(action => {
          sendWhiteboardAction(action)
          sentActionIdsRef.current.add(action.id)
        })
        actionQueueRef.current = []
      }
    }

    // Handle broadcast messages (collaborative actions)
    const handleBroadcastMessage = (message: any) => {
      console.log('📨 Received broadcast message:', message)

      // Handle whiteboard actions
      if (message.type === 'whiteboard_action' && message.action) {
        const action: WhiteboardAction = message.action
        console.log('📥 Processing remote whiteboard action:', action.type, action.id)
        
        // Prevent echoing our own actions
        if (!sentActionIdsRef.current.has(action.id)) {
          whiteboardStore.applyRemoteAction(action)
        } else {
          console.log('🔄 Ignoring echo of our own action:', action.id)
        }
      }
      
      // Handle state sync messages
      if (message.type === 'state_sync' && message.data) {
        console.log('📥 Processing state sync message')
        if (message.data.actions && Array.isArray(message.data.actions)) {
          whiteboardStore.batchUpdate(message.data.actions)
        }
      }
    }

    // Set up message handlers
    room.onMessage('defaultRoomState', handleDefaultRoomState)
    room.onMessage('broadcast', handleBroadcastMessage)

    console.log('✅ Message handlers set up, waiting for initial state')

    return () => {
      console.log('🧹 Cleaning up message-based sync')
      room.removeAllListeners('defaultRoomState')
      room.removeAllListeners('broadcast')
    }
  }, [serverInstance, isConnected, whiteboardStore, sendWhiteboardAction])

  // Send local actions - queue until ready
  useEffect(() => {
    if (!serverInstance || !isConnected || !serverInstance.server?.room) {
      console.log('🔄 Skipping action sync setup - not connected')
      return
    }

    console.log('📤 Setting up outbound action sync')

    const unsubscribe = useWhiteboardStore.subscribe(
      (state) => state.lastAction,
      (lastAction) => {
        if (lastAction && !sentActionIdsRef.current.has(lastAction.id)) {
          if (connectionPhase === 'ready') {
            console.log('📤 Sending action immediately:', lastAction.type, lastAction.id)
            sendWhiteboardAction(lastAction)
            sentActionIdsRef.current.add(lastAction.id)
          } else {
            console.log('⏳ Queueing action until connection ready:', lastAction.type, lastAction.id)
            actionQueueRef.current.push(lastAction)
          }
          
          // Clean up old IDs to prevent memory leak
          if (sentActionIdsRef.current.size > 1000) {
            const idsArray = Array.from(sentActionIdsRef.current)
            const idsToKeep = idsArray.slice(-500)
            sentActionIdsRef.current = new Set(idsToKeep)
          }
        }
      }
    )

    return unsubscribe
  }, [serverInstance, isConnected, sendWhiteboardAction, connectionPhase])

  return {
    isConnected,
    connectionPhase,
    serverInstance,
    sendWhiteboardAction,
  }
}
