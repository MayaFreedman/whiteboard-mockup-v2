

import React from 'react';
import { useToolStore } from '../../stores/toolStore';
import { Badge } from '../ui/badge';

export const ToolStatePanel: React.FC = () => {
  const { 
    activeTool, 
    toolSettings, 
    colorPalettes, 
    activeColorPalette,
    customColors, 
    recentlyUsedColors,
    getActiveColors,
    getMostRecentColors
  } = useToolStore();

  const activeColors = getActiveColors();
  const mostRecentColors = getMostRecentColors(5);

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
          
          <div>
            Size: {activeTool === 'pencil' ? `${toolSettings.pencilSize}px` : activeTool === 'brush' ? `${toolSettings.brushSize}px` : activeTool === 'stamp' ? `${(toolSettings.stampSize || 10) * 10}px` : activeTool === 'eraser' ? `${toolSettings.eraserSize}px` : 'n/a'}
          </div>
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
          <div className="text-sm text-muted-foreground">
            Background settings moved to WhiteboardStore
          </div>
        </div>
      </div>

      {/* Active Color Palette */}
      <div className="space-y-2">
        <div className="font-medium">Active Color Palette</div>
        <div className="bg-muted/30 p-2 rounded">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="default" className="capitalize">{activeColorPalette}</Badge>
            <span className="text-muted-foreground">({activeColors.length} colors)</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {activeColors.map((color, index) => (
              <span
                key={index}
                className={`inline-block w-4 h-4 border rounded ${
                  color === toolSettings.strokeColor ? 'border-primary border-2 ring-1 ring-primary/30' : 'border-border'
                }`}
                style={{ backgroundColor: color }}
                title={`${color} ${color === toolSettings.strokeColor ? '(current)' : ''}`}
              ></span>
            ))}
          </div>
        </div>
      </div>

      {/* Recently Used Colors */}
      {recentlyUsedColors.length > 0 && (
        <div className="space-y-2">
          <div className="font-medium">Recently Used Colors ({recentlyUsedColors.length})</div>
          <div className="bg-muted/30 p-2 rounded">
            <div className="flex flex-wrap gap-1">
              {recentlyUsedColors.map((color, index) => (
                <div key={index} className="flex items-center gap-1">
                  <span
                    className="inline-block w-3 h-3 border rounded"
                    style={{ backgroundColor: color }}
                    title={color}
                  ></span>
                  <span className="text-xs">{color}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Most Recent Colors Function */}
      <div className="space-y-2">
        <div className="font-medium">Most Recent Colors (5)</div>
        <div className="bg-muted/30 p-2 rounded">
          <div className="flex flex-wrap gap-1">
            {mostRecentColors.map((color, index) => (
              <span
                key={index}
                className="inline-block w-4 h-4 border rounded"
                style={{ backgroundColor: color }}
                title={color}
              ></span>
            ))}
          </div>
        </div>
      </div>

      {/* All Color Palettes */}
      <div className="space-y-2">
        <div className="font-medium">All Color Palettes</div>
        <div className="space-y-2">
          {Object.entries(colorPalettes).map(([name, colors]) => (
            <div key={name} className="bg-muted/30 p-2 rounded">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium capitalize">{name}</span>
                {name === activeColorPalette && <Badge variant="default" className="text-xs">Active</Badge>}
                <span className="text-muted-foreground">({colors.length})</span>
              </div>
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

      {/* Store Functions Debug */}
      <div className="space-y-2">
        <div className="font-medium">Store Functions</div>
        <div className="bg-muted/30 p-2 rounded space-y-1 text-xs">
          <div>✓ setActiveTool</div>
          <div>✓ updateToolSettings</div>
          <div>✓ addCustomColor</div>
          <div>✓ setActiveColorPalette</div>
          <div>✓ getActiveColors</div>
          <div>✓ updateRecentlyUsedColor</div>
          <div>✓ getMostRecentColors</div>
        </div>
      </div>
    </div>
  );
};

