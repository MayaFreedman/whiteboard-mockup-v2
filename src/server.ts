/* global getConfigurationServerURL, jsonClone, simpleRequest, Colyseus */
"use strict";
import { Client } from "colyseus.js";

export class ServerClass {
  constructor() {}
  server: any = {};
  client = new Client("https://ca-yto-8b3f79b2.colyseus.cloud");

  async connectToColyseusServer(colyseusRoomID: string, isModerator: boolean) {

    // Test server connectivity
    try {
      const testResponse = await fetch(
        "https://ca-yto-8b3f79b2.colyseus.cloud",
        {
          method: "GET",
          signal: AbortSignal.timeout(5000),
        }
      );
      if (!testResponse.ok) {
        throw new Error(`Server returned status ${testResponse.status}`)
      }
    } catch (fetchError) {
      throw new Error(
        `Cannot reach Colyseus server. Error: ${
          fetchError?.message || "Unknown network error"
        }`
      );
    }

    try {
      const joinPromise = this.client.joinById(colyseusRoomID, {
        type: "videoSession",
        moderator: isModerator,
      });

      const tempRoom = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(
            new Error(
              "Connection timeout after 20 seconds - likely a schema decode error"
            )
          );
        }, 20000);

        joinPromise
          .then((room) => {
            // Set up basic event listeners
            room.onStateChange.once((state: any) => {
              // State change handled
            });

            room.onMessage("defaultRoomState", (message: any) => {
              // Default room state handled
            });

            room.onError((code: any, message: any) => {
              console.error("❌ Room error occurred:", { code, message });
              
              if (String(message).includes("refId")) {
                console.error("🚨 DETECTED REFID ERROR - Schema decode error!");
              }
            });

            room.onLeave((code: any) => {
              console.log("👋 Left room with code:", code);
            });

            clearTimeout(timeout);
            resolve(room);
          })
          .catch((error) => {
            console.error("💥 Join promise rejected:", error);
            
            if (String(error.message || error).includes("refId")) {
              console.error("🚨 REFID ERROR DETECTED IN JOIN PROCESS!");
            }

            clearTimeout(timeout);
            reject(error);
          });
      });

      this.server.room = tempRoom;
      
    } catch (error) {
      console.error("💥 Failed to connect to Colyseus server:", error);

      const errorString = String(error.message || error);

      if (errorString.includes("refId")) {
        throw new Error(
          "Schema decode error: The server and client have mismatched schemas."
        );
      }

      if (
        error &&
        typeof error === "object" &&
        "type" in error &&
        error.type === "error"
      ) {
        throw new Error(
          "WebSocket connection failed. The Colyseus server may not be running."
        );
      }

      throw error;
    }
  }

  requestInitialState() {
    if (!this.server.room) {
      return;
    }

    try {
      this.server.room.send("broadcast", {
        type: "request_state",
        timestamp: Date.now(),
        requesterId: this.server.room.sessionId
      });
    } catch (error) {
      console.error("❌ Failed to send state request:", error);
    }
  }

  sendStateResponse(requesterId: string, whiteboardState: any) {
    if (!this.server.room) {
      return;
    }

    try {
      this.server.room.send("broadcast", {
        type: "state_response",
        timestamp: Date.now(),
        requesterId,
        state: whiteboardState
      });
    } catch (error) {
      console.error("❌ Failed to send state response:", error);
    }
  }

  sendState(payload: any) {
    if (!this.server.room) {
      throw new Error(
        "Cannot send stateUpdate message as this.room does not exist"
      );
    }
    this.server.room.send("stateUpdate", payload);
  }

  sendEvent(payload: any) {
    if (!this.server.room) {
      throw new Error("Cannot send event: room not connected");
    }

    try {
      this.server.room.send("broadcast", payload);
    } catch (error) {
      console.error("❌ Failed to send event:", error);
      throw error;
    }
  }
}
