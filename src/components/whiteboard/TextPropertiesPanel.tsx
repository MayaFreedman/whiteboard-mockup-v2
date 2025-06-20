
import React from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useUser } from '../../contexts/UserContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Bold, Italic, Underline } from 'lucide-react';

interface TextPropertiesPanelProps {
  selectedObjectId: string;
}

export const TextPropertiesPanel: React.FC<TextPropertiesPanelProps> = ({ selectedObjectId }) => {
  const { objects, updateObject } = useWhiteboardStore();
  const { userId } = useUser();

  const selectedObject = objects[selectedObjectId];
  
  if (!selectedObject || selectedObject.type !== 'text') {
    return null;
  }

  const textData = selectedObject.data || {};
  const fontSize = textData.fontSize || 16;
  const bold = textData.bold || false;
  const italic = textData.italic || false;
  const underline = textData.underline || false;

  const updateTextProperty = (property: string, value: any) => {
    updateObject(selectedObjectId, {
      data: {
        ...textData,
        [property]: value
      }
    }, userId);
  };

  const colors = [
    '#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', 
    '#ff00ff', '#00ffff', '#ffffff', '#808080', '#ffa500'
  ];

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm">Text Properties</h3>
      
      {/* Font Size */}
      <div className="space-y-1">
        <Label className="text-xs">Size</Label>
        <Input
          type="number"
          value={fontSize}
          onChange={(e) => updateTextProperty('fontSize', parseInt(e.target.value) || 16)}
          className="h-8 text-xs"
          min="8"
          max="72"
        />
      </div>

      {/* Text Style */}
      <div className="space-y-1">
        <Label className="text-xs">Style</Label>
        <div className="flex gap-1">
          <Button
            variant={bold ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateTextProperty('bold', !bold)}
            className="h-7 w-7 p-0"
          >
            <Bold className="h-3 w-3" />
          </Button>
          <Button
            variant={italic ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateTextProperty('italic', !italic)}
            className="h-7 w-7 p-0"
          >
            <Italic className="h-3 w-3" />
          </Button>
          <Button
            variant={underline ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateTextProperty('underline', !underline)}
            className="h-7 w-7 p-0"
          >
            <Underline className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Text Color */}
      <div className="space-y-1">
        <Label className="text-xs">Color</Label>
        <div className="flex flex-wrap gap-1">
          {colors.map(color => (
            <button
              key={color}
              className={`w-5 h-5 rounded border ${selectedObject.stroke === color ? 'border-primary border-2' : 'border-border'}`}
              style={{ backgroundColor: color }}
              onClick={() => {
                updateObject(selectedObjectId, { stroke: color }, userId);
              }}
              title={`Color: ${color}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
