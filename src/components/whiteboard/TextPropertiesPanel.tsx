
import React from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useToolStore } from '../../stores/toolStore';
import { useUser } from '../../contexts/UserContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Slider } from '../ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { TextData } from '../../types/whiteboard';
import { measureText } from '../../utils/textMeasurement';

interface TextPropertiesPanelProps {
  selectedObjectId: string;
}

export const TextPropertiesPanel: React.FC<TextPropertiesPanelProps> = ({ selectedObjectId }) => {
  const { objects, updateObject } = useWhiteboardStore();
  const { toolSettings, updateToolSettings } = useToolStore();
  const { userId } = useUser();
  const obj = objects[selectedObjectId];
  
  if (!obj || obj.type !== 'text') return null;

  const textData = obj.data as TextData;

  // Auto-resize text object to fit content
  const updateTextBounds = (textObject: any, updatedData: TextData) => {
    const content = updatedData.content || 'Double-click to edit';
    const metrics = measureText(
      content,
      updatedData.fontSize,
      updatedData.fontFamily,
      updatedData.bold,
      updatedData.italic
    );
    
    // Add padding to the measured dimensions
    const padding = 8;
    const newWidth = Math.max(metrics.width + padding, 100); // Minimum 100px width
    const newHeight = Math.max(metrics.height + padding, updatedData.fontSize + padding);
    
    return { width: newWidth, height: newHeight };
  };

  const handleTextPropertyChange = (property: keyof TextData, value: any) => {
    const updatedData = { ...textData, [property]: value };
    
    // Properties that affect text dimensions and should trigger resize
    const dimensionAffectingProperties = ['content', 'fontSize', 'fontFamily', 'bold', 'italic'];
    const shouldUpdateBounds = dimensionAffectingProperties.includes(property);
    
    if (shouldUpdateBounds) {
      // Calculate new bounds based on updated text properties
      const newBounds = updateTextBounds(obj, updatedData);
      
      updateObject(selectedObjectId, { 
        data: updatedData,
        ...newBounds
      }, userId);
    } else {
      // For properties like textAlign and underline, only update the data
      updateObject(selectedObjectId, { 
        data: updatedData
      }, userId);
    }
    
    // Also update tool settings for future text objects
    if (property === 'fontSize') updateToolSettings({ fontSize: value });
    if (property === 'fontFamily') updateToolSettings({ fontFamily: value });
    if (property === 'bold') updateToolSettings({ textBold: value });
    if (property === 'italic') updateToolSettings({ textItalic: value });
    if (property === 'underline') updateToolSettings({ textUnderline: value });
    if (property === 'textAlign') updateToolSettings({ textAlign: value });
  };

  const handleColorChange = (color: string) => {
    updateObject(selectedObjectId, { stroke: color }, userId);
    updateToolSettings({ strokeColor: color });
  };

  return (
    <div className="space-y-4">
      {/* Text Content */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Text Content</Label>
        <Input
          value={textData.content}
          onChange={(e) => handleTextPropertyChange('content', e.target.value)}
          placeholder="Enter text..."
          className="w-full"
        />
      </div>

      {/* Font Size */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Font Size: {textData.fontSize}px
        </Label>
        <Slider
          value={[textData.fontSize]}
          onValueChange={([value]) => handleTextPropertyChange('fontSize', value)}
          min={8}
          max={72}
          step={1}
          className="w-full"
        />
      </div>

      {/* Font Family */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Font Family</Label>
        <Select 
          value={textData.fontFamily} 
          onValueChange={(value) => handleTextPropertyChange('fontFamily', value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Arial">Arial</SelectItem>
            <SelectItem value="Helvetica">Helvetica</SelectItem>
            <SelectItem value="Times New Roman">Times New Roman</SelectItem>
            <SelectItem value="Courier New">Courier New</SelectItem>
            <SelectItem value="Georgia">Georgia</SelectItem>
            <SelectItem value="Verdana">Verdana</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Text Formatting */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Formatting</Label>
        <div className="flex gap-1">
          <Button
            variant={textData.bold ? "default" : "outline"}
            size="sm"
            onClick={() => handleTextPropertyChange('bold', !textData.bold)}
            className="p-2"
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </Button>
          <Button
            variant={textData.italic ? "default" : "outline"}
            size="sm"
            onClick={() => handleTextPropertyChange('italic', !textData.italic)}
            className="p-2"
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </Button>
          <Button
            variant={textData.underline ? "default" : "outline"}
            size="sm"
            onClick={() => handleTextPropertyChange('underline', !textData.underline)}
            className="p-2"
            title="Underline"
          >
            <Underline className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Text Alignment */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Alignment</Label>
        <div className="flex gap-1">
          <Button
            variant={textData.textAlign === 'left' ? "default" : "outline"}
            size="sm"
            onClick={() => handleTextPropertyChange('textAlign', 'left')}
            className="p-2"
            title="Align Left"
          >
            <AlignLeft className="w-4 h-4" />
          </Button>
          <Button
            variant={textData.textAlign === 'center' ? "default" : "outline"}
            size="sm"
            onClick={() => handleTextPropertyChange('textAlign', 'center')}
            className="p-2"
            title="Align Center"
          >
            <AlignCenter className="w-4 h-4" />
          </Button>
          <Button
            variant={textData.textAlign === 'right' ? "default" : "outline"}
            size="sm"
            onClick={() => handleTextPropertyChange('textAlign', 'right')}
            className="p-2"
            title="Align Right"
          >
            <AlignRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Text Color */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Text Color</Label>
        <div className="flex gap-1 flex-wrap">
          {['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'].map(color => (
            <button
              key={color}
              className={`w-6 h-6 rounded border-2 ${obj.stroke === color ? 'border-primary' : 'border-border'}`}
              style={{ backgroundColor: color }}
              onClick={() => handleColorChange(color)}
              title={`Color: ${color}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
