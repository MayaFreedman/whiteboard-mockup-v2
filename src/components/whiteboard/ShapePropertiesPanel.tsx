
import React from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Slider } from '../ui/slider';
import { Separator } from '../ui/separator';

interface ShapePropertiesPanelProps {
  selectedObjectId: string;
}

export const ShapePropertiesPanel: React.FC<ShapePropertiesPanelProps> = ({ selectedObjectId }) => {
  const { objects, updateObject } = useWhiteboardStore();
  const obj = objects[selectedObjectId];
  
  if (!obj) return null;

  const handlePropertyChange = (property: string, value: any) => {
    updateObject(selectedObjectId, { [property]: value });
  };

  const colors = [
    '#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', 
    '#ff00ff', '#00ffff', '#ffffff', '#808080', '#ffa500'
  ];

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4 min-w-64">
      <h3 className="font-semibold text-sm">Shape Properties</h3>
      
      {/* Position */}
      <div className="space-y-2">
        <Label className="text-xs">Position</Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">X</Label>
            <Input
              type="number"
              value={Math.round(obj.x)}
              onChange={(e) => handlePropertyChange('x', parseFloat(e.target.value) || 0)}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Y</Label>
            <Input
              type="number"
              value={Math.round(obj.y)}
              onChange={(e) => handlePropertyChange('y', parseFloat(e.target.value) || 0)}
              className="h-8 text-xs"
            />
          </div>
        </div>
      </div>

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

      {/* Fill Color */}
      <div className="space-y-2">
        <Label className="text-xs">Fill</Label>
        <div className="flex flex-wrap gap-1">
          <Button
            variant={obj.fill === 'none' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handlePropertyChange('fill', 'none')}
            className="h-6 px-2 text-xs"
          >
            None
          </Button>
          {colors.map(color => (
            <button
              key={color}
              className={`w-6 h-6 rounded border-2 ${obj.fill === color ? 'border-primary' : 'border-border'}`}
              style={{ backgroundColor: color }}
              onClick={() => handlePropertyChange('fill', color)}
              title={`Fill: ${color}`}
            />
          ))}
        </div>
      </div>

      {/* Stroke Color */}
      <div className="space-y-2">
        <Label className="text-xs">Stroke</Label>
        <div className="flex flex-wrap gap-1">
          {colors.map(color => (
            <button
              key={color}
              className={`w-6 h-6 rounded border-2 ${obj.stroke === color ? 'border-primary' : 'border-border'}`}
              style={{ backgroundColor: color }}
              onClick={() => handlePropertyChange('stroke', color)}
              title={`Stroke: ${color}`}
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
