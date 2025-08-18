
import React, { createContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { ServerClass } from '../server'
import { WhiteboardAction } from '../types/whiteboard'
import { useScreenSizeStore } from '../stores/screenSizeStore'

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

  /**
   * Registers message handlers for multiplayer room events (once per connection)
   */
  const registerMessageHandlers = useCallback((room: any) => {
    room.onMessage('participantJoined', (participant: any) => {
      setConnectedUserCount(prev => prev + 1)
      console.log('User joined multiplayer room')
    })

    room.onMessage('participantLeft', (data: any) => {
      setConnectedUserCount(prev => Math.max(0, prev - 1))
      console.log('User left multiplayer room')
      try {
        const participantId = data?.sessionId || data?.id || data?.clientId || data?.userId
        if (participantId) {
          useScreenSizeStore.getState().removeUser(participantId)
        }
      } catch (err) {
        console.warn('⚠️ Failed to remove participant screen size on leave:', err)
      }
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
  }, [])

  const connect = useCallback(async (targetRoomId: string, isModerator: boolean = false) => {
    try {
      setConnectionError(null)
      
      const newServerInstance = new ServerClass()
      await newServerInstance.connectToColyseusServer(targetRoomId, isModerator)
      
      setServerInstance(newServerInstance)
      setRoomId(targetRoomId)
      setIsConnected(true)
      setConnectionError(null)

      // Register message handlers once per connection
      const room = newServerInstance.server.room
      if (room) {
        registerMessageHandlers(room)
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
