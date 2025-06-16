
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
      
      // Add timeout to the join request
      const joinPromise = this.client.joinById(colyseusRoomID, {
        type: 'videoSession',
        moderator: isModerator,
      })

      console.log('⏳ Join promise created, waiting for resolution...')

      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          console.error('⏰ Join timeout reached after 15 seconds')
          reject(new Error('Connection timeout after 15 seconds - likely a schema decode error'))
        }, 15000) // Increased timeout to 15 seconds
      })

      // Race between join and timeout
      console.log('🏁 Starting promise race...')
      this.server.room = await Promise.race([joinPromise, timeoutPromise])

      console.log('✅ Successfully connected to room:', colyseusRoomID)
      console.log('🏠 Room object:', {
        id: this.server.room.id,
        sessionId: this.server.room.sessionId,
        name: this.server.room.name
      })

      // Set up event handlers AFTER successful connection
      this.server.room.onStateChange((state) => {
        console.log('📡 State changed - keys:', Object.keys(state || {}))
        try {
          if (state && state.playspaceGameState && state.playspaceGameState.state) {
            console.log('🎮 Game state received:', state.playspaceGameState.state)
            const parsedObject = JSON.parse(state.playspaceGameState.state)
            console.log('📦 Parsed object:', parsedObject)
          }
        } catch (parseError) {
          console.error('❌ Error parsing game state:', parseError)
        }
      })

      this.server.room.onMessage('broadcast', (message) => {
        console.log('📨 Broadcast message received:', message)
      })

      this.server.room.onMessage('defaultRoomState', (message) => {
        console.log('🏠 Default room state received:', message)
      })

      this.server.room.onError((code, message) => {
        console.error('❌ Room error:', { code, message })
        if (message && message.includes('refId')) {
          console.error('🔍 Schema decode error detected - this is likely a server/client schema mismatch')
        }
      })

      this.server.room.onLeave((code) => {
        console.log('👋 Left room with code:', code)
      })

      console.log('🎯 All event handlers set up successfully')

    } catch (error) {
      console.error('💥 Failed to connect to Colyseus server:', error)
      
      // Check for schema-related errors
      if (error && error.message && error.message.includes('refId')) {
        throw new Error('Schema decode error: The server and client have mismatched schemas. Check that your server-side State schema matches what the client expects.')
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
