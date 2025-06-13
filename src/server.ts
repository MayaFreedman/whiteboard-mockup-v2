
/* global getConfigurationServerURL, jsonClone, simpleRequest, Colyseus */
'use strict'
import { Client } from 'colyseus.js'

export class ServerClass {
  constructor() {}
  server: any = {}
  //need to change this too
  client = new Client('http://localhost:4001')

  async connectToColyseusServer(colyseusRoomID: string, isModerator: boolean) {
    console.log('🔌 Attempting to connect to Colyseus server at http://localhost:4001')
    console.log('📋 Room ID:', colyseusRoomID)
    console.log('👑 Is Moderator:', isModerator)

    try {
      console.log('🔍 Joining room by ID...')
      this.server.room = await this.client.joinById(colyseusRoomID, {
        type: 'videoSession',
        moderator: isModerator,
      })

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
      console.error('📊 Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      })
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
