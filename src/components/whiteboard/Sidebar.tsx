import React from 'react';
import { useToolStore } from '../../stores/toolStore';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

/**
 * Sidebar component for adjusting whiteboard settings
 */
export const WhiteboardSidebar: React.FC = () => {
  const { toolSettings, updateToolSettings } = useToolStore();

  return (
    <div className="w-64 p-4 bg-secondary border-r border-border h-full">
      <h2 className="text-lg font-semibold mb-4">Settings</h2>

      <div className="space-y-4">
        <div>
          <Label htmlFor="strokeWidth" className="text-sm font-medium">Stroke Width</Label>
          <Input
            type="number"
            id="strokeWidth"
            value={toolSettings.strokeWidth}
            onChange={(e) => updateToolSettings({ strokeWidth: parseInt(e.target.value) })}
            className="w-full"
          />
        </div>

        <div>
          <Label htmlFor="opacity" className="text-sm font-medium">Opacity</Label>
          <Input
            type="number"
            id="opacity"
            value={toolSettings.opacity}
            onChange={(e) => updateToolSettings({ opacity: parseFloat(e.target.value) })}
            className="w-full"
            min="0"
            max="1"
            step="0.05"
          />
        </div>

        
              <div className="space-y-2">
                <Label className="text-sm font-medium">Brush Type</Label>
                <Select
                  value={toolSettings.brushType}
                  onValueChange={(value) => updateToolSettings({ brushType: value as any })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paintbrush">Brush</SelectItem>
                    <SelectItem value="chalk">Chalk</SelectItem>
                    <SelectItem value="spray">Spray</SelectItem>
                    <SelectItem value="crayon">Crayon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
        
      </div>
    </div>
  );
};
