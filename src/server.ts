
/* global getConfigurationServerURL, jsonClone, simpleRequest, Colyseus */
'use strict'
import { Client } from 'colyseus.js'

export class ServerClass {
  constructor() {}
  server: any = {}
  client = new Client('ws://localhost:4001')

  async connectToColyseusServer(colyseusRoomID: string, isModerator: boolean) {
    console.log('🔌 Attempting to connect to Colyseus server at ws://localhost:4001')
    console.log('📋 Room ID:', colyseusRoomID)
    console.log('👑 Is Moderator:', isModerator)

    // First, let's test if the server is reachable
    try {
      console.log('🌐 Testing server connectivity...')
      const testResponse = await fetch('http://localhost:4001', { 
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      })
      console.log('✅ Server is reachable, status:', testResponse.status)
    } catch (fetchError) {
      console.error('❌ Server connectivity test failed:', fetchError)
      throw new Error(`Cannot reach Colyseus server at localhost:4001. Is the server running? Error: ${fetchError?.message || 'Unknown network error'}`)
    }

    try {
      console.log('🔍 Joining room by ID...')
      console.log('📡 Client state before join:', {
        client: !!this.client
      })
      
      // Create the join promise with detailed logging
      console.log('🚀 Creating join promise...')
      const joinPromise = this.client.joinById(colyseusRoomID, {
        type: 'videoSession',
        moderator: isModerator,
      })

      console.log('⏳ Join promise created, adding listeners...')

      // Add temporary listeners to track connection progress
      const tempRoom = await new Promise((resolve, reject) => {
        // Set up a timeout that will reject the promise
        const timeout = setTimeout(() => {
          console.error('⏰ Connection timeout after 20 seconds')
          reject(new Error('Connection timeout after 20 seconds - likely a schema decode error'))
        }, 20000)

        // When the join promise resolves, we'll get the room object
        joinPromise.then((room) => {
          console.log('✅ Join promise resolved, room object received')
          console.log('🏠 Room details:', {
            roomId: room.roomId,
            sessionId: room.sessionId,
            name: room.name,
            state: room.state ? 'has state' : 'no state'
          })

          // Set up detailed event logging BEFORE clearing timeout
          console.log('📡 Setting up room event listeners...')
          
          room.onStateChange.once((state: any) => {
            console.log('🎯 FIRST state change received')
            console.log('📊 State structure:', {
              hasState: !!state,
              stateKeys: state ? Object.keys(state) : [],
              hasPlayers: state && state.players ? 'yes' : 'no',
              hasPlayspaceGameState: state && state.playspaceGameState ? 'yes' : 'no'
            })
            
            if (state && state.playspaceGameState) {
              console.log('🎮 PlayspaceGameState details:', {
                hasState: !!state.playspaceGameState.state,
                stateLength: state.playspaceGameState.state ? state.playspaceGameState.state.length : 0,
                statePreview: state.playspaceGameState.state ? state.playspaceGameState.state.substring(0, 100) : 'empty'
              })
            }
          })

          room.onMessage('defaultRoomState', (message: any) => {
            console.log('🏠 Default room state message received')
            console.log('📦 Message structure:', {
              hasMessage: !!message,
              messageKeys: message ? Object.keys(message) : [],
              messageType: typeof message
            })
          })

          room.onMessage('broadcast', (message: any) => {
            console.log('📨 Broadcast message received:', message)
          })

          room.onError((code: any, message: any) => {
            console.error('❌ Room error occurred:', { code, message })
            console.error('🔍 Error details:', {
              errorString: String(message),
              includesRefId: String(message).includes('refId'),
              errorCode: code
            })
            
            // Enhanced refId error detection
            if (String(message).includes('refId')) {
              console.error('🚨 DETECTED REFID ERROR - This is a schema decode error!')
              console.error('💡 This usually means the server sent state data before the client was ready')
              console.error('💡 Or there was a schema mismatch between client and server')
            }
          })

          room.onLeave((code: any) => {
            console.log('👋 Left room with code:', code)
          })

          clearTimeout(timeout)
          resolve(room)
        }).catch((error) => {
          console.error('💥 Join promise rejected:', error)
          console.error('🔍 Error type:', typeof error)
          console.error('🔍 Error message:', error.message || 'no message')
          console.error('🔍 Error stack:', error.stack)
          
          // Check for refId error in the join error
          if (String(error.message || error).includes('refId')) {
            console.error('🚨 REFID ERROR DETECTED IN JOIN PROCESS!')
          }
          
          clearTimeout(timeout)
          reject(error)
        })
      })

      this.server.room = tempRoom
      console.log('🎯 All setup complete, connection established')

    } catch (error) {
      console.error('💥 Failed to connect to Colyseus server:', error)
      
      // Enhanced error analysis
      const errorString = String(error.message || error)
      console.error('🔍 Detailed error analysis:', {
        hasRefId: errorString.includes('refId'),
        hasTimeout: errorString.includes('timeout'),
        hasSchema: errorString.includes('schema'),
        hasDecode: errorString.includes('decode'),
        errorType: typeof error,
        errorConstructor: error.constructor.name
      })
      
      // Check for schema-related errors
      if (errorString.includes('refId')) {
        throw new Error('Schema decode error: The server and client have mismatched schemas. The server is sending state data that the client cannot decode. Check the server-side State schema definition.')
      }
      
      // Check if it's a network error
      if (error && typeof error === 'object' && 'type' in error && error.type === 'error') {
        throw new Error('WebSocket connection failed. The Colyseus server may not be running on localhost:4001 or may not be accepting WebSocket connections.')
      }
      
      throw error
    }
  }

  sendState(payload: any) {
    console.log('📤 Sending state:', payload)
    if (!this.server.room) {
      console.error('❌ Cannot send state: room not connected')
      throw new Error('Cannot send stateUpdate message as this.room does not exist')
    }
    this.server.room.send('stateUpdate', payload)
  }

  sendEvent(payload: any) {
    console.log('📡 Sending event:', payload)
    if (this.server.room) {
      this.server.room.send('broadcast', payload)
    } else {
      console.error('❌ Cannot send event: room not connected')
    }
  }
}
