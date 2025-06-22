
import React from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useToolStore } from '../../stores/toolStore';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Slider } from '../ui/slider';
import { Separator } from '../ui/separator';
import { Toggle } from '../ui/toggle';

interface ShapePropertiesPanelProps {
  selectedObjectId: string;
}

export const ShapePropertiesPanel: React.FC<ShapePropertiesPanelProps> = ({ selectedObjectId }) => {
  const { objects, updateObject } = useWhiteboardStore();
  const { getActiveColors, toolSettings, updateToolSettings } = useToolStore();
  
  const obj = objects[selectedObjectId];
  const activeColors = getActiveColors();
  const colorMode = toolSettings.shapeColorMode;
  
  if (!obj) return null;

  const handlePropertyChange = (property: string, value: any) => {
    updateObject(selectedObjectId, { [property]: value });
  };

  const handleColorSelect = (color: string) => {
    if (colorMode === 'fill') {
      handlePropertyChange('fill', color);
    } else {
      handlePropertyChange('stroke', color);
    }
  };

  const setColorMode = (mode: 'fill' | 'stroke') => {
    updateToolSettings({ shapeColorMode: mode });
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4 min-w-64">
      {/* Size */}
      {obj.width && obj.height && (
        <div className="space-y-2">
          <Label className="text-xs">Size</Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Width</Label>
              <Input
                type="number"
                value={Math.round(obj.width)}
                onChange={(e) => handlePropertyChange('width', parseFloat(e.target.value) || 1)}
                className="h-8 text-xs"
                min="1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Height</Label>
              <Input
                type="number"
                value={Math.round(obj.height)}
                onChange={(e) => handlePropertyChange('height', parseFloat(e.target.value) || 1)}
                className="h-8 text-xs"
                min="1"
              />
            </div>
          </div>
        </div>
      )}

      <Separator />

      {/* Fill/Stroke Color Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Color</Label>
          <div className="flex gap-1">
            <Toggle
              pressed={colorMode === 'fill'}
              onPressedChange={(pressed) => pressed && setColorMode('fill')}
              size="sm"
              className="text-xs"
            >
              Fill
            </Toggle>
            <Toggle
              pressed={colorMode === 'stroke'}
              onPressedChange={(pressed) => pressed && setColorMode('stroke')}
              size="sm"
              className="text-xs"
            >
              Stroke
            </Toggle>
          </div>
        </div>

        {/* Color Preview */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Current {colorMode}:</span>
          <div 
            className="w-4 h-4 rounded border"
            style={{ 
              backgroundColor: colorMode === 'fill' 
                ? (obj.fill === 'none' ? 'transparent' : obj.fill) 
                : (obj.stroke === 'none' ? 'transparent' : obj.stroke)
            }}
          />
          <span>
            {colorMode === 'fill' 
              ? (obj.fill === 'none' ? 'None' : obj.fill)
              : (obj.stroke === 'none' ? 'None' : obj.stroke)
            }
          </span>
        </div>

        {/* None option for fill */}
        {colorMode === 'fill' && (
          <Button
            variant={obj.fill === 'none' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handlePropertyChange('fill', 'none')}
            className="h-6 px-2 text-xs w-full"
          >
            No Fill
          </Button>
        )}

        {/* None option for stroke */}
        {colorMode === 'stroke' && (
          <Button
            variant={obj.stroke === 'none' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handlePropertyChange('stroke', 'none')}
            className="h-6 px-2 text-xs w-full"
          >
            No Stroke
          </Button>
        )}

        {/* Active Color Palette */}
        <div className="flex flex-wrap gap-1">
          {activeColors.map((color, index) => (
            <button
              key={index}
              className={`w-6 h-6 rounded border-2 transition-all ${
                (colorMode === 'fill' ? obj.fill : obj.stroke) === color 
                  ? 'border-primary ring-2 ring-primary/30' 
                  : 'border-border hover:border-primary'
              }`}
              style={{ backgroundColor: color }}
              onClick={() => handleColorSelect(color)}
              title={`${colorMode === 'fill' ? 'Fill' : 'Stroke'}: ${color}`}
            />
          ))}
        </div>
      </div>

      {/* Stroke Width */}
      <div className="space-y-2">
        <Label className="text-xs">Stroke Width: {obj.strokeWidth || 2}px</Label>
        <Slider
          value={[obj.strokeWidth || 2]}
          onValueChange={([value]) => handlePropertyChange('strokeWidth', value)}
          min={1}
          max={20}
          step={1}
          className="w-full"
        />
      </div>

      {/* Opacity */}
      <div className="space-y-2">
        <Label className="text-xs">Opacity: {Math.round((obj.opacity || 1) * 100)}%</Label>
        <Slider
          value={[Math.round((obj.opacity || 1) * 100)]}
          onValueChange={([value]) => handlePropertyChange('opacity', value / 100)}
          min={10}
          max={100}
          step={5}
          className="w-full"
        />
      </div>
    </div>
  );
};
