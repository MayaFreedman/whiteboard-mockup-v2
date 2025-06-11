
import React from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { Badge } from '../ui/badge';

export const WhiteboardStatePanel: React.FC = () => {
  const { objects, selectedObjectIds, viewport, settings } = useWhiteboardStore();

  const objectEntries = Object.entries(objects);
  const selectedObjects = objectEntries.filter(([id]) => selectedObjectIds.includes(id));

  return (
    <div className="space-y-4 text-xs">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-muted/50 p-2 rounded">
          <div className="font-medium">Objects</div>
          <div className="text-lg font-bold">{objectEntries.length}</div>
        </div>
        <div className="bg-muted/50 p-2 rounded">
          <div className="font-medium">Selected</div>
          <div className="text-lg font-bold">{selectedObjectIds.length}</div>
        </div>
      </div>

      {/* Viewport Info */}
      <div className="space-y-2">
        <div className="font-medium">Viewport</div>
        <div className="bg-muted/30 p-2 rounded space-y-1">
          <div>Position: ({viewport.x}, {viewport.y})</div>
          <div>Zoom: {(viewport.zoom * 100).toFixed(1)}%</div>
        </div>
      </div>

      {/* Settings */}
      <div className="space-y-2">
        <div className="font-medium">Settings</div>
        <div className="bg-muted/30 p-2 rounded space-y-1">
          <div className="flex items-center gap-2">
            Grid: <Badge variant={settings.gridVisible ? "default" : "secondary"}>
              {settings.gridVisible ? "ON" : "OFF"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            Lined Paper: <Badge variant={settings.linedPaperVisible ? "default" : "secondary"}>
              {settings.linedPaperVisible ? "ON" : "OFF"}
            </Badge>
          </div>
          <div>Background: 
            <span className="ml-2 inline-block w-4 h-4 border rounded" 
                  style={{ backgroundColor: settings.backgroundColor }}></span>
            <span className="ml-1">{settings.backgroundColor}</span>
          </div>
        </div>
      </div>

      {/* Selected Objects Details */}
      {selectedObjects.length > 0 && (
        <div className="space-y-2">
          <div className="font-medium">Selected Objects</div>
          <div className="max-h-32 overflow-auto space-y-2">
            {selectedObjects.map(([id, obj]) => (
              <div key={id} className="bg-muted/30 p-2 rounded">
                <div className="font-medium text-xs">{obj.type}</div>
                <div className="text-xs text-muted-foreground">ID: {id.slice(0, 8)}...</div>
                <div className="text-xs">
                  Pos: ({obj.x}, {obj.y})
                  {obj.width && obj.height && (
                    <span> Size: {obj.width}×{obj.height}</span>
                  )}
                </div>
                {obj.fill && (
                  <div className="flex items-center gap-1 text-xs">
                    Fill: 
                    <span className="inline-block w-3 h-3 border rounded" 
                          style={{ backgroundColor: obj.fill }}></span>
                    {obj.fill}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Objects List */}
      <div className="space-y-2">
        <div className="font-medium">All Objects ({objectEntries.length})</div>
        <div className="max-h-40 overflow-auto space-y-1">
          {objectEntries.map(([id, obj]) => (
            <div key={id} className="flex items-center justify-between text-xs p-1 hover:bg-muted/50 rounded">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs py-0">{obj.type}</Badge>
                <span className="text-muted-foreground">{id.slice(0, 8)}...</span>
              </div>
              <div className="text-muted-foreground">
                ({obj.x}, {obj.y})
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
