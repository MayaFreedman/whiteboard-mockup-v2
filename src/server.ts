
/* global getConfigurationServerURL, jsonClone, simpleRequest, Colyseus */
'use strict'
import { Client } from 'colyseus.js'

export class ServerClass {
  constructor() {}
  server: any = {}
  client = new Client('http://localhost:4001')

  async connectToColyseusServer(colyseusRoomID: string, isModerator: boolean) {
    console.log('🔌 Attempting to connect to Colyseus server at http://localhost:4001')
    console.log('📋 Room ID:', colyseusRoomID)
    console.log('👑 Is Moderator:', isModerator)

    try {
      console.log('🔍 Joining room by ID...')
      
      // Add timeout to the join request
      const joinPromise = this.client.joinById(colyseusRoomID, {
        type: 'videoSession',
        moderator: isModerator,
      })

      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Connection timeout after 10 seconds'))
        }, 10000)
      })

      // Race between join and timeout
      this.server.room = await Promise.race([joinPromise, timeoutPromise])

      console.log('✅ Successfully connected to room:', colyseusRoomID)
      console.log('🏠 Room object:', this.server.room)

      this.server.room.onStateChange((state) => {
        console.log('📡 State changed:', state)
        if (state.playspaceGameState) {
          console.log('🎮 Game state:', state.playspaceGameState)
          const parsedObject = JSON.parse(state.playspaceGameState.state)
          console.log('📦 Parsed object:', parsedObject)
        }
      })

      this.server.room.onMessage('broadcast', (message) => {
        console.log('📨 Broadcast message received:', message)
      })

      this.server.room.onError((code, message) => {
        console.error('❌ Room error:', { code, message })
      })

      this.server.room.onLeave((code) => {
        console.log('👋 Left room with code:', code)
      })

    } catch (error) {
      console.error('💥 Failed to connect to Colyseus server:', error)
      console.error('📊 Error type:', typeof error)
      console.error('📊 Error constructor:', error?.constructor?.name)
      
      // Better error inspection
      if (error instanceof Error) {
        console.error('📊 Error name:', error.name)
        console.error('📊 Error message:', error.message)
        console.error('📊 Error stack:', error.stack)
      } else {
        console.error('📊 Raw error object:', JSON.stringify(error, null, 2))
      }
      
      // Check if it's a network error
      if (error && typeof error === 'object') {
        console.error('📊 Error keys:', Object.keys(error))
        console.error('📊 Error values:', Object.values(error))
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
