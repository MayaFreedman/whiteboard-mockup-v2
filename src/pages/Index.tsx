
import { Whiteboard } from '../components/Whiteboard';
import { DevToolsOverlay } from '../components/DevToolsOverlay';
import { MultiplayerTestPanel } from '../components/MultiplayerTestPanel';

const Index = () => {
  return (
    <div className="h-screen overflow-hidden">
      <Whiteboard />
      <DevToolsOverlay />
      
      {/* Multiplayer Test Panel - Positioned in bottom right */}
      <div className="absolute bottom-4 right-4 z-50">
        <MultiplayerTestPanel />
      </div>
    </div>
  );
};

export default Index;
