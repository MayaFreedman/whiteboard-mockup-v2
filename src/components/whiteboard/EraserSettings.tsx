import React from 'react';
import { useToolStore } from '../../stores/toolStore';
import { Slider } from '../ui/slider';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { Button } from '../ui/button';

/**
 * Eraser settings component for the sidebar
 * Allows users to configure eraser mode and size
 */
export const EraserSettings: React.FC = () => {
  const {
    toolSettings,
    updateToolSettings
  } = useToolStore();

  const handleModeChange = (mode: 'pixel' | 'object') => {
    updateToolSettings({
      eraserMode: mode
    });
  };

  const handleSizeChange = (value: number[]) => {
    updateToolSettings({
      eraserSize: value[0]
    });
  };

  return <div className="space-y-3">
      <div>
        <Label className="text-sm font-medium">Eraser Mode</Label>
        <div className="flex gap-2 mt-2">
          <Button variant={toolSettings.eraserMode === 'pixel' ? 'default' : 'outline'} size="sm" onClick={() => handleModeChange('pixel')} className="flex-1">Erase</Button>
          <Button variant={toolSettings.eraserMode === 'object' ? 'default' : 'outline'} size="sm" onClick={() => handleModeChange('object')} className="flex-1">Remove</Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {toolSettings.eraserMode === 'pixel' ? 'Erases pixels within the eraser area' : 'Deletes entire objects touched by the eraser'}
        </p>
      </div>

      <Separator />

      <div>
        <Label className="text-sm font-medium">
          Size: {toolSettings.eraserSize}px
        </Label>
        <Slider value={[toolSettings.eraserSize]} onValueChange={handleSizeChange} min={5} max={100} step={5} className="mt-2" />
      </div>
    </div>;
};