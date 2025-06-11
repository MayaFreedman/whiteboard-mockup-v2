
import { Whiteboard } from '../components/Whiteboard';
import { DevToolsOverlay } from '../components/DevToolsOverlay';

const Index = () => {
  return (
    <div className="h-screen overflow-hidden">
      <Whiteboard />
      <DevToolsOverlay />
    </div>
  );
};

export default Index;
