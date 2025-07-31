
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
        
        // Track active users with a Set
        const activeUsers = new Set<string>()
        
        const updateUserCount = () => {
          const count = activeUsers.size
          console.log('👥 Active users:', Array.from(activeUsers), 'Count:', count)
          setConnectedUserCount(count)
        }
        
        // Listen for user join/leave broadcasts
        room.onMessage('broadcast', (message: any) => {
          if (message.type === 'user_joined') {
            console.log('👥 User joined:', message.userId)
            activeUsers.add(message.userId)
            updateUserCount()
          } else if (message.type === 'user_left') {
            console.log('👥 User left:', message.userId)
            activeUsers.delete(message.userId)
            updateUserCount()
          }
        })
        
        // Broadcast that we joined
        const broadcastJoin = () => {
          console.log('📢 Broadcasting that we joined')
          room.send('broadcast', {
            type: 'user_joined',
            userId: room.sessionId
          })
          // Add ourselves to the active users
          activeUsers.add(room.sessionId)
          updateUserCount()
        }
        
        // Listen for room leave to broadcast departure
        room.onLeave(() => {
          console.log('📢 Broadcasting that we left')
          room.send('broadcast', {
            type: 'user_left',
            userId: room.sessionId
          })
        })
        
        // Store the broadcast function to call it after connection is complete
        ;(room as any)._broadcastJoin = broadcastJoin
      }

      console.log('✅ Connection successful!')
      
      // Now broadcast that we joined (after connection is complete)
      if (newServerInstance.server.room && (newServerInstance.server.room as any)._broadcastJoin) {
        (newServerInstance.server.room as any)._broadcastJoin()
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
