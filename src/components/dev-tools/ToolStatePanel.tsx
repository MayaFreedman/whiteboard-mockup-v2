
import React from 'react';
import { useToolStore } from '../../stores/toolStore';
import { Badge } from '../ui/badge';

export const ToolStatePanel: React.FC = () => {
  const { activeTool, toolSettings, colorPalettes, customColors } = useToolStore();

  return (
    <div className="space-y-4 text-xs">
      {/* Active Tool */}
      <div className="space-y-2">
        <div className="font-medium">Active Tool</div>
        <div className="bg-muted/30 p-2 rounded">
          <Badge variant="default" className="text-sm">{activeTool}</Badge>
        </div>
      </div>

      {/* Tool Settings */}
      <div className="space-y-2">
        <div className="font-medium">Tool Settings</div>
        <div className="bg-muted/30 p-2 rounded space-y-2">
          <div className="flex items-center gap-2">
            Stroke: 
            <span className="inline-block w-4 h-4 border rounded" 
                  style={{ backgroundColor: toolSettings.strokeColor }}></span>
            <span>{toolSettings.strokeColor}</span>
          </div>
          
          <div className="flex items-center gap-2">
            Fill: 
            <span className="inline-block w-4 h-4 border rounded" 
                  style={{ backgroundColor: toolSettings.fillColor }}></span>
            <span>{toolSettings.fillColor}</span>
          </div>
          
          <div>Stroke Width: {toolSettings.strokeWidth}px</div>
          <div>Opacity: {(toolSettings.opacity * 100).toFixed(0)}%</div>
          <div>Brush Type: <Badge variant="outline">{toolSettings.brushType}</Badge></div>
          
          <div className="pt-2 border-t space-y-1">
            <div>Font Size: {toolSettings.fontSize}px</div>
            <div>Font Family: {toolSettings.fontFamily}</div>
          </div>
        </div>
      </div>

      {/* UI Settings */}
      <div className="space-y-2">
        <div className="font-medium">UI Settings</div>
        <div className="bg-muted/30 p-2 rounded space-y-1">
          <div className="flex items-center gap-2">
            Show Grid: <Badge variant={toolSettings.showGrid ? "default" : "secondary"}>
              {toolSettings.showGrid ? "ON" : "OFF"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            Show Lined Paper: <Badge variant={toolSettings.showLinedPaper ? "default" : "secondary"}>
              {toolSettings.showLinedPaper ? "ON" : "OFF"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Color Palettes */}
      <div className="space-y-2">
        <div className="font-medium">Color Palettes</div>
        <div className="space-y-2">
          {Object.entries(colorPalettes).map(([name, colors]) => (
            <div key={name} className="bg-muted/30 p-2 rounded">
              <div className="font-medium capitalize mb-1">{name} ({colors.length})</div>
              <div className="flex flex-wrap gap-1">
                {colors.map((color, index) => (
                  <span
                    key={index}
                    className="inline-block w-3 h-3 border rounded"
                    style={{ backgroundColor: color }}
                    title={color}
                  ></span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Colors */}
      {customColors.length > 0 && (
        <div className="space-y-2">
          <div className="font-medium">Custom Colors ({customColors.length})</div>
          <div className="bg-muted/30 p-2 rounded">
            <div className="flex flex-wrap gap-1">
              {customColors.map((color, index) => (
                <div key={index} className="flex items-center gap-1">
                  <span
                    className="inline-block w-3 h-3 border rounded"
                    style={{ backgroundColor: color }}
                  ></span>
                  <span className="text-xs">{color}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
