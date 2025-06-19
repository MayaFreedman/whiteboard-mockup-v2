
import { useEffect, useContext, useRef } from 'react'
import { useWhiteboardStore } from '../stores/whiteboardStore'
import { useUser } from '../contexts/UserContext'
import { WhiteboardAction } from '../types/whiteboard'
import { MultiplayerContext } from '../contexts/MultiplayerContext'

// Logging throttling to reduce console spam
const createThrottledLogger = (interval: number) => {
  let lastLog = 0;
  const logQueue = new Map<string, any>();
  
  return (key: string, data: any) => {
    logQueue.set(key, data);
    const now = Date.now();
    
    if (now - lastLog >= interval) {
      logQueue.forEach((logData, logKey) => {
        console.log(`🔄 [Throttled] ${logKey}:`, logData);
      });
      logQueue.clear();
      lastLog = now;
    }
  };
};

export const useMultiplayerSync = () => {
  const multiplayerContext = useContext(MultiplayerContext)
  const whiteboardStore = useWhiteboardStore()
  const { userId } = useUser()
  const sentActionIdsRef = useRef<Set<string>>(new Set())
  const actionQueueRef = useRef<WhiteboardAction[]>([])
  
  // Throttled logging for detailed checks (reduced from every call to every 100ms)
  const throttledLog = useRef(createThrottledLogger(100));

  // Guard clause for context
  if (!multiplayerContext) {
    throw new Error(
      'useMultiplayerSync must be used within a MultiplayerProvider'
    )
  }

  const { serverInstance, isConnected, sendWhiteboardAction } = multiplayerContext

  // Improved readiness check with throttled logging
  const isReadyToSend = () => {
    const hasServerInstance = !!serverInstance
    const hasRoom = !!(serverInstance?.server?.room)
    const ready = hasServerInstance && hasRoom && isConnected
    
    // Use throttled logging instead of spamming console
    throttledLog.current('connection-check', {
      hasServerInstance,
      hasRoom,
      isConnected,
      roomId: serverInstance?.server?.room?.id || 'none',
      ready
    });
    
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
              
              // Reduced cleanup threshold from 1000 to 250 for better memory management
              if (sentActionIdsRef.current.size > 250) {
                const idsArray = Array.from(sentActionIdsRef.current)
                const idsToKeep = idsArray.slice(-125) // Keep last 125 instead of 500
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
