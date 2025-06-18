
import React from 'react';
import { useToolStore } from '../../stores/toolStore';
import { Slider } from '../ui/slider';

/**
 * Shape-specific settings component
 */
export const ShapeSettings: React.FC = () => {
  const { toolSettings, updateToolSettings, getActiveColors } = useToolStore();
  
  const allColors = getActiveColors();

  const handleFillColorSelect = (color: string) => {
    updateToolSettings({ fillColor: color });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">
          Border Weight: {toolSettings.shapeBorderWeight || 2}px
        </label>
        <Slider
          value={[toolSettings.shapeBorderWeight || 2]}
          onValueChange={(value) => updateToolSettings({ shapeBorderWeight: value[0] })}
          min={1}
          max={10}
          step={1}
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">
          Opacity: {Math.round(toolSettings.opacity * 100)}%
        </label>
        <Slider
          value={[toolSettings.opacity]}
          onValueChange={(value) => updateToolSettings({ opacity: value[0] })}
          min={0.1}
          max={1}
          step={0.1}
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">
          Fill Color for Fill Tool
        </label>
        <div className="flex gap-2 flex-wrap">
          {allColors.map((color) => (
            <button
              key={color}
              className={`w-8 h-8 rounded border-2 transition-all ${
                (toolSettings.fillColor || toolSettings.strokeColor) === color
                  ? 'border-primary scale-110' 
                  : 'border-border hover:border-muted-foreground/50'
              }`}
              style={{ backgroundColor: color }}
              onClick={() => handleFillColorSelect(color)}
              title={`Set fill color: ${color}`}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Use the fill tool to apply this color to shapes
        </p>
      </div>
    </div>
  );
};
