
import React from 'react';
import { useToolStore } from '../../stores/toolStore';
import { Slider } from '../ui/slider';

/**
 * Shape-specific settings component
 */
export const ShapeSettings: React.FC = () => {
  const { toolSettings, updateToolSettings } = useToolStore();

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
        <p className="text-sm text-muted-foreground">
          To fill shapes, select the Fill tool from the toolbar and click on any shape. 
          The fill color will be the currently selected color from the main toolbar.
        </p>
      </div>
    </div>
  );
};
