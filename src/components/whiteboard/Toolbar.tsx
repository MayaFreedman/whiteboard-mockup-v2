
import React from 'react';
import { useToolStore } from '../../stores/toolStore';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useUser } from '../../contexts/UserContext';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { useSidebar } from '../ui/sidebar';
import { 
  Pen, 
  Square, 
  Circle, 
  Triangle, 
  Type, 
  Eraser, 
  Hand, 
  Image, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  RotateCw,
  Trash2,
  Menu
} from 'lucide-react';

export const Toolbar: React.FC = () => {
  const { 
    activeTool, 
    setActiveTool, 
    toolSettings, 
    updateToolSettings,
    getActiveColors,
    activeColorPalette 
  } = useToolStore();
  
  const { 
    clearCanvas, 
    zoomIn, 
    zoomOut, 
    resetViewport 
  } = useWhiteboardStore();
  
  const { userId } = useUser();
  const { toggleSidebar } = useSidebar();

  const activeColors = getActiveColors();

  const tools = [
    { id: 'select', icon: Hand, label: 'Select' },
    { id: 'pen', icon: Pen, label: 'Pen' },
    { id: 'rectangle', icon: Square, label: 'Rectangle' },
    { id: 'circle', icon: Circle, label: 'Circle' },
    { id: 'triangle', icon: Triangle, label: 'Triangle' },
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'image', icon: Image, label: 'Image' },
    { id: 'eraser', icon: Eraser, label: 'Eraser' },
  ];

  const handleColorSelect = (color: string) => {
    updateToolSettings({ strokeColor: color });
  };

  const handleClearCanvas = () => {
    if (window.confirm('Are you sure you want to clear the entire canvas? This action cannot be undone.')) {
      clearCanvas(userId);
    }
  };

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-20 bg-background/95 backdrop-blur-sm border-b shadow-sm"
      style={{ '--toolbar-height': '64px' } as React.CSSProperties}
    >
      <div className="flex items-center justify-between px-4 py-2 h-16">
        {/* Left section: Menu and Tools */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-8 w-8"
            title="Toggle sidebar"
          >
            <Menu className="h-4 w-4" />
          </Button>
          
          <Separator orientation="vertical" className="h-6" />
          
          <div className="flex items-center gap-1">
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Button
                  key={tool.id}
                  variant={activeTool === tool.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTool(tool.id as any)}
                  className="h-8 px-2"
                  title={tool.label}
                >
                  <Icon className="w-4 h-4" />
                </Button>
              );
            })}
          </div>
        </div>

        {/* Center section: Colors */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {activeColorPalette}
          </Badge>
          <div className="flex gap-1">
            {activeColors.slice(0, 8).map((color) => (
              <button
                key={color}
                className={`w-6 h-6 rounded border-2 hover:scale-110 transition-transform ${
                  toolSettings.strokeColor === color ? 'border-primary' : 'border-border'
                }`}
                style={{ backgroundColor: color }}
                onClick={() => handleColorSelect(color)}
                title={`Color: ${color}`}
              />
            ))}
          </div>
        </div>

        {/* Right section: Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={zoomOut}
            className="h-8 px-2"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={zoomIn}
            className="h-8 px-2"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={resetViewport}
            className="h-8 px-2"
            title="Reset View"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          
          <Separator orientation="vertical" className="h-6" />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearCanvas}
            className="h-8 px-2 text-white hover:text-white"
            style={{ backgroundColor: '#7b5d6d', hover: { backgroundColor: '#6a4f5d' } }}
            title="Clear Canvas"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
