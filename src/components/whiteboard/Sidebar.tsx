import React, { useState, useEffect } from 'react';
import { useToolStore } from '../../stores/toolStore';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { Sidebar, SidebarContent } from '../ui/sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
import { Switch } from '../ui/switch';
import { Upload } from 'lucide-react';

const regularStickers = [
  { name: 'Thumbs Up', url: '/stickers/thumbs-up.png' },
  { name: 'Heart', url: '/stickers/heart.png' },
  { name: 'Star', url: '/stickers/star.png' },
  { name: 'Exclamation', url: '/stickers/exclamation.png' },
  { name: 'Question', url: '/stickers/question.png' },
];

const animatedStickers = [
  { name: 'Party Cat', url: '/stickers/party-cat.gif' },
  { name: 'Thinking', url: '/stickers/thinking.gif' },
  { name: 'Fire', url: '/stickers/fire.gif' },
];

export const Sidebar: React.FC = () => {
  const { activeTool, setActiveTool, toolSettings, updateToolSettings } = useToolStore();
  const { settings, updateSettings } = useWhiteboardStore();
  const [backgroundColor, setBackgroundColor] = useState(settings.backgroundColor || '#ffffff');

  useEffect(() => {
    setBackgroundColor(settings.backgroundColor || '#ffffff');
  }, [settings.backgroundColor]);

  const handleBackgroundColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBackgroundColor(e.target.value);
  };

  const handleBackgroundBlur = () => {
    updateSettings({ backgroundColor });
  };

  return (
    <Sidebar>
      <SidebarContent className="p-4">
        {/* Basic Tools Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Basic Tools</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-6">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={activeTool === 'pencil' ? 'default' : 'outline'}
                onClick={() => setActiveTool('pencil')}
              >
                Pencil
              </Button>
              <Button
                variant={activeTool === 'brush' ? 'default' : 'outline'}
                onClick={() => setActiveTool('brush')}
              >
                Brush
              </Button>
              <Button
                variant={activeTool === 'text' ? 'default' : 'outline'}
                onClick={() => setActiveTool('text')}
              >
                Text
              </Button>
              <Button
                variant={activeTool === 'stamp' ? 'default' : 'outline'}
                onClick={() => setActiveTool('stamp')}
              >
                Stamp
              </Button>
              <Button
                variant={activeTool === 'eraser' ? 'default' : 'outline'}
                onClick={() => setActiveTool('eraser')}
              >
                Eraser
              </Button>
              <Button
                variant={activeTool === 'select' ? 'default' : 'outline'}
                onClick={() => setActiveTool('select')}
              >
                Select
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tool-specific Settings */}
        {activeTool === 'pencil' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pencil Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Size: {toolSettings.strokeWidth}px
                </Label>
                <Slider
                  value={[toolSettings.strokeWidth]}
                  onValueChange={(value) => updateToolSettings({ strokeWidth: value[0] })}
                  min={1}
                  max={20}
                  step={1}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {activeTool === 'brush' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Brush Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Size: {toolSettings.strokeWidth}px
                </Label>
                <Slider
                  value={[toolSettings.strokeWidth]}
                  onValueChange={(value) => updateToolSettings({ strokeWidth: value[0] })}
                  min={5}
                  max={50}
                  step={1}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {activeTool === 'text' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Text Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div>
                <Label className="text-sm font-medium mb-2 block">Font Size</Label>
                <Input
                  type="number"
                  value={toolSettings.fontSize || 16}
                  onChange={(e) => updateToolSettings({ fontSize: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Font Family</Label>
                <Input
                  type="text"
                  value={toolSettings.fontFamily || 'Arial'}
                  onChange={(e) => updateToolSettings({ fontFamily: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {activeTool === 'stamp' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Stamp Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {/* Size control moved to top */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Stamp Size: {toolSettings.strokeWidth * 10}px
                </label>
                <Slider
                  value={[toolSettings.strokeWidth]}
                  onValueChange={(value) => updateToolSettings({ strokeWidth: value[0] })}
                  min={1}
                  max={10}
                  step={1}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-3 block">Stickers</label>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {regularStickers.map((sticker) => (
                    <button
                      key={sticker.name}
                      className={`relative w-full h-20 rounded border-2 transition-colors overflow-hidden group ${
                        toolSettings.selectedSticker === sticker.name 
                          ? 'border-gray-400 ring-2 ring-gray-300' 
                          : 'border-border hover:border-primary'
                      }`}
                      title={sticker.name}
                      onClick={() => updateToolSettings({ selectedSticker: sticker.name })}
                    >
                      <img 
                        src={sticker.url} 
                        alt={sticker.name}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                  <button
                    className="w-full h-20 rounded border-2 border-dashed border-border hover:border-primary transition-colors flex flex-col items-center justify-center gap-1 group"
                    title="Upload Custom Sticker"
                  >
                    <Upload className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                    <span className="text-xs text-muted-foreground group-hover:text-primary">Upload</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-3 block">Animated Stickers</label>
                <div className="grid grid-cols-2 gap-3">
                  {animatedStickers.map((sticker) => (
                    <button
                      key={sticker.name}
                      className={`relative w-full h-20 rounded border-2 transition-colors overflow-hidden group ${
                        toolSettings.selectedSticker === sticker.name 
                          ? 'border-gray-400 ring-2 ring-gray-300' 
                          : 'border-border hover:border-primary'
                      }`}
                      title={sticker.name}
                      onClick={() => updateToolSettings({ selectedSticker: sticker.name })}
                    >
                      <img 
                        src={sticker.url} 
                        alt={sticker.name}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-1 right-1 bg-primary text-primary-foreground text-xs px-1 rounded">
                        GIF
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTool === 'eraser' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Eraser Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Size: {toolSettings.strokeWidth}px
                </Label>
                <Slider
                  value={[toolSettings.strokeWidth]}
                  onValueChange={(value) => updateToolSettings({ strokeWidth: value[0] })}
                  min={5}
                  max={50}
                  step={1}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {(activeTool === 'rectangle' || activeTool === 'circle' || activeTool === 'triangle' || 
          activeTool === 'hexagon' || activeTool === 'star' || activeTool === 'pentagon' || 
          activeTool === 'diamond') && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Shape Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Border Width: {toolSettings.strokeWidth}px
                </Label>
                <Slider
                  value={[toolSettings.strokeWidth]}
                  onValueChange={(value) => updateToolSettings({ strokeWidth: value[0] })}
                  min={1}
                  max={20}
                  step={1}
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Fill Color</Label>
                <Input
                  type="color"
                  value={toolSettings.fillColor || '#ffffff'}
                  onChange={(e) => updateToolSettings({ fillColor: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Background Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Background</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div>
              <Label className="text-sm font-medium mb-2 block">Background Color</Label>
              <Input
                type="color"
                value={backgroundColor}
                onChange={handleBackgroundColorChange}
                onBlur={handleBackgroundBlur}
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">Show Grid</Label>
              <Switch checked={settings.gridVisible} onCheckedChange={(checked) => updateSettings({ gridVisible: checked })} />
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">Show Lined Paper</Label>
              <Switch checked={settings.linedPaperVisible} onCheckedChange={(checked) => updateSettings({ linedPaperVisible: checked })} />
            </div>
          </CardContent>
        </Card>
      </SidebarContent>
    </Sidebar>
  );
};
