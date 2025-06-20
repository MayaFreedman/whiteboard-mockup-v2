
import React from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useUser } from '../../contexts/UserContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Slider } from '../ui/slider';
import { Toggle } from '../ui/toggle';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

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
  const fontFamily = textData.fontFamily || 'Arial';
  const bold = textData.bold || false;
  const italic = textData.italic || false;
  const underline = textData.underline || false;
  const alignment = textData.alignment || 'left';

  const updateTextProperty = (property: string, value: any) => {
    updateObject(selectedObjectId, {
      data: {
        ...textData,
        [property]: value
      }
    }, userId);
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
      <h3 className="font-semibold text-sm">Text Properties</h3>
      
      {/* Font Family */}
      <div className="space-y-2">
        <Label className="text-xs">Font Family</Label>
        <Select value={fontFamily} onValueChange={(value) => updateTextProperty('fontFamily', value)}>
          <SelectTrigger className="h-8 text-xs">
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
        <Label className="text-xs">Font Size: {fontSize}px</Label>
        <Slider
          value={[fontSize]}
          onValueChange={(value) => updateTextProperty('fontSize', value[0])}
          min={8}
          max={72}
          step={1}
          className="w-full"
        />
      </div>

      <Separator />

      {/* Text Style Toggles */}
      <div className="space-y-2">
        <Label className="text-xs">Text Style</Label>
        <div className="flex gap-1">
          <Toggle
            pressed={bold}
            onPressedChange={(pressed) => updateTextProperty('bold', pressed)}
            aria-label="Bold"
            size="sm"
          >
            <Bold className="h-3 w-3" />
          </Toggle>
          <Toggle
            pressed={italic}
            onPressedChange={(pressed) => updateTextProperty('italic', pressed)}
            aria-label="Italic"
            size="sm"
          >
            <Italic className="h-3 w-3" />
          </Toggle>
          <Toggle
            pressed={underline}
            onPressedChange={(pressed) => updateTextProperty('underline', pressed)}
            aria-label="Underline"
            size="sm"
          >
            <Underline className="h-3 w-3" />
          </Toggle>
        </div>
      </div>

      {/* Text Alignment */}
      <div className="space-y-2">
        <Label className="text-xs">Alignment</Label>
        <div className="flex gap-1">
          <Toggle
            pressed={alignment === 'left'}
            onPressedChange={() => updateTextProperty('alignment', 'left')}
            aria-label="Align Left"
            size="sm"
          >
            <AlignLeft className="h-3 w-3" />
          </Toggle>
          <Toggle
            pressed={alignment === 'center'}
            onPressedChange={() => updateTextProperty('alignment', 'center')}
            aria-label="Align Center"
            size="sm"
          >
            <AlignCenter className="h-3 w-3" />
          </Toggle>
          <Toggle
            pressed={alignment === 'right'}
            onPressedChange={() => updateTextProperty('alignment', 'right')}
            aria-label="Align Right"
            size="sm"
          >
            <AlignRight className="h-3 w-3" />
          </Toggle>
        </div>
      </div>

      <Separator />

      {/* Text Color */}
      <div className="space-y-2">
        <Label className="text-xs">Text Color</Label>
        <input
          type="color"
          value={selectedObject.stroke || '#000000'}
          onChange={(e) => {
            updateObject(selectedObjectId, { stroke: e.target.value }, userId);
          }}
          className="w-full h-8 rounded border cursor-pointer"
        />
      </div>
    </div>
  );
};
