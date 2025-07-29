import React from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { SliderSetting } from './settings/SliderSetting';
import { Badge } from '../ui/badge';

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

  // Color filter options
  const colorFilters = [
    { name: 'Original', value: 'none', filter: 'none' },
    { name: 'Red', value: 'red', filter: 'hue-rotate(0deg) saturate(2)' },
    { name: 'Blue', value: 'blue', filter: 'hue-rotate(240deg) saturate(1.5)' },
    { name: 'Green', value: 'green', filter: 'hue-rotate(120deg) saturate(1.5)' },
    { name: 'Yellow', value: 'yellow', filter: 'hue-rotate(60deg) saturate(1.5)' },
    { name: 'Purple', value: 'purple', filter: 'hue-rotate(270deg) saturate(1.5)' },
    { name: 'Orange', value: 'orange', filter: 'hue-rotate(30deg) saturate(1.5)' },
    { name: 'Sepia', value: 'sepia', filter: 'sepia(1)' },
    { name: 'Grayscale', value: 'grayscale', filter: 'grayscale(1)' }
  ];

  const currentColorFilter = selectedObject.colorFilter || 'none';

  return (
    <div className="space-y-4">
      {/* Size Controls */}
      <div className="space-y-3">
        <SliderSetting
          label="Width"
          value={selectedObject.width || 100}
          min={20}
          max={300}
          step={5}
          onChange={(value) => handlePropertyChange('width', value)}
          valueFormatter={(value) => `${value}px`}
        />
        
        <SliderSetting
          label="Height"
          value={selectedObject.height || 100}
          min={20}
          max={300}
          step={5}
          onChange={(value) => handlePropertyChange('height', value)}
          valueFormatter={(value) => `${value}px`}
        />
      </div>

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