
import React from 'react';
import { useToolStore } from '../../stores/toolStore';
import { Label } from '../ui/label';
import { Slider } from '../ui/slider';

/**
 * Shape-specific settings component
 * Provides border weight controls for shape tools
 */
export const ShapeSettings: React.FC = () => {
  const { toolSettings, updateToolSettings, activeTool } = useToolStore();
  
  // Check if current tool is a shape tool
  const isShapeTool = [
    'rectangle', 'circle', 'triangle', 'hexagon', 
    'star', 'pentagon', 'diamond'
  ].includes(activeTool);
  
  if (!isShapeTool) {
    return null;
  }

  const borderWeight = toolSettings.shapeBorderWeight || 2;

  const handleBorderWeightChange = (value: number[]) => {
    updateToolSettings({ shapeBorderWeight: value[0] });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="border-weight" className="text-sm font-medium">
          Border Weight: {borderWeight}px
        </Label>
        <Slider
          id="border-weight"
          min={1}
          max={20}
          step={1}
          value={[borderWeight]}
          onValueChange={handleBorderWeightChange}
          className="w-full"
        />
      </div>
    </div>
  );
};
