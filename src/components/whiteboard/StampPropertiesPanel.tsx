import React from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { SliderSetting } from './settings/SliderSetting';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';

interface StampPropertiesPanelProps {
  selectedObjectId: string;
}

export const StampPropertiesPanel: React.FC<StampPropertiesPanelProps> = ({
  selectedObjectId
}) => {
  const { updateObject, objects } = useWhiteboardStore();
  
  const selectedObject = objects[selectedObjectId];
  
  if (!selectedObject || selectedObject.type !== 'image') {
    return null;
  }

  const handlePropertyChange = (property: string, value: any) => {
    updateObject(selectedObjectId, { [property]: value });
  };

  return (
    <div className="space-y-4">
      {/* Size Controls */}
      <div className="space-y-2">
        <Label className="text-xs">Size</Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">Width</Label>
            <Input
              type="number"
              value={Math.round(selectedObject.width || 100)}
              onChange={(e) => handlePropertyChange('width', parseFloat(e.target.value) || 20)}
              className="h-8 text-xs"
              min="20"
              max="300"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Height</Label>
            <Input
              type="number"
              value={Math.round(selectedObject.height || 100)}
              onChange={(e) => handlePropertyChange('height', parseFloat(e.target.value) || 20)}
              className="h-8 text-xs"
              min="20"
              max="300"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Opacity Control */}
      <SliderSetting
        label="Opacity"
        value={Math.round((selectedObject.opacity || 1) * 100)}
        min={10}
        max={100}
        step={5}
        onChange={(value) => handlePropertyChange('opacity', value / 100)}
        valueFormatter={(value) => `${value}%`}
      />
    </div>
  );
};