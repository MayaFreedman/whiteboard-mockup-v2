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

  // Color filter options with grayscale-first approach for consistent colors
  const colorFilters = [
    { name: 'Original', value: 'none', filter: 'none' },
    { name: 'Red', value: 'red', filter: 'grayscale(1) sepia(1) hue-rotate(0deg) saturate(2) brightness(0.9)' },
    { name: 'Blue', value: 'blue', filter: 'grayscale(1) sepia(1) hue-rotate(200deg) saturate(2) brightness(0.8)' },
    { name: 'Green', value: 'green', filter: 'grayscale(1) sepia(1) hue-rotate(90deg) saturate(2) brightness(0.8)' },
    { name: 'Yellow', value: 'yellow', filter: 'grayscale(1) sepia(1) hue-rotate(40deg) saturate(2) brightness(1.1)' },
    { name: 'Purple', value: 'purple', filter: 'grayscale(1) sepia(1) hue-rotate(270deg) saturate(2) brightness(0.8)' },
    { name: 'Orange', value: 'orange', filter: 'grayscale(1) sepia(1) hue-rotate(20deg) saturate(2) brightness(1)' },
    { name: 'Sepia', value: 'sepia', filter: 'sepia(1)' },
    { name: 'Grayscale', value: 'grayscale', filter: 'grayscale(1)' }
  ];

  const currentColorFilter = selectedObject.colorFilter || 'none';

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
        value={(selectedObject.opacity || 1) * 100}
        min={10}
        max={100}
        step={5}
        onChange={(value) => handlePropertyChange('opacity', value / 100)}
        valueFormatter={(value) => `${value}%`}
      />

      {/* Color Filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Color Filter</label>
        <div className="grid grid-cols-3 gap-2">
          {colorFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => handlePropertyChange('colorFilter', filter.value)}
              className={`p-2 rounded-md border text-xs transition-colors ${
                currentColorFilter === filter.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border hover:bg-muted'
              }`}
            >
              {filter.name}
            </button>
          ))}
        </div>
      </div>

      {/* Preview with current filter */}
      {selectedObject.data?.src && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Preview</label>
          <div className="flex justify-center p-2 bg-muted rounded-md">
            <img
              src={selectedObject.data.src}
              alt="Stamp preview"
              className="w-16 h-16 object-contain"
              style={{
                filter: colorFilters.find(f => f.value === currentColorFilter)?.filter || 'none'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};