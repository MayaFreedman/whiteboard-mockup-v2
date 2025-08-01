
import React from 'react';
import { useToolStore } from '../../stores/toolStore';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { Trash2 } from 'lucide-react';

/**
 * Eraser settings component for the sidebar
 * Allows users to configure eraser mode and size
 */
export const EraserSettings: React.FC = () => {
  const { toolSettings, updateToolSettings } = useToolStore();
  const { clearCanvas } = useWhiteboardStore();

  const handleModeChange = (mode: 'pixel' | 'object') => {
    updateToolSettings({ eraserMode: mode });
  };

  const handleSizeChange = (value: number[]) => {
    updateToolSettings({ eraserSize: value[0] });
  };

  const handleClearCanvas = () => {
    clearCanvas();
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

      <Separator />

      <div>
        <Label className="text-sm font-medium">Clear Canvas</Label>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearCanvas}
          className="w-full mt-2 flex items-center gap-2 text-white hover:text-white"
          style={{ backgroundColor: '#7b5d6d' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#9d7a8a'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#7b5d6d'}
          title="Clear entire canvas"
        >
          <Trash2 className="w-4 h-4" />
          Clear Canvas
        </Button>
        <p className="text-xs text-muted-foreground mt-1">
          Permanently removes all objects from the canvas
        </p>
      </div>
    </div>
  );
};
