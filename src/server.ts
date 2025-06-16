
/* global getConfigurationServerURL, jsonClone, simpleRequest, Colyseus */
'use strict'
import { Client } from 'colyseus.js'

export class ServerClass {
  constructor() {}
  server: any = {}
  client = new Client('ws://localhost:4001')

  async connectToColyseusServer(colyseusRoomID: string, isModerator: boolean) {
    console.log('🔌 Attempting PURE MESSAGE-BASED connection to Colyseus server at ws://localhost:4001')
    console.log('📋 Room ID:', colyseusRoomID)
    console.log('👑 Is Moderator:', isModerator)

    // First, let's test if the server is reachable
    try {
      console.log('🌐 Testing server connectivity...')
      const testResponse = await fetch('http://localhost:4001', { 
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      })
      console.log('✅ Server is reachable, status:', testResponse.status)
    } catch (fetchError) {
      console.error('❌ Server connectivity test failed:', fetchError)
      throw new Error(`Cannot reach Colyseus server at localhost:4001. Is the server running? Error: ${fetchError?.message || 'Unknown network error'}`)
    }

    try {
      console.log('🔍 Joining room by ID (message-based mode)...')
      
      const joinPromise = this.client.joinById(colyseusRoomID, {
        type: 'videoSession',
        moderator: isModerator,
      })

      console.log('⏳ Join promise created, setting up message-only handlers...')

      const tempRoom = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.error('⏰ Connection timeout after 20 seconds')
          reject(new Error('Connection timeout after 20 seconds'))
        }, 20000)

        joinPromise.then((room) => {
          console.log('✅ Room joined successfully (message-based)')
          console.log('🏠 Room details:', {
            roomId: room.roomId,
            sessionId: room.sessionId,
            name: room.name
          })

          console.log('📡 Setting up MESSAGE-ONLY event listeners...')
          
          // REMOVED: room.onStateChange - this was causing refId errors
          // The server will send state via 'defaultRoomState' message instead

          room.onMessage('defaultRoomState', (message: any) => {
            console.log('🏠 Default room state message received (replacing schema sync)')
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
            
            // This should no longer happen with pure message-based approach
            if (String(message).includes('refId')) {
              console.error('🚨 UNEXPECTED REFID ERROR - This should not happen in message-only mode!')
              console.error('💡 Check if server is still trying to send schema data')
            }
          })

          room.onLeave((code: any) => {
            console.log('👋 Left room with code:', code)
          })

          clearTimeout(timeout)
          resolve(room)
        }).catch((error) => {
          console.error('💥 Join promise rejected:', error)
          
          // Enhanced error analysis for message-based mode
          if (String(error.message || error).includes('refId')) {
            console.error('🚨 REFID ERROR IN MESSAGE-BASED MODE!')
            console.error('💡 This suggests the server is still sending schema data')
            console.error('💡 Verify server is configured for pure message-based communication')
          }
          
          clearTimeout(timeout)
          reject(error)
        })
      })

      this.server.room = tempRoom
      console.log('🎯 Pure message-based connection established successfully')

    } catch (error) {
      console.error('💥 Failed to establish message-based connection:', error)
      
      const errorString = String(error.message || error)
      console.error('🔍 Error analysis for message-based mode:', {
        hasRefId: errorString.includes('refId'),
        hasTimeout: errorString.includes('timeout'),
        hasSchema: errorString.includes('schema'),
        hasDecode: errorString.includes('decode'),
        errorType: typeof error
      })
      
      if (errorString.includes('refId')) {
        throw new Error('Schema error in message-based mode: The server is still trying to send schema data. Ensure server uses only custom messages for state synchronization.')
      }
      
      throw error
    }
  }

  sendState(payload: any) {
    console.log('📤 Sending state via message:', payload)
    if (!this.server.room) {
      console.error('❌ Cannot send state: room not connected')
      throw new Error('Cannot send stateUpdate message as this.room does not exist')
    }
    this.server.room.send('stateUpdate', payload)
  }

  sendEvent(payload: any) {
    console.log('📡 Sending event via message:', payload)
    if (this.server.room) {
      this.server.room.send('broadcast', payload)
    } else {
      console.error('❌ Cannot send event: room not connected')
    }
  }
}
