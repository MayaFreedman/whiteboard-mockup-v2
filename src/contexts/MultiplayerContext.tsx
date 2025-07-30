
import React, { createContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { ServerClass } from '../server'
import { WhiteboardAction } from '../types/whiteboard'

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

  // Auto-connection logic
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const roomParam = urlParams.get('room') || urlParams.get('roomId')
    
    if (roomParam && !isConnected && !serverInstance) {
      console.log('🔗 Auto-connecting to room from URL:', roomParam)
      setIsAutoConnecting(true)
      
      connect(roomParam, false) // Connect as regular user, not moderator
        .then(() => {
          console.log('✅ Auto-connection successful')
        })
        .catch((error) => {
          console.error('❌ Auto-connection failed:', error)
        })
        .finally(() => {
          setIsAutoConnecting(false)
        })
    }
  }, [isConnected, serverInstance])

  const connect = useCallback(async (targetRoomId: string, isModerator: boolean = false) => {
    try {
      console.log('🔌 Starting connection process to room:', targetRoomId)
      setConnectionError(null)
      
      const newServerInstance = new ServerClass()
      await newServerInstance.connectToColyseusServer(targetRoomId, isModerator)
      
      setServerInstance(newServerInstance)
      setRoomId(targetRoomId)
      setIsConnected(true)
      setConnectionError(null)

      // Set up room event listeners for occupancy tracking
      const room = newServerInstance.server.room
      if (room) {
        console.log('👥 Setting up participant tracking for room:', room.id)
        
        // Listen for participant events from server
        room.onMessage('participantJoined', (participant: any) => {
          console.log('👥 Participant joined event:', participant)
          setConnectedUserCount(prev => {
            const newCount = prev + 1
            console.log('👥 User count increased to:', newCount)
            return newCount
          })
        })

        room.onMessage('participantLeft', (data: any) => {
          console.log('👥 Participant left event:', data)
          setConnectedUserCount(prev => {
            const newCount = Math.max(0, prev - 1)
            console.log('👥 User count decreased to:', newCount)
            return newCount
          })
        })

        // Listen for default room state to get initial player count
        room.onMessage('defaultRoomState', (state: any) => {
          console.log('🏠 Default room state received:', state)
          if (state?.players) {
            const playerCount = Object.keys(state.players).length
            console.log('👥 Initial room state - player count:', playerCount)
            setConnectedUserCount(playerCount)
          }
        })

        // Also track state changes directly for more immediate updates
        room.onStateChange((state: any) => {
          if (state?.players) {
            const currentPlayerCount = Object.keys(state.players).length
            console.log('👥 State change - current player count:', currentPlayerCount)
            setConnectedUserCount(currentPlayerCount)
          }
        })
      }

      console.log('✅ Connection successful!')
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
      
      console.error('📊 Processed error message:', errorMessage)
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
    console.log('🔌 Disconnected from room')
  }, [serverInstance])

  const sendWhiteboardAction = useCallback((action: WhiteboardAction) => {
    if (serverInstance && isConnected) {
      console.log('📤 Sending whiteboard action via ServerClass:', action.type, action.id)
      try {
        // Ensure shape updates are properly serialized for multiplayer
        const serializedAction = {
          ...action,
          payload: {
            ...action.payload,
            // Make sure all shape properties are included
            ...(action.type === 'UPDATE_OBJECT' && action.payload.updates && {
              updates: {
                ...action.payload.updates,
                // Ensure numeric values are properly serialized
                ...(typeof action.payload.updates.x === 'number' && { x: action.payload.updates.x }),
                ...(typeof action.payload.updates.y === 'number' && { y: action.payload.updates.y }),
                ...(typeof action.payload.updates.width === 'number' && { width: action.payload.updates.width }),
                ...(typeof action.payload.updates.height === 'number' && { height: action.payload.updates.height }),
                ...(typeof action.payload.updates.strokeWidth === 'number' && { strokeWidth: action.payload.updates.strokeWidth }),
                ...(typeof action.payload.updates.opacity === 'number' && { opacity: action.payload.updates.opacity }),
              }
            })
          }
        };
        
        serverInstance.sendEvent({
          type: 'whiteboard_action',
          action: serializedAction
        })
      } catch (error) {
        console.error('❌ Failed to send action:', error)
        // Could set an error state here if needed
      }
    } else {
      console.warn('⚠️ Cannot send action: not connected to server')
    }
  }, [serverInstance, isConnected])

  const value: MultiplayerContextType = {
    serverInstance,
    isConnected,
    roomId,
    connectedUsers,
    connectedUserCount,
    connectionError,
    isAutoConnecting,
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
