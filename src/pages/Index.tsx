
import { Whiteboard } from '../components/Whiteboard';
import { DevToolsOverlay } from '../components/DevToolsOverlay';
import { DEV_MODE } from '../config/devMode';

const Index = () => {
  return (
    <div className="h-screen overflow-hidden">
      <Whiteboard />
      {DEV_MODE && <DevToolsOverlay />}
    </div>
  );
};

export default Index;
