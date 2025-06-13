
import React, { useState, useContext } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { MultiplayerContext } from '../contexts/MultiplayerContext';

export const MultiplayerTestPanel: React.FC = () => {
  const [roomId, setRoomId] = useState('test-room-123');
  const multiplayerContext = useContext(MultiplayerContext);

  if (!multiplayerContext) {
    return <div>Multiplayer context not available</div>;
  }

  const { connect, disconnect, isConnected, roomId: currentRoomId } = multiplayerContext;

  const handleConnect = async () => {
    try {
      await connect(roomId, true); // Connect as moderator
      console.log('✅ Connected to room:', roomId);
    } catch (error) {
      console.error('❌ Failed to connect:', error);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    console.log('🔌 Disconnected from room');
  };

  return (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Multiplayer Test Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">Room ID:</label>
          <Input
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Enter room ID"
            disabled={isConnected}
          />
        </div>
        
        <div className="flex gap-2">
          {!isConnected ? (
            <Button onClick={handleConnect} className="flex-1">
              Connect
            </Button>
          ) : (
            <Button onClick={handleDisconnect} variant="destructive" className="flex-1">
              Disconnect
            </Button>
          )}
        </div>

        <div className="text-sm text-muted-foreground">
          Status: {isConnected ? `Connected to ${currentRoomId}` : 'Disconnected'}
        </div>

        <div className="text-xs text-muted-foreground">
          Note: This connects to localhost:4001. Make sure your Colyseus server is running.
        </div>
      </CardContent>
    </Card>
  );
};
