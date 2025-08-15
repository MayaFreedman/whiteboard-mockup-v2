import React from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useToolStore } from '../../stores/toolStore';
import { useUser } from '../../contexts/UserContext';
import { StickyNoteObject } from '../../types/whiteboard';
import { SliderSetting } from './settings/SliderSetting';
import { BadgeSelector } from './settings/BadgeSelector';
import { SelectSetting } from './settings/SelectSetting';
import { ToggleButtonGroup } from './settings/ToggleButtonGroup';
import { SimpleTooltip } from '../ui/simple-tooltip';
import { Label } from '../ui/label';
import { calculateOptimalFontSize } from '../../utils/stickyNoteTextSizing';
interface StickyNotePropertiesPanelProps {
  selectedObjectId: string;
}
export const StickyNotePropertiesPanel: React.FC<StickyNotePropertiesPanelProps> = ({
  selectedObjectId
}) => {
  const {
    objects,
    updateObject
  } = useWhiteboardStore();
  const {
    updateToolSettings,
    getActiveColors
  } = useToolStore();
  const {
    userId
  } = useUser();
  
  const stickyNote = objects[selectedObjectId] as StickyNoteObject;
  
  if (!stickyNote || stickyNote.type !== 'sticky-note') {
    return null;
  }
  
  const stickyNoteData = stickyNote.data;
  const availableColors = getActiveColors().filter(c => c !== 'rainbow-gradient');
  const updateStickyNoteProperty = (property: string, value: any) => {
    const newData = {
      ...stickyNoteData,
      [property]: value
    };

    // Recalculate font size if content-affecting properties changed
    if (['fontFamily', 'bold', 'italic'].includes(property)) {
      newData.fontSize = calculateOptimalFontSize(newData.content, stickyNote.width, stickyNote.height, newData);
    }
    updateObject(selectedObjectId, {
      data: newData,
      updatedAt: Date.now()
    }, userId);

    // Update global tool settings for future sticky notes
    updateToolSettings({
      fontFamily: newData.fontFamily,
      textBold: newData.bold,
      textItalic: newData.italic,
      textUnderline: newData.underline,
      textAlign: newData.textAlign
    });
  };
  const updateStickyNoteSize = (newSize: number) => {
    // Enforce 600px limit
    if (newSize > 600) {
      newSize = 600;
    }
    
    // Update dimensions
    updateObject(selectedObjectId, {
      width: newSize,
      height: newSize,
      updatedAt: Date.now()
    }, userId);

    // Recalculate font size for new dimensions
    const newFontSize = calculateOptimalFontSize(stickyNoteData.content, newSize, newSize, stickyNoteData);
    updateObject(selectedObjectId, {
      data: {
        ...stickyNoteData,
        fontSize: newFontSize,
        stickySize: newSize
      },
      updatedAt: Date.now()
    }, userId);

    // Update global tool settings
    updateToolSettings({
      stickyNoteSize: newSize
    });
  };
  const updateStickyNoteBackgroundColor = (newColor: string) => {
    updateObject(selectedObjectId, {
      data: {
        ...stickyNoteData,
        backgroundColor: newColor
      },
      updatedAt: Date.now()
    }, userId);

    // Don't update global tool settings - keep sidebar and topbar colors separate
  };

  const updateStickyNoteTextColor = (newColor: string) => {
    updateObject(selectedObjectId, {
      stroke: newColor,
      updatedAt: Date.now()
    }, userId);
    // Don't update global tool settings - keep sidebar and topbar colors separate
  };
  return <div className="space-y-4">
      {/* Size Control */}
      <SliderSetting label="Size" value={stickyNoteData.stickySize || stickyNote.width} min={120} max={600} step={10} onChange={updateStickyNoteSize} valueFormatter={value => `${value}px`} showValue={true} />

      {/* Background Color */}
      <BadgeSelector label="Background Color" items={[{
      value: '#fef3c7',
      label: 'Yellow'
    }, {
      value: '#fce7f3',
      label: 'Pink'
    }, {
      value: '#dbeafe',
      label: 'Blue'
    }, {
      value: '#d1fae5',
      label: 'Green'
    }]} selectedValue={stickyNoteData.backgroundColor} onChange={updateStickyNoteBackgroundColor} />

      {/* Font Family */}
      <SelectSetting label="Font Family" value={stickyNoteData.fontFamily} options={[{
      value: 'Arial',
      label: 'Arial'
    }, {
      value: 'Helvetica',
      label: 'Helvetica'
    }, {
      value: 'Times New Roman',
      label: 'Times New Roman'
    }, {
      value: 'Courier New',
      label: 'Courier New'
    }, {
      value: 'Georgia',
      label: 'Georgia'
    }, {
      value: 'Verdana',
      label: 'Verdana'
    }]} onChange={value => updateStickyNoteProperty('fontFamily', value)} />

      {/* Text Formatting */}
      <ToggleButtonGroup label="Text Formatting" items={[{
      value: 'textBold',
      label: 'Bold',
      icon: 'Bold'
    }, {
      value: 'textItalic',
      label: 'Italic',
      icon: 'Italic'
    }, {
      value: 'textUnderline',
      label: 'Underline',
      icon: 'Underline'
    }]} values={{
      textBold: stickyNoteData.bold,
      textItalic: stickyNoteData.italic,
      textUnderline: stickyNoteData.underline
    }} onChange={(key, value) => {
      const property = key.replace('text', '').toLowerCase();
      updateStickyNoteProperty(property, value);
    }} />


      {/* Font Size (Read-only display) */}
      
      {/* Text Color */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Text Color</Label>
        <div className="flex gap-1 flex-wrap">
          {availableColors.map(color => (
            <SimpleTooltip key={color} content={`Color: ${color}`}>
              <button
                className={`w-6 h-6 rounded border-2 ${stickyNote.stroke === color ? 'border-primary' : 'border-border'}`}
                style={{ backgroundColor: color }}
                onClick={() => updateStickyNoteTextColor(color)}
              />
            </SimpleTooltip>
          ))}
        </div>
      </div>
    </div>;
};