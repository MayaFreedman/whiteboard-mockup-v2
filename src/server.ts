
/* global getConfigurationServerURL, jsonClone, simpleRequest, Colyseus */
'use strict'
import { Client } from 'colyseus.js'

export class ServerClass {
  constructor() {}
  server: any = {}
  //need to change this too
  client = new Client('http://localhost:4001')

  async connectToColyseusServer(colyseusRoomID: string, isModerator: boolean) {
    // colyseusRoomID = 'azRwzJneM'
    console.log('Connecting to colyseus server...')

    this.server.room = await this.client.joinById(colyseusRoomID, {
      type: 'videoSession',
      moderator: isModerator,
    })

    console.log('Connected to colyseus server', colyseusRoomID)

    this.server.room.onStateChange((state) => {
      console.log('State changed:', state.playspaceGameState)
      console.log('HERE')
      const parsedObject = JSON.parse(state.playspaceGameState.state)

      // if (Object.keys(parsedObject).length > 0) {
      //   main.handleStateChange(parsedObject)
      // }
    })

    this.server.room.onMessage('broadcast', (message) => {
      console.log('Message received:', message)
      // main.messageReceivedColyseus(message)
    })
  }

  sendState(payload: any) {
    this.server.room.send('stateUpdate', payload)
  }

  sendEvent(payload: any) {
    this.server.room.send('broadcast', payload)
  }
}

// export async function setUpServer(main) {
//   console.log('is running', main)
//   const server: any = {}
//   //need to change this too
//   console.log('BOOGLYBOO')
//   const client = new Client('http://localhost:4001')
//   console.log(client)

//   async function connectToColyseusServer(colyseusRoomID, isModerator) {
//     colyseusRoomID = 'CKl8xAvIY'
//     console.log('Connecting to colyseus server...')
//     server.room = await client.joinById(colyseusRoomID, {
//       type: 'videoSession',
//       moderator: isModerator,
//     })
//     console.log('Connected to colyseus server', colyseusRoomID)

//     server.room.onStateChange((state) => {
//       console.log('State changed:', state.playspaceGameState)
//       const parsedObject = JSON.parse(state.playspaceGameState.state)

//       if (Object.keys(parsedObject).length > 0) {
//         main.handleStateChange(parsedObject)
//       }
//     })

//     server.room.onMessage('broadcast', (message) => {
//       console.log('Message received:', message)
//       main.messageReceivedColyseus(message)
//     })
//   }

//   connectToColyseusServer('CKl8xAvIY', true)

//   server.sendState = (payload) => {
//     console.log('Sending state:', payload)
//     if (!server.room) {
//       throw new Error(
//         'Cannot send stateUpdate message as this.room does not exist'
//       )
//     }
//     server.room.send('stateUpdate', payload)
//   }

//   server.sendevent = (payload) => {
//     if (server.room) {
//       server.room.send('broadcast', payload)
//     }
//   }

//   // return server
// }
