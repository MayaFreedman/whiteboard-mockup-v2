
import React from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useToolStore } from '../../stores/toolStore';
import { useUser } from '../../contexts/UserContext';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Slider } from '../ui/slider';
import { Toggle } from '../ui/toggle';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

interface TextPropertiesPanelProps {
  selectedObjectIds: string[];
}

export const TextPropertiesPanel: React.FC<TextPropertiesPanelProps> = ({ selectedObjectIds }) => {
  const { objects, updateObject } = useWhiteboardStore();
  const { toolSettings, updateToolSettings } = useToolStore();
  const { userId } = useUser();

  // Get the first selected text object
  const selectedObject = selectedObjectIds.length > 0 ? objects[selectedObjectIds[0]] : null;
  
  if (!selectedObject || selectedObject.type !== 'text') {
    return null;
  }

  const textData = selectedObject.data || {};
  const fontSize = textData.fontSize || 16;
  const fontFamily = textData.fontFamily || 'Arial';
  const bold = textData.bold || false;
  const italic = textData.italic || false;
  const underline = textData.underline || false;
  const alignment = textData.alignment || 'left';

  const updateTextProperty = (property: string, value: any) => {
    selectedObjectIds.forEach(id => {
      const obj = objects[id];
      if (obj && obj.type === 'text') {
        updateObject(id, {
          data: {
            ...obj.data,
            [property]: value
          }
        }, userId);
      }
    });
  };

  const fontFamilies = [
    'Arial',
    'Times New Roman',
    'Helvetica',
    'Georgia',
    'Verdana',
    'Courier New',
    'Impact',
    'Comic Sans MS'
  ];

  return (
    <div className="space-y-4 p-4">
      <h3 className="text-lg font-semibold">Text Properties</h3>
      
      {/* Font Family */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Font Family</label>
        <Select value={fontFamily} onValueChange={(value) => updateTextProperty('fontFamily', value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {fontFamilies.map((font) => (
              <SelectItem key={font} value={font}>
                <span style={{ fontFamily: font }}>{font}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Font Size */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Font Size: {fontSize}px</label>
        <Slider
          value={[fontSize]}
          onValueChange={(value) => updateTextProperty('fontSize', value[0])}
          min={8}
          max={72}
          step={1}
          className="w-full"
        />
      </div>

      {/* Text Style Toggles */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Text Style</label>
        <div className="flex gap-2">
          <Toggle
            pressed={bold}
            onPressedChange={(pressed) => updateTextProperty('bold', pressed)}
            aria-label="Bold"
          >
            <Bold className="h-4 w-4" />
          </Toggle>
          <Toggle
            pressed={italic}
            onPressedChange={(pressed) => updateTextProperty('italic', pressed)}
            aria-label="Italic"
          >
            <Italic className="h-4 w-4" />
          </Toggle>
          <Toggle
            pressed={underline}
            onPressedChange={(pressed) => updateTextProperty('underline', pressed)}
            aria-label="Underline"
          >
            <Underline className="h-4 w-4" />
          </Toggle>
        </div>
      </div>

      {/* Text Alignment */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Alignment</label>
        <div className="flex gap-2">
          <Toggle
            pressed={alignment === 'left'}
            onPressedChange={() => updateTextProperty('alignment', 'left')}
            aria-label="Align Left"
          >
            <AlignLeft className="h-4 w-4" />
          </Toggle>
          <Toggle
            pressed={alignment === 'center'}
            onPressedChange={() => updateTextProperty('alignment', 'center')}
            aria-label="Align Center"
          >
            <AlignCenter className="h-4 w-4" />
          </Toggle>
          <Toggle
            pressed={alignment === 'right'}
            onPressedChange={() => updateTextProperty('alignment', 'right')}
            aria-label="Align Right"
          >
            <AlignRight className="h-4 w-4" />
          </Toggle>
        </div>
      </div>

      {/* Text Color */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Text Color</label>
        <input
          type="color"
          value={selectedObject.stroke || '#000000'}
          onChange={(e) => {
            selectedObjectIds.forEach(id => {
              updateObject(id, { stroke: e.target.value }, userId);
            });
          }}
          className="w-full h-10 rounded border"
        />
      </div>
    </div>
  );
};
