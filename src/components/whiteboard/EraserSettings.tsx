
import React from 'react';
import { useToolStore } from '../../stores/toolStore';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';

/**
 * Eraser settings component for the sidebar
 * Allows users to configure eraser mode, size, and opacity
 */
export const EraserSettings: React.FC = () => {
  const { toolSettings, updateToolSettings } = useToolStore();

  const handleModeChange = (mode: 'pixel' | 'object') => {
    updateToolSettings({ eraserMode: mode });
  };

  const handleSizeChange = (value: number[]) => {
    updateToolSettings({ eraserSize: value[0] });
  };

  const handleOpacityChange = (value: number[]) => {
    updateToolSettings({ eraserOpacity: value[0] / 100 });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Eraser Mode</Label>
        <div className="flex gap-2 mt-2">
          <Button
            variant={toolSettings.eraserMode === 'pixel' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleModeChange('pixel')}
            className="flex-1"
          >
            Pixel
          </Button>
          <Button
            variant={toolSettings.eraserMode === 'object' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleModeChange('object')}
            className="flex-1"
          >
            Object
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {toolSettings.eraserMode === 'pixel' 
            ? 'Erases pixels within the eraser area'
            : 'Deletes entire objects touched by the eraser'
          }
        </p>
      </div>

      <Separator />

      <div>
        <Label className="text-sm font-medium">
          Size: {toolSettings.eraserSize}px
        </Label>
        <Slider
          value={[toolSettings.eraserSize]}
          onValueChange={handleSizeChange}
          min={5}
          max={100}
          step={5}
          className="mt-2"
        />
      </div>

      <div>
        <Label className="text-sm font-medium">
          Opacity: {Math.round(toolSettings.eraserOpacity * 100)}%
        </Label>
        <Slider
          value={[toolSettings.eraserOpacity * 100]}
          onValueChange={handleOpacityChange}
          min={10}
          max={100}
          step={10}
          className="mt-2"
        />
      </div>
    </div>
  );
};
