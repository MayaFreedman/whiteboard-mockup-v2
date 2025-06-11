
import React, { useRef, useEffect } from 'react';
import { useToolStore } from '../../stores/toolStore';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { Slider } from '../ui/slider';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { 
  Pencil, 
  Brush,
  Square, 
  Circle, 
  Type, 
  MousePointer, 
  Eraser,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  PaintBucket,
  Triangle,
  Hexagon,
  Star,
  Pentagon,
  Diamond,
  ChevronDown
} from 'lucide-react';

export const Toolbar: React.FC = () => {
  const { activeTool, setActiveTool, toolSettings, updateToolSettings, getActiveColors } = useToolStore();
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Update CSS custom property for toolbar height
  useEffect(() => {
    if (toolbarRef.current) {
      const height = toolbarRef.current.offsetHeight;
      document.documentElement.style.setProperty('--toolbar-height', `${height}px`);
    }
  }, [activeTool]); // Re-calculate when tool changes (might affect toolbar height)

  const basicTools = [
    { id: 'select', icon: MousePointer, label: 'Select' },
    { id: 'pencil', icon: Pencil, label: 'Pencil' },
    { id: 'brush', icon: Brush, label: 'Brush' },
    { id: 'eraser', icon: Eraser, label: 'Eraser' },
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'fill', icon: PaintBucket, label: 'Fill' },
  ];

  const shapes = [
    { id: 'rectangle', icon: Square, label: 'Rectangle' },
    { id: 'circle', icon: Circle, label: 'Circle' },
    { id: 'triangle', icon: Triangle, label: 'Triangle' },
    { id: 'hexagon', icon: Hexagon, label: 'Hexagon' },
    { id: 'star', icon: Star, label: 'Star' },
    { id: 'pentagon', icon: Pentagon, label: 'Pentagon' },
    { id: 'diamond', icon: Diamond, label: 'Diamond' },
  ];

  const colors = getActiveColors();

  const currentShape = shapes.find(shape => shape.id === activeTool);
  const ShapeIcon = currentShape?.icon || Square;

  // Tools that support width changes
  const widthSupportingTools = ['pencil', 'brush', 'eraser'];
  const showWidthControls = widthSupportingTools.includes(activeTool);

  return (
    <div ref={toolbarRef} className="bg-card border-b border-border">
      {/* First Line - Main Tools */}
      <div className="min-h-16 flex items-center px-4 gap-4">
        {/* Left Side - Tools and Colors */}
        <div className="flex items-center gap-4 flex-wrap flex-1 min-w-0">
          {/* Basic Tools */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {basicTools.map((tool) => (
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

          <Separator orientation="vertical" className="h-8 flex-shrink-0" />

          {/* Shapes Dropdown */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={currentShape ? "default" : "ghost"}
                  size="sm"
                  className="p-2 gap-1"
                >
                  <ShapeIcon className="w-4 h-4" />
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {shapes.map((shape) => (
                  <DropdownMenuItem
                    key={shape.id}
                    onClick={() => setActiveTool(shape.id as any)}
                    className="flex items-center gap-2"
                  >
                    <shape.icon className="w-4 h-4" />
                    {shape.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Separator orientation="vertical" className="h-8 flex-shrink-0" />

          {/* Color Palette */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-sm font-medium">Colors:</span>
            <div className="flex gap-1">
              {colors.map((color) => (
                <button
                  key={color}
                  className={`w-6 h-6 rounded border-2 transition-all ${
                    toolSettings.strokeColor === color 
                      ? 'border-primary scale-110' 
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => updateToolSettings({ strokeColor: color })}
                />
              ))}
            </div>
          </div>

          {/* Stroke Width - Show only for width-supporting tools on large screens */}
          {showWidthControls && (
            <div className="hidden xl:flex items-center gap-2 min-w-32 flex-shrink-0">
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
          )}
        </div>

        {/* Right Side - Actions only */}
        <div className="hidden xl:flex items-center gap-2 flex-shrink-0">
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
      </div>

      {/* Second Line - Additional controls for smaller screens */}
      <div className="xl:hidden border-t border-border px-4 py-2 flex items-center gap-4">
        <div className="flex items-center gap-4 flex-1">
          {/* Stroke Width - Show only for width-supporting tools */}
          {showWidthControls && (
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
          )}
        </div>

        {/* Right side - Actions */}
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
      </div>
    </div>
  );
};
