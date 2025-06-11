
import { useEffect } from 'react';
import { useWhiteboardStore } from '../stores/whiteboardStore';
import { useToolStore } from '../stores/toolStore';
import { DevToolsOverlay } from '../components/DevToolsOverlay';

const Index = () => {
  const { objects, selectedObjectIds, viewport, settings } = useWhiteboardStore();
  const { activeTool, toolSettings } = useToolStore();

  useEffect(() => {
    console.log('Whiteboard state initialized');
    console.log('Objects:', Object.keys(objects).length);
    console.log('Selected:', selectedObjectIds.length);
    console.log('Viewport:', viewport);
    console.log('Active tool:', activeTool);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold mb-4">Whiteboard State Architecture Ready!</h1>
        <div className="text-left space-y-2 text-sm">
          <p><strong>Objects in canvas:</strong> {Object.keys(objects).length}</p>
          <p><strong>Selected objects:</strong> {selectedObjectIds.length}</p>
          <p><strong>Active tool:</strong> {activeTool}</p>
          <p><strong>Stroke color:</strong> {toolSettings.strokeColor}</p>
          <p><strong>Zoom level:</strong> {viewport.zoom}x</p>
          <p><strong>Grid visible:</strong> {settings.gridVisible ? 'Yes' : 'No'}</p>
        </div>
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            ✅ Multiplayer-ready state management with Zustand<br/>
            ✅ Action-based updates for easy Colyseus integration<br/>
            ✅ Undo/redo system with action history<br/>
            ✅ Serializable state for network synchronization<br/>
            ✅ Fabric.js integration utilities<br/>
            ✅ Separate tool and whiteboard state stores<br/>
            ✅ Developer tools overlay with stroke tracking<br/>
            <br/>
            <strong>🛠️ Dev Tools:</strong> Press Ctrl+D or click the dev button in bottom-right
          </p>
        </div>
      </div>
      
      <DevToolsOverlay />
    </div>
  );
};

export default Index;
