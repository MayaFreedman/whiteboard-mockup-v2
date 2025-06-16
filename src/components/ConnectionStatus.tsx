
import React, { useContext } from 'react';
import { MultiplayerContext } from '../contexts/MultiplayerContext';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, Wifi, WifiOff } from 'lucide-react';

export const ConnectionStatus: React.FC = () => {
  const multiplayerContext = useContext(MultiplayerContext);

  if (!multiplayerContext) {
    return null;
  }

  const { isConnected, roomId, connectionError, isAutoConnecting } = multiplayerContext;

  if (isAutoConnecting) {
    return (
      <Alert className="fixed top-4 right-4 w-80 z-50">
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertDescription>
          Connecting to room...
        </AlertDescription>
      </Alert>
    );
  }

  if (connectionError) {
    return (
      <Alert variant="destructive" className="fixed top-4 right-4 w-80 z-50">
        <WifiOff className="h-4 w-4" />
        <AlertDescription>
          Connection failed: {connectionError}
        </AlertDescription>
      </Alert>
    );
  }

  if (isConnected && roomId) {
    return (
      <Alert className="fixed top-4 right-4 w-80 z-50 bg-green-50 border-green-200">
        <Wifi className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          Connected to room: <strong>{roomId}</strong>
        </AlertDescription>
      </Alert>
    );
  }

  // Show "not connected" state only if no auto-connection is happening
  const urlParams = new URLSearchParams(window.location.search);
  const hasRoomParam = urlParams.get('room') || urlParams.get('roomId');
  
  if (!hasRoomParam) {
    return (
      <Alert className="fixed top-4 right-4 w-80 z-50 bg-yellow-50 border-yellow-200">
        <WifiOff className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          Room not connected. Add <code>?room=your-room-id</code> to URL to auto-connect.
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};
