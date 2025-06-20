
import React from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

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
    <div className="space-y-3">
      <h3 className="font-semibold text-sm">Shape Properties</h3>
      
      {/* Position */}
      <div className="space-y-1">
        <Label className="text-xs">Position</Label>
        <div className="grid grid-cols-2 gap-1">
          <Input
            type="number"
            value={Math.round(obj.x)}
            onChange={(e) => handlePropertyChange('x', parseFloat(e.target.value) || 0)}
            className="h-7 text-xs"
            placeholder="X"
          />
          <Input
            type="number"
            value={Math.round(obj.y)}
            onChange={(e) => handlePropertyChange('y', parseFloat(e.target.value) || 0)}
            className="h-7 text-xs"
            placeholder="Y"
          />
        </div>
      </div>

      {/* Size */}
      {obj.width && obj.height && (
        <div className="space-y-1">
          <Label className="text-xs">Size</Label>
          <div className="grid grid-cols-2 gap-1">
            <Input
              type="number"
              value={Math.round(obj.width)}
              onChange={(e) => handlePropertyChange('width', parseFloat(e.target.value) || 1)}
              className="h-7 text-xs"
              min="1"
              placeholder="W"
            />
            <Input
              type="number"
              value={Math.round(obj.height)}
              onChange={(e) => handlePropertyChange('height', parseFloat(e.target.value) || 1)}
              className="h-7 text-xs"
              min="1"
              placeholder="H"
            />
          </div>
        </div>
      )}

      {/* Fill Color */}
      <div className="space-y-1">
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
          {colors.slice(0, 6).map(color => (
            <button
              key={color}
              className={`w-5 h-5 rounded border ${obj.fill === color ? 'border-primary border-2' : 'border-border'}`}
              style={{ backgroundColor: color }}
              onClick={() => handlePropertyChange('fill', color)}
              title={`Fill: ${color}`}
            />
          ))}
        </div>
      </div>

      {/* Stroke Color */}
      <div className="space-y-1">
        <Label className="text-xs">Stroke</Label>
        <div className="flex flex-wrap gap-1">
          {colors.slice(0, 6).map(color => (
            <button
              key={color}
              className={`w-5 h-5 rounded border ${obj.stroke === color ? 'border-primary border-2' : 'border-border'}`}
              style={{ backgroundColor: color }}
              onClick={() => handlePropertyChange('stroke', color)}
              title={`Stroke: ${color}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
