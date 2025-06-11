
import React from 'react';
import { useToolStore } from '../../stores/toolStore';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { Slider } from '../ui/slider';
import { 
  Pencil, 
  Square, 
  Circle, 
  Type, 
  MousePointer, 
  Eraser,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

export const Toolbar: React.FC = () => {
  const { activeTool, setActiveTool, toolSettings, updateToolSettings } = useToolStore();

  const tools = [
    { id: 'select', icon: MousePointer, label: 'Select' },
    { id: 'pencil', icon: Pencil, label: 'Pencil' },
    { id: 'rectangle', icon: Square, label: 'Rectangle' },
    { id: 'circle', icon: Circle, label: 'Circle' },
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'eraser', icon: Eraser, label: 'Eraser' },
  ];

  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', 
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500',
    '#800080', '#008000', '#800000', '#000080'
  ];

  return (
    <div className="h-16 bg-card border-b border-border flex items-center px-4 gap-4">
      {/* Tool Selection */}
      <div className="flex items-center gap-2">
        {tools.map((tool) => (
          <Button
            key={tool.id}
            variant={activeTool === tool.id ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTool(tool.id as any)}
            className="p-2"
          >
            <tool.icon className="w-4 h-4" />
          </Button>
        ))}
      </div>

      <Separator orientation="vertical" className="h-8" />

      {/* Color Palette */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Color:</span>
        <div className="flex gap-1">
          {colors.map((color) => (
            <button
              key={color}
              className={`w-6 h-6 rounded border-2 ${
                toolSettings.strokeColor === color 
                  ? 'border-primary' 
                  : 'border-border'
              }`}
              style={{ backgroundColor: color }}
              onClick={() => updateToolSettings({ strokeColor: color })}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 ml-2">
          <span className="text-xs">Current:</span>
          <div 
            className="w-6 h-6 rounded border"
            style={{ backgroundColor: toolSettings.strokeColor }}
          />
        </div>
      </div>

      <Separator orientation="vertical" className="h-8" />

      {/* Stroke Width */}
      <div className="flex items-center gap-2 min-w-32">
        <span className="text-sm font-medium">Width:</span>
        <Slider
          value={[toolSettings.strokeWidth]}
          onValueChange={(value) => updateToolSettings({ strokeWidth: value[0] })}
          min={1}
          max={20}
          step={1}
          className="flex-1"
        />
        <Badge variant="outline" className="min-w-8 text-center">
          {toolSettings.strokeWidth}
        </Badge>
      </div>

      <Separator orientation="vertical" className="h-8" />

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm">
          <Undo className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm">
          <Redo className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm">
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm">
          <ZoomIn className="w-4 h-4" />
        </Button>
      </div>

      {/* Active Tool Indicator */}
      <div className="ml-auto flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Active:</span>
        <Badge variant="default" className="capitalize">
          {activeTool}
        </Badge>
      </div>
    </div>
  );
};
