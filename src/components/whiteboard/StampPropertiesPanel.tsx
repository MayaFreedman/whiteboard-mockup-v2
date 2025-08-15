import React from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useActionBatching } from '../../hooks/useActionBatching';
import { useUser } from '../../contexts/UserContext';
import { SliderSetting } from './settings/SliderSetting';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';

interface StampPropertiesPanelProps {
  selectedObjectId: string;
}

export const StampPropertiesPanel: React.FC<StampPropertiesPanelProps> = ({
  selectedObjectId
}) => {
  const { updateObject, objects } = useWhiteboardStore();
  const { startBatch, endBatch } = useActionBatching({ batchTimeout: 500, maxBatchSize: 200 });
  const { userId } = useUser();
  const sizeBatchActiveRef = React.useRef(false);
  
  const selectedObject = objects[selectedObjectId];
  
  if (!selectedObject || selectedObject.type !== 'image') {
    return null;
  }

  const handlePropertyChange = (property: string, value: any) => {
    // Enforce 800px limit for stamps
    if ((property === 'width' || property === 'height') && value > 800) {
      value = 800;
    }
    updateObject(selectedObjectId, { [property]: value }, userId);
  };

  return (
    <div className="space-y-4">
      {/* Size Controls */}
      <div className="space-y-2">
        <Label className="text-xs">Size</Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">Width</Label>
            <Input
              type="number"
              value={Math.round(selectedObject.width || 100)}
              onFocus={() => { if (!sizeBatchActiveRef.current) { startBatch('UPDATE_OBJECT', selectedObjectId, userId); sizeBatchActiveRef.current = true; } }}
              onBlur={() => { if (sizeBatchActiveRef.current) { endBatch(); sizeBatchActiveRef.current = false; } }}
              onChange={(e) => handlePropertyChange('width', parseFloat(e.target.value) || 20)}
              className="h-8 text-xs"
              min="20"
              max="800"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Height</Label>
            <Input
              type="number"
              value={Math.round(selectedObject.height || 100)}
              onFocus={() => { if (!sizeBatchActiveRef.current) { startBatch('UPDATE_OBJECT', selectedObjectId, userId); sizeBatchActiveRef.current = true; } }}
              onBlur={() => { if (sizeBatchActiveRef.current) { endBatch(); sizeBatchActiveRef.current = false; } }}
              onChange={(e) => handlePropertyChange('height', parseFloat(e.target.value) || 20)}
              className="h-8 text-xs"
              min="20"
              max="800"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Opacity Control */}
      <SliderSetting
        label="Opacity"
        value={Math.round((selectedObject.opacity || 1) * 100)}
        min={10}
        max={100}
        step={5}
        onChangeStart={() => startBatch('UPDATE_OBJECT', selectedObjectId, userId)}
        onChange={(value) => handlePropertyChange('opacity', value / 100)}
        onCommit={() => endBatch()}
        valueFormatter={(value) => `${value}%`}
      />
    </div>
  );
};