
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
        console.log('🔍 Room object properties:', Object.keys(room))
        console.log('🔍 Room state:', room.state)
        console.log('🔍 Room clients count:', (room as any).clients?.size || 'not available')
        
        // Check if there's a built-in way to get client count
        const checkUserCount = () => {
          let userCount = 0
          
          // Method 1: Check room.clients (common in Colyseus)
          if ((room as any).clients) {
            userCount = (room as any).clients.size || (room as any).clients.length || Object.keys((room as any).clients).length
            console.log('👥 Method 1 - Room clients count:', userCount)
          }
          
          // Method 2: Check room.state for ACTIVE players only
          if (room.state) {
            console.log('🔍 Room state type:', typeof room.state)
            
            const state = room.state as any
            if (state?.players) {
              // For MapSchema, we need to iterate and check if players are active
              const players = state.players
              let activeCount = 0
              
              console.log('🔍 Players MapSchema:', players)
              
              // Try different ways to count active players
              if (players.size !== undefined) {
                // MapSchema has a size property
                activeCount = players.size
                console.log('👥 Method 2a - MapSchema size:', activeCount)
              } else if (typeof players.forEach === 'function') {
                // Iterate through active players
                players.forEach((player: any, sessionId: string) => {
                  console.log('👥 Found active player:', sessionId, player)
                  activeCount++
                })
                console.log('👥 Method 2b - Active players via forEach:', activeCount)
              } else {
                // Fallback to Object.keys but filter for active
                const playerKeys = Object.keys(players)
                activeCount = playerKeys.filter(key => {
                  const player = players[key]
                  return player && (player.connected !== false) // Assume connected unless explicitly false
                }).length
                console.log('👥 Method 2c - Filtered active players:', activeCount, 'from total:', playerKeys.length)
              }
              
              if (activeCount > 0) {
                userCount = activeCount
              }
            }
          }
          
          // Method 3: Minimum count check - if we're connected, at least 1
          if (userCount === 0 && room.sessionId) {
            userCount = 1 // At least we are connected
            console.log('👥 Method 3 - Fallback to 1 (we are connected)')
          }
          
          console.log('👥 Final calculated user count:', userCount)
          setConnectedUserCount(userCount)
        }
        
        // Check immediately
        checkUserCount()
        
        // Listen for state changes
        room.onStateChange((state: any) => {
          console.log('🔄 State changed, rechecking user count')
          checkUserCount()
        })
        
        // Listen for any join/leave events
        room.onMessage('*', (type: string, message: any) => {
          console.log('📨 Received message type:', type, 'data:', message)
          if (type.includes('join') || type.includes('leave') || type.includes('user') || type.includes('player')) {
            console.log('👥 User-related message detected, rechecking count')
            checkUserCount()
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
