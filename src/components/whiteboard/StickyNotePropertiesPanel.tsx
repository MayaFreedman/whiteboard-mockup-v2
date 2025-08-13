import React from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useToolStore } from '../../stores/toolStore';
import { useUser } from '../../contexts/UserContext';
import { StickyNoteObject } from '../../types/whiteboard';
import { SliderSetting } from './settings/SliderSetting';
import { SelectSetting } from './settings/SelectSetting';
import { ToggleButtonGroup } from './settings/ToggleButtonGroup';
import { Badge } from '../ui/badge';
import { measureText } from '../../utils/textMeasurement';

interface StickyNotePropertiesPanelProps {
  selectedObjectId: string;
}

const stickyNoteColors = [
  { value: 'yellow', label: 'Yellow', color: '#FEF08A' },
  { value: 'pink', label: 'Pink', color: '#FBCFE8' },
  { value: 'blue', label: 'Blue', color: '#BFDBFE' },
  { value: 'green', label: 'Green', color: '#BBF7D0' }
];

export const StickyNotePropertiesPanel: React.FC<StickyNotePropertiesPanelProps> = ({
  selectedObjectId
}) => {
  const { objects, updateObject } = useWhiteboardStore();
  const { updateToolSettings } = useToolStore();
  const { userId } = useUser();

  const stickyNote = objects[selectedObjectId] as StickyNoteObject | undefined;

  if (!stickyNote || stickyNote.type !== 'sticky-note') {
    return null;
  }

  const stickyNoteData = stickyNote.data;

  /**
   * Updates text bounds when content or styling changes
   */
  const updateTextBounds = (obj: StickyNoteObject, content: string) => {
    const { fontSize, fontFamily, bold, italic, textAlign, fixedWidth, fixedHeight } = obj.data;
    const padding = 16; // 16px padding on all sides
    const availableWidth = fixedWidth ? obj.width - (padding * 2) : undefined;
    
    const metrics = measureText(
      content,
      fontSize,
      fontFamily,
      bold,
      italic,
      availableWidth
    );

    let newWidth = obj.width;
    let newHeight = obj.height;

    if (!fixedWidth) {
      newWidth = Math.max(150, metrics.width + (padding * 2)); // Minimum width 150px
    }
    
    if (!fixedHeight) {
      newHeight = Math.max(100, metrics.height + (padding * 2)); // Minimum height 100px
    }

    if (newWidth !== obj.width || newHeight !== obj.height) {
      updateObject(selectedObjectId, {
        width: newWidth,
        height: newHeight
      }, userId);
    }
  };

  /**
   * Handles changes to sticky note properties
   */
  const handleStickyNotePropertyChange = (updates: Partial<typeof stickyNoteData>) => {
    const newData = { ...stickyNoteData, ...updates };
    
    updateObject(selectedObjectId, {
      data: newData
    }, userId);

    // Update global tool settings for future sticky notes
    if (updates.fontSize !== undefined) {
      updateToolSettings({ fontSize: updates.fontSize });
    }
    if (updates.fontFamily !== undefined) {
      updateToolSettings({ fontFamily: updates.fontFamily });
    }
    if (updates.stickyNoteStyle !== undefined) {
      updateToolSettings({ stickyNoteStyle: updates.stickyNoteStyle });
    }

    // Update text bounds if content-affecting properties changed
    if (updates.fontSize || updates.fontFamily || updates.bold || updates.italic) {
      setTimeout(() => {
        const updatedObj = objects[selectedObjectId] as StickyNoteObject;
        if (updatedObj) {
          updateTextBounds(updatedObj, updatedObj.data.content || '');
        }
      }, 10);
    }
  };

  /**
   * Handles color changes for the sticky note background
   */
  const handleColorChange = (style: string) => {
    const colorConfig = stickyNoteColors.find(c => c.value === style);
    if (colorConfig) {
      handleStickyNotePropertyChange({
        stickyNoteStyle: style as any,
        backgroundColor: colorConfig.color
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Sticky Note Color */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Note Color</label>
        <div className="flex gap-2">
          {stickyNoteColors.map((colorOption) => (
            <button
              key={colorOption.value}
              className={`w-8 h-8 rounded border-2 transition-all ${
                stickyNoteData.stickyNoteStyle === colorOption.value
                  ? 'border-primary scale-110'
                  : 'border-muted hover:border-muted-foreground'
              }`}
              style={{ backgroundColor: colorOption.color }}
              onClick={() => handleColorChange(colorOption.value)}
              title={colorOption.label}
            />
          ))}
        </div>
      </div>

      {/* Font Size */}
      <SliderSetting
        label="Font Size"
        value={stickyNoteData.fontSize}
        min={8}
        max={24}
        step={2}
        onChange={(value) => handleStickyNotePropertyChange({ fontSize: value })}
        valueFormatter={(value) => `${value}px`}
        showValue={true}
      />

      {/* Font Family */}
      <SelectSetting
        label="Font Family"
        value={stickyNoteData.fontFamily}
        options={[
          { value: 'Arial', label: 'Arial' },
          { value: 'Helvetica', label: 'Helvetica' },
          { value: 'Times New Roman', label: 'Times New Roman' },
          { value: 'Courier New', label: 'Courier New' },
          { value: 'Georgia', label: 'Georgia' },
          { value: 'Verdana', label: 'Verdana' }
        ]}
        onChange={(value) => handleStickyNotePropertyChange({ fontFamily: value })}
      />

      {/* Text Formatting */}
      <ToggleButtonGroup
        label="Text Formatting"
        items={[
          { value: 'bold', label: 'Bold', icon: 'Bold' },
          { value: 'italic', label: 'Italic', icon: 'Italic' },
          { value: 'underline', label: 'Underline', icon: 'Underline' }
        ]}
        values={{
          bold: stickyNoteData.bold,
          italic: stickyNoteData.italic,
          underline: stickyNoteData.underline
        }}
        onChange={(key, value) => handleStickyNotePropertyChange({ [key]: value })}
      />

      {/* Text Alignment */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Text Alignment</label>
        <div className="flex gap-2">
          {(['left', 'center', 'right'] as const).map((align) => (
            <button
              key={align}
              className={`px-3 py-2 text-sm rounded border transition-colors ${
                stickyNoteData.textAlign === align
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-foreground border-border hover:bg-muted'
              }`}
              onClick={() => handleStickyNotePropertyChange({ textAlign: align })}
            >
              {align.charAt(0).toUpperCase() + align.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};