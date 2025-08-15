import React from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useToolStore } from '../../stores/toolStore';
import { useUser } from '../../contexts/UserContext';
import { StickyNoteObject } from '../../types/whiteboard';
import { SliderSetting } from './settings/SliderSetting';
import { BadgeSelector } from './settings/BadgeSelector';
import { SelectSetting } from './settings/SelectSetting';
import { ToggleButtonGroup } from './settings/ToggleButtonGroup';
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
    updateToolSettings
  } = useToolStore();
  const {
    userId
  } = useUser();
  const stickyNote = objects[selectedObjectId] as StickyNoteObject;
  if (!stickyNote || stickyNote.type !== 'sticky-note') {
    return null;
  }
  const stickyNoteData = stickyNote.data;
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
    // Enforce 800px limit
    if (newSize > 800) {
      newSize = 800;
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

    // Update global tool settings
    updateToolSettings({
      stickyNoteBackgroundColor: newColor
    });
  };
  return <div className="space-y-4">
      {/* Size Control */}
      <SliderSetting label="Size" value={stickyNoteData.stickySize || stickyNote.width} min={120} max={800} step={10} onChange={updateStickyNoteSize} valueFormatter={value => `${value}px`} showValue={true} />

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
      
    </div>;
};