
import React, { useState, useContext } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { MultiplayerContext } from '../contexts/MultiplayerContext';

export const MultiplayerTestPanel: React.FC = () => {
  const [roomId, setRoomId] = useState('test-room-123');
  const [isConnecting, setIsConnecting] = useState(false);
  const multiplayerContext = useContext(MultiplayerContext);

  if (!multiplayerContext) {
    return <div>Multiplayer context not available</div>;
  }

  const { connect, disconnect, isConnected, roomId: currentRoomId, connectionError } = multiplayerContext;

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      await connect(roomId, true); // Connect as moderator
      console.log('✅ Connected to room:', roomId);
    } catch (error) {
      console.error('❌ Failed to connect:', error);
    } finally {
      setIsConnecting(false);
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
            disabled={isConnected || isConnecting}
          />
        </div>
        
        <div className="flex gap-2">
          {!isConnected ? (
            <Button 
              onClick={handleConnect} 
              className="flex-1"
              disabled={isConnecting}
            >
              {isConnecting ? 'Connecting...' : 'Connect'}
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

        {connectionError && (
          <div className="text-sm text-red-500 bg-red-50 p-2 rounded">
            Error: {connectionError}
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          Server: http://localhost:4001
        </div>
      </CardContent>
    </Card>
  );
};
