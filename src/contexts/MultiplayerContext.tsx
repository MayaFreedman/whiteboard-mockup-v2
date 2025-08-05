
import React, { createContext, useState, useCallback, useEffect, ReactNode, useRef } from 'react'
import { ServerClass } from '../server'
import { WhiteboardAction } from '../types/whiteboard'
import { useWhiteboardStore } from '../stores/whiteboardStore'
import { useScreenSizeStore } from '../stores/screenSizeStore'
import { useUser } from './UserContext'

interface User {
  id: string
  name?: string
  color?: string
  cursor?: { x: number; y: number }
  isActive?: boolean
}

interface MultiplayerContextType {
  serverInstance: ServerClass | null
  isConnected: boolean
  roomId: string | null
  connectedUsers: User[]
  connectedUserCount: number
  connectionError: string | null
  isAutoConnecting: boolean
  isWaitingForInitialState: boolean
  connect: (roomId: string, isModerator?: boolean) => Promise<void>
  disconnect: () => void
  sendWhiteboardAction: (action: WhiteboardAction) => void
}

export const MultiplayerContext = createContext<MultiplayerContextType | null>(
  null
)

interface MultiplayerProviderProps {
  children: ReactNode
}

export const MultiplayerProvider: React.FC<MultiplayerProviderProps> = ({
  children,
}) => {
  const [serverInstance, setServerInstance] = useState<ServerClass | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [connectedUsers, setConnectedUsers] = useState<User[]>([])
  const [connectedUserCount, setConnectedUserCount] = useState(0)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [isAutoConnecting, setIsAutoConnecting] = useState(false)
  const [isWaitingForInitialState, setIsWaitingForInitialState] = useState(false)
  
  // Singleton refs to prevent multiple instances
  const syncInitializedRef = useRef(false)
  const screenSyncInitializedRef = useRef(false)
  const sentActionIdsRef = useRef<Set<string>>(new Set())
  const hasReceivedInitialStateRef = useRef(false)
  const hasEverBeenInRoomRef = useRef(false)
  const hasRequestedStateRef = useRef(false)
  
  // Get stores and user context
  const whiteboardStore = useWhiteboardStore()
  const { updateUserScreenSize, updateLocalUserScreenSize, clearAllSizes } = useScreenSizeStore()
  const { userId } = useUser()

  // Auto-connection logic
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const roomParam = urlParams.get('room') || urlParams.get('roomId')
    
    if (roomParam && !isConnected && !serverInstance) {
      setIsAutoConnecting(true)
      
      connect(roomParam, false)
        .catch((error) => {
          console.error('❌ Auto-connection failed:', error)
        })
        .finally(() => {
          setIsAutoConnecting(false)
        })
    }
  }, [isConnected, serverInstance])

  // Helper functions
  const shouldSyncAction = (action: WhiteboardAction): boolean => {
    const localOnlyActions = ['SELECT_OBJECTS', 'CLEAR_SELECTION']
    
    if (action.type === 'UPDATE_OBJECT') {
      const currentBatch = whiteboardStore.getState().currentBatch
      if (currentBatch.id) {
        return false
      }
    }
    
    return !localOnlyActions.includes(action.type)
  }

  const isReadyToSend = () => {
    return !!serverInstance && !!serverInstance.server?.room && isConnected
  }

  const requestInitialState = () => {
    if (!isReadyToSend() || hasReceivedInitialStateRef.current || hasRequestedStateRef.current) {
      return
    }

    console.log('📤 [Singleton] Sending initial state request...')
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

  const calculateUsableScreenSize = useCallback(() => {
    const toolbarHeight = 60
    return {
      width: window.innerWidth,
      height: window.innerHeight - toolbarHeight
    }
  }, [])

  const broadcastScreenSize = useCallback((size: { width: number; height: number }) => {
    if (!isConnected || !userId || !isReadyToSend()) return

    serverInstance.server?.room?.send('broadcast', {
      type: 'screen_size_update',
      userId: userId,
      screenSize: size,
      timestamp: Date.now()
    })
  }, [isConnected, userId, serverInstance])

  const handleWindowResize = useCallback(() => {
    if (!userId || !screenSyncInitializedRef.current) return

    const newSize = calculateUsableScreenSize()
    updateLocalUserScreenSize(userId, newSize)
    broadcastScreenSize(newSize)
  }, [userId, updateLocalUserScreenSize, broadcastScreenSize, calculateUsableScreenSize])

  /**
   * Registers message handlers for multiplayer room events (singleton)
   */
  const registerMessageHandlers = (room: any) => {
    console.log('🔄 [Singleton] Registering message handlers')
    
    room.onMessage('participantJoined', (participant: any) => {
      setConnectedUserCount(prev => prev + 1)
    })

    room.onMessage('participantLeft', (data: any) => {
      setConnectedUserCount(prev => Math.max(0, prev - 1))
    })

    room.onMessage('ping', () => {
      // Handle ping to prevent console warnings
    })
    
    room.onMessage('__playground_message_types', () => {
      // Handle playground messages to prevent console warnings
    })

    room.onMessage('defaultRoomState', (state: any) => {
      if (state?.players) {
        const playerCount = Object.keys(state.players).length
        setConnectedUserCount(playerCount)
      }
    })

    // Singleton multiplayer sync message handler
    room.onMessage('broadcast', (message: any) => {
      console.log('📨 [Singleton] Received broadcast message:', message.type, 'from session:', message.requesterId || 'unknown')
      
      if (message.type === 'request_state') {
        console.log('📥 [Singleton] Received state request from:', message.requesterId, 'current session:', room.sessionId)
        if (message.requesterId !== room.sessionId) {
          const currentState = whiteboardStore.getStateSnapshot()
          console.log('📤 [Singleton] Sending state response with objects:', Object.keys(currentState.objects).length, 'viewport:', currentState.viewport, 'actionCount:', currentState.actionCount)
          
          setTimeout(() => {
            console.log('⏰ [Singleton] Actually sending state response now')
            serverInstance.sendStateResponse(message.requesterId, currentState)
          }, Math.random() * 300 + 100)
        } else {
          console.log('🔄 [Singleton] Ignoring state request from self')
        }
        return
      }
      
      if (message.type === 'state_response') {
        console.log('📥 [Singleton] Received state response for:', message.requesterId, 'with objects:', Object.keys(message.state?.objects || {}).length)
        
        if (message.requesterId === room.sessionId && !hasReceivedInitialStateRef.current) {
          console.log('✅ [Singleton] Applying initial state - clearing existing objects first')
          
          hasReceivedInitialStateRef.current = true
          setIsWaitingForInitialState(false)
          
          whiteboardStore.clearObjects()
          console.log('🧹 [Singleton] Cleared existing objects')
          
          if (message.state?.objects && Object.keys(message.state.objects).length > 0) {
            console.log('🔄 [Singleton] Adding', Object.keys(message.state.objects).length, 'objects to whiteboard')
            Object.values(message.state.objects).forEach((obj: any, index: number) => {
              const addAction: WhiteboardAction = {
                id: `sync-${obj.id}`,
                type: 'ADD_OBJECT',
                userId: obj.userId || 'unknown',
                timestamp: obj.createdAt || Date.now(),
                payload: {
                  object: {
                    ...obj,
                    createdAt: obj.createdAt || Date.now(),
                    updatedAt: obj.updatedAt || Date.now(),
                    data: obj.data || {}
                  }
                }
              }
              console.log('📦 [Singleton] Adding object', index + 1, '/', Object.keys(message.state.objects).length, '- ID:', obj.id, 'Type:', obj.type)
              whiteboardStore.applyRemoteAction(addAction)
            })
            console.log('✅ [Singleton] Finished adding all objects')
          } else {
            console.log('📭 [Singleton] No objects to add from state response')
          }
          
          if (message.state?.viewport) {
            console.log('📐 [Singleton] Setting viewport:', message.state.viewport)
            whiteboardStore.setViewport(message.state.viewport)
          }
          
          if (message.state?.settings) {
            console.log('⚙️ [Singleton] Setting whiteboard settings:', message.state.settings)
            whiteboardStore.setSettings(message.state.settings)
          }
          
          if (message.state?.actionHistory && message.state?.userActionHistories) {
            console.log('📚 [Singleton] Restoring action history with', message.state.actionHistory.length, 'actions')
            whiteboardStore.restoreHistoryState({
              actionHistory: message.state.actionHistory,
              userActionHistories: message.state.userActionHistories,
              userHistoryIndices: message.state.userHistoryIndices || {},
              currentHistoryIndex: message.state.currentHistoryIndex || 0,
              objectRelationships: message.state.objectRelationships || {}
            })
          }
          
          console.log('🎯 [Singleton] Initial state application complete')
        } else if (message.requesterId === room.sessionId && hasReceivedInitialStateRef.current) {
          console.log('⚠️ [Singleton] Ignoring duplicate state response')
        }
        return
      }
      
      if (message.type === 'whiteboard_action' && message.action) {
        const action: WhiteboardAction = message.action
        
        if (!sentActionIdsRef.current.has(action.id)) {
          if (action.type === 'BATCH_UPDATE') {
            if (action.payload.actions && Array.isArray(action.payload.actions)) {
              whiteboardStore.batchUpdate(action.payload.actions)
              sentActionIdsRef.current.add(action.id)
            }
          } else {
            whiteboardStore.applyRemoteAction(action)
            sentActionIdsRef.current.add(action.id)
          }
        }
      }
      
      if (message.type === 'state_sync' && message.data) {
        if (message.data.actions && Array.isArray(message.data.actions)) {
          whiteboardStore.batchUpdate(message.data.actions)
        }
      }
      
      if (message.type === 'screen_size_update' && message.userId && message.screenSize) {
        console.log('📥 [Singleton] Received screen size update from:', message.userId, message.screenSize)
        if (message.userId !== userId) {
          updateUserScreenSize(message.userId, message.screenSize)
        }
      }
    })
  }

  const connect = useCallback(async (targetRoomId: string, isModerator: boolean = false) => {
    try {
      setConnectionError(null)
      
      const newServerInstance = new ServerClass()
      await newServerInstance.connectToColyseusServer(targetRoomId, isModerator)
      
      setServerInstance(newServerInstance)
      setRoomId(targetRoomId)
      setIsConnected(true)
      setConnectionError(null)

      // Register message handlers (singleton)
      const room = newServerInstance.server.room
      if (room) {
        registerMessageHandlers(room)
        syncInitializedRef.current = true
        
        // Check if we need to request initial state immediately after connection
        // Only request if there are other users already in the room
        setTimeout(() => {
          console.log('🔍 [Singleton] Checking initial state request - connectedUserCount:', connectedUserCount, 'hasReceived:', hasReceivedInitialStateRef.current, 'hasRequested:', hasRequestedStateRef.current)
          if (connectedUserCount > 1 && !hasReceivedInitialStateRef.current && !hasRequestedStateRef.current) {
            console.log('📤 [Singleton] Requesting initial state - joining existing room with', connectedUserCount, 'users')
            hasEverBeenInRoomRef.current = true
            requestInitialState()
          } else {
            console.log('🔍 [Singleton] Skipping initial state request - conditions not met')
          }
        }, 200)
      }
    } catch (error) {
      console.error('❌ Connection failed:', error)
      
      let errorMessage = 'Unknown connection error'
      
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      } else if (error && typeof error === 'object') {
        // Try to extract meaningful info from the error object
        if ('message' in error) {
          errorMessage = String(error.message)
        } else if ('code' in error) {
          errorMessage = `Connection failed with code: ${error.code}`
        } else if ('type' in error) {
          errorMessage = `Connection failed with type: ${error.type}`
        } else {
          errorMessage = `Connection failed: ${JSON.stringify(error)}`
        }
      }
      setConnectionError(errorMessage)
      setServerInstance(null)
      setIsConnected(false)
      setRoomId(null)
      throw error
    }
  }, [])

  const disconnect = useCallback(() => {
    if (serverInstance?.server?.room) {
      serverInstance.server.room.leave()
    }
    setServerInstance(null)
    setIsConnected(false)
    setRoomId(null)
    setConnectedUsers([])
    setConnectedUserCount(0)
    setConnectionError(null)
    setIsWaitingForInitialState(false)
    
    // Reset singleton flags
    syncInitializedRef.current = false
    screenSyncInitializedRef.current = false
    hasReceivedInitialStateRef.current = false
    hasEverBeenInRoomRef.current = false
    hasRequestedStateRef.current = false
    sentActionIdsRef.current.clear()
  }, [serverInstance])

  /**
   * Sends a whiteboard action to other connected users
   */
  const sendWhiteboardAction = useCallback((action: WhiteboardAction) => {
    if (!serverInstance || !isConnected) {
      return
    }

    try {
      // Serialize action for network transmission
      const serializedAction = {
        ...action,
        payload: {
          ...action.payload,
          ...(action.type === 'UPDATE_OBJECT' && action.payload.updates && {
            updates: {
              ...action.payload.updates,
              ...(typeof action.payload.updates.x === 'number' && { x: action.payload.updates.x }),
              ...(typeof action.payload.updates.y === 'number' && { y: action.payload.updates.y }),
              ...(typeof action.payload.updates.width === 'number' && { width: action.payload.updates.width }),
              ...(typeof action.payload.updates.height === 'number' && { height: action.payload.updates.height }),
              ...(typeof action.payload.updates.strokeWidth === 'number' && { strokeWidth: action.payload.updates.strokeWidth }),
              ...(typeof action.payload.updates.opacity === 'number' && { opacity: action.payload.updates.opacity }),
            }
          })
        }
      }
      
      serverInstance.sendEvent({
        type: 'whiteboard_action',
        action: serializedAction
      })
    } catch (error) {
      console.error('❌ Failed to send action:', error)
    }
  }, [serverInstance, isConnected])

  // Singleton multiplayer sync effects
  useEffect(() => {
    if (!syncInitializedRef.current || !isConnected) return

    const unsubscribe = useWhiteboardStore.subscribe((state) => {
      if (state.lastAction && !sentActionIdsRef.current.has(state.lastAction.id)) {
        if (!shouldSyncAction(state.lastAction)) {
          return
        }
        
        if (isReadyToSend()) {
          try {
            sendWhiteboardAction(state.lastAction)
            sentActionIdsRef.current.add(state.lastAction.id)
            
            if (sentActionIdsRef.current.size > 1000) {
              const idsArray = Array.from(sentActionIdsRef.current)
              const idsToKeep = idsArray.slice(-500)
              sentActionIdsRef.current = new Set(idsToKeep)
            }
          } catch (error) {
            console.error('❌ Failed to send action:', state.lastAction.id, error)
          }
        }
      }
    })

    return unsubscribe
  }, [syncInitializedRef.current, isConnected, sendWhiteboardAction])

  // Singleton screen size sync effects
  useEffect(() => {
    if (!isConnected || !userId) return
    
    if (!screenSyncInitializedRef.current) {
      console.log('🔄 [Singleton] Initializing screen size sync')
      screenSyncInitializedRef.current = true
      
      // Set initial screen size
      handleWindowResize()
      
      // Listen for window resize events
      window.addEventListener('resize', handleWindowResize)
      
      return () => {
        window.removeEventListener('resize', handleWindowResize)
        screenSyncInitializedRef.current = false
      }
    }
  }, [isConnected, userId, handleWindowResize])

  // Handle user count changes - only for logging, initial state is now handled at connection time
  useEffect(() => {
    if (!isReadyToSend() || !syncInitializedRef.current) return
    
    console.log('🔄 [Singleton] connectedUserCount changed:', connectedUserCount)
    
    // Initial state requests are now handled in the connect function
    // This effect is kept for logging and potential future use
  }, [connectedUserCount, isConnected, syncInitializedRef.current])

  // Handle screen size changes for user departures
  useEffect(() => {
    if (!isConnected || !userId || !screenSyncInitializedRef.current) return
    
    if (connectedUserCount <= 1) {
      console.log('📏 [Singleton] Switching to single-player mode')
      clearAllSizes()
    } else if (connectedUserCount > 1) {
      console.log('📏 [Singleton] User departure detected, refreshing screen sizes')
      clearAllSizes()
      
      setTimeout(() => {
        const currentSize = calculateUsableScreenSize()
        updateLocalUserScreenSize(userId, currentSize)
        broadcastScreenSize(currentSize)
      }, 50)
    }
  }, [connectedUserCount, isConnected, userId, screenSyncInitializedRef.current, clearAllSizes, updateLocalUserScreenSize, broadcastScreenSize, calculateUsableScreenSize])

  const value: MultiplayerContextType = {
    serverInstance,
    isConnected,
    roomId,
    connectedUsers,
    connectedUserCount,
    connectionError,
    isAutoConnecting,
    isWaitingForInitialState,
    connect,
    disconnect,
    sendWhiteboardAction,
  }

  return (
    <MultiplayerContext.Provider value={value}>
      {children}
    </MultiplayerContext.Provider>
  )
}
