import React from 'react';
import { useToolStore } from '../../stores/toolStore';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Switch } from '../ui/switch';
import { Slider } from '../ui/slider';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { Check, ChevronsLeft, ChevronsRight, Upload } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Sidebar as UISidebar,
  SidebarContent,
  SidebarHeader,
  useSidebar,
} from '../ui/sidebar';

// Context-sensitive tool settings component
const ToolSettings: React.FC = () => {
  const { activeTool, toolSettings, updateToolSettings } = useToolStore();

  // Drawing tools (pencil, brush, eraser)
  if (['pencil', 'brush', 'eraser'].includes(activeTool)) {
    return (
      <Card>
        <CardHeader className="bg-muted/80 py-3">
          <CardTitle className="text-lg capitalize">{activeTool} Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {activeTool !== 'eraser' && (
            <div>
              <label className="text-sm font-medium mb-2 block">Brush Type</label>
              <div className="flex gap-2">
                {['pencil', 'chalk', 'spray', 'crayon'].map((type) => (
                  <Badge
                    key={type}
                    variant={toolSettings.brushType === type ? 'default' : 'outline'}
                    className="cursor-pointer capitalize"
                    onClick={() => updateToolSettings({ brushType: type as any })}
                  >
                    {type}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium mb-2 block">
              {activeTool === 'eraser' ? 'Size' : 'Stroke Width'}: {toolSettings.strokeWidth}px
            </label>
            <Slider
              value={[toolSettings.strokeWidth]}
              onValueChange={(value) => updateToolSettings({ strokeWidth: value[0] })}
              min={1}
              max={activeTool === 'eraser' ? 50 : 20}
              step={1}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Opacity: {Math.round(toolSettings.opacity * 100)}%
            </label>
            <Slider
              value={[toolSettings.opacity]}
              onValueChange={(value) => updateToolSettings({ opacity: value[0] })}
              min={0.1}
              max={1}
              step={0.1}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Text tool
  if (activeTool === 'text') {
    return (
      <Card>
        <CardHeader className="bg-muted/80 py-3">
          <CardTitle className="text-lg">Text Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Font Size: {toolSettings.fontSize}px
            </label>
            <Slider
              value={[toolSettings.fontSize]}
              onValueChange={(value) => updateToolSettings({ fontSize: value[0] })}
              min={8}
              max={72}
              step={2}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Font Family</label>
            <select
              value={toolSettings.fontFamily}
              onChange={(e) => updateToolSettings({ fontFamily: e.target.value })}
              className="w-full p-2 rounded border bg-background"
            >
              <option value="Arial">Arial</option>
              <option value="Helvetica">Helvetica</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Courier New">Courier New</option>
              <option value="Georgia">Georgia</option>
            </select>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Stamp tool
  if (activeTool === 'stamp') {
    const regularStickers = [
      {
        name: 'Fruit Bowl',
        url: 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=100&h=100&fit=crop&auto=format',
        preview: 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=60&h=60&fit=crop&auto=format'
      },
      {
        name: 'Orange Cat',
        url: 'https://images.unsplash.com/photo-1582562124811-c09040d0a901?w=100&h=100&fit=crop&auto=format',
        preview: 'https://images.unsplash.com/photo-1582562124811-c09040d0a901?w=60&h=60&fit=crop&auto=format'
      },
      {
        name: 'Deer',
        url: 'https://images.unsplash.com/photo-1472396961693-142e6e269027?w=100&h=100&fit=crop&auto=format',
        preview: 'https://images.unsplash.com/photo-1472396961693-142e6e269027?w=60&h=60&fit=crop&auto=format'
      },
      {
        name: 'Kitten',
        url: 'https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?w=100&h=100&fit=crop&auto=format',
        preview: 'https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?w=60&h=60&fit=crop&auto=format'
      }
    ];

    const animatedStickers = [
      {
        name: 'Monkey',
        url: 'https://images.unsplash.com/photo-1501286353178-1ec881214838?w=100&h=100&fit=crop&auto=format',
        preview: 'https://images.unsplash.com/photo-1501286353178-1ec881214838?w=60&h=60&fit=crop&auto=format'
      },
      {
        name: 'Penguins',
        url: 'https://images.unsplash.com/photo-1441057206919-63d19fac2369?w=100&h=100&fit=crop&auto=format',
        preview: 'https://images.unsplash.com/photo-1441057206919-63d19fac2369?w=60&h=60&fit=crop&auto=format'
      }
    ];

    const handleStickerSelect = (stickerUrl: string) => {
      updateToolSettings({ selectedSticker: stickerUrl });
    };

    return (
      <Card>
        <CardHeader className="bg-muted/80 py-3">
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
                    toolSettings.selectedSticker === sticker.url
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-border hover:border-primary'
                  }`}
                  onClick={() => handleStickerSelect(sticker.url)}
                  title={sticker.name}
                >
                  <img 
                    src={sticker.preview} 
                    alt={sticker.name}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" className="w-full gap-2">
              <Upload className="w-4 h-4" />
              Upload Custom Sticker
            </Button>
          </div>

          <div>
            <label className="text-sm font-medium mb-3 block">Animated Stickers</label>
            <div className="grid grid-cols-2 gap-3">
              {animatedStickers.map((sticker) => (
                <button
                  key={sticker.name}
                  className={`relative w-full h-20 rounded border-2 transition-colors overflow-hidden group ${
                    toolSettings.selectedSticker === sticker.url
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-border hover:border-primary'
                  }`}
                  onClick={() => handleStickerSelect(sticker.url)}
                  title={sticker.name}
                >
                  <img 
                    src={sticker.preview} 
                    alt={sticker.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1 right-1">
                    <span className="text-xs bg-primary text-primary-foreground px-1 rounded">
                      GIF
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Shape tools - simplified without stroke width
  if (['rectangle', 'circle', 'triangle', 'hexagon', 'star', 'pentagon', 'diamond'].includes(activeTool)) {
    return (
      <Card>
        <CardHeader className="bg-muted/80 py-3">
          <CardTitle className="text-lg capitalize">{activeTool} Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Opacity: {Math.round(toolSettings.opacity * 100)}%
            </label>
            <Slider
              value={[toolSettings.opacity]}
              onValueChange={(value) => updateToolSettings({ opacity: value[0] })}
              min={0.1}
              max={1}
              step={0.1}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default for select, hand, fill tools
  return (
    <Card>
      <CardHeader className="bg-muted/80 py-3">
        <CardTitle className="text-lg capitalize">{activeTool} Tool</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">
          {activeTool === 'select' && 'Click and drag to select objects on the canvas.'}
          {activeTool === 'hand' && 'Click and drag to pan around the canvas.'}
          {activeTool === 'fill' && 'Click on shapes to fill them with the selected color.'}
        </p>
      </CardContent>
    </Card>
  );
};

export const WhiteboardSidebar: React.FC = () => {
  const { toolSettings, updateToolSettings, colorPalettes, activeColorPalette, setActiveColorPalette } = useToolStore();
  const { settings, updateSettings } = useWhiteboardStore();
  const { open, toggleSidebar } = useSidebar();

  // Handle exclusive background options
  const handleBackgroundToggle = (option: 'grid' | 'lines' | 'dots', enabled: boolean) => {
    if (enabled) {
      // Turn off all other background options
      updateSettings({ gridVisible: option === 'grid' });
      updateToolSettings({ 
        showLinedPaper: option === 'lines',
        showDots: option === 'dots'
      });
    } else {
      // Turn off the current option
      if (option === 'grid') {
        updateSettings({ gridVisible: false });
      } else if (option === 'lines') {
        updateToolSettings({ showLinedPaper: false });
      } else if (option === 'dots') {
        updateToolSettings({ showDots: false });
      }
    }
  };

  const backgroundImages = [
    {
      name: 'Forest',
      url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800&h=600&fit=crop&auto=format',
      preview: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=80&h=60&fit=crop&auto=format'
    },
    {
      name: 'Mountain Lake',
      url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&h=600&fit=crop&auto=format',
      preview: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=80&h=60&fit=crop&auto=format'
    },
    {
      name: 'Deer in Nature',
      url: 'https://images.unsplash.com/photo-1472396961693-142e6e269027?w=800&h=600&fit=crop&auto=format',
      preview: 'https://images.unsplash.com/photo-1472396961693-142e6e269027?w=80&h=60&fit=crop&auto=format'
    },
    {
      name: 'Waterfall Bridge',
      url: 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=800&h=600&fit=crop&auto=format',
      preview: 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=80&h=60&fit=crop&auto=format'
    }
  ];

  return (
    <>
      <UISidebar 
        side="left" 
        className="border-r w-96" 
        collapsible="offcanvas"
        style={{
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.2s ease-linear',
          marginTop: 'var(--toolbar-height, 0px)'
        }}
      >
        <SidebarHeader className="border-b px-4 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Tools & Settings</h2>
            <Button
              onClick={toggleSidebar}
              variant="ghost"
              size="icon"
              className="h-8 w-8"
            >
              <ChevronsLeft className="h-4 w-4" />
              <span className="sr-only">Collapse sidebar</span>
            </Button>
          </div>
        </SidebarHeader>
        <SidebarContent className="flex-1 min-h-0 p-0">
          <ScrollArea className="h-full">
            <div className="p-4 pb-24">
              <Tabs defaultValue="tools" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="tools">Tools</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="tools" className="space-y-4">
                  <ToolSettings />
                </TabsContent>

                <TabsContent value="settings" className="space-y-4">
                  {/* Colors & Palettes */}
                  <Card>
                    <CardHeader className="bg-muted/80 py-3">
                      <CardTitle className="text-lg">Colors & Palettes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-6">
                      {Object.entries(colorPalettes).map(([name, colors]) => (
                        <div key={name} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => setActiveColorPalette(name as any)}
                              className={`flex items-center gap-2 text-left p-2 rounded transition-colors ${
                                activeColorPalette === name 
                                  ? 'bg-primary/10 text-primary font-medium' 
                                  : 'hover:bg-muted/50'
                              }`}
                            >
                              <span className="capitalize">{name}</span>
                              {activeColorPalette === name && (
                                <Check className="w-4 h-4 text-primary" />
                              )}
                            </button>
                          </div>
                          <div className="flex gap-1">
                            {colors.slice(0, 8).map((color, index) => (
                              <div
                                key={index}
                                className="w-5 h-5 rounded border border-border"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                            {colors.length > 8 && (
                              <div className="flex items-center justify-center w-5 h-5 text-xs text-muted-foreground border border-border rounded">
                                +{colors.length - 8}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Canvas Settings */}
                  <Card>
                    <CardHeader className="bg-muted/80 py-3">
                      <CardTitle className="text-lg">Canvas Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">Background Options (choose one):</p>
                        
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">Show Grid</label>
                          <Switch
                            checked={settings.gridVisible}
                            onCheckedChange={(checked) => handleBackgroundToggle('grid', checked)}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">Show Lined Paper</label>
                          <Switch
                            checked={toolSettings.showLinedPaper}
                            onCheckedChange={(checked) => handleBackgroundToggle('lines', checked)}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">Show Dots</label>
                          <Switch
                            checked={toolSettings.showDots || false}
                            onCheckedChange={(checked) => handleBackgroundToggle('dots', checked)}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-3 block">Set Custom Background</label>
                        <div className="grid grid-cols-2 gap-2">
                          {backgroundImages.map((bg) => (
                            <button
                              key={bg.name}
                              className="relative w-full h-16 rounded border-2 border-border hover:border-primary transition-colors overflow-hidden group"
                              onClick={() => updateSettings({ backgroundColor: `url(${bg.url})` })}
                              title={bg.name}
                            >
                              <img 
                                src={bg.preview} 
                                alt={bg.name}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                              <div className="absolute bottom-1 left-1 right-1">
                                <span className="text-xs text-white font-medium bg-black/50 px-1 rounded">
                                  {bg.name}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                        <button
                          className="mt-2 w-full h-8 rounded border-2 border-border hover:border-primary transition-colors bg-background"
                          onClick={() => updateSettings({ backgroundColor: '#ffffff' })}
                        >
                          <span className="text-xs text-muted-foreground">Clear Background</span>
                        </button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* General Settings */}
                  <Card>
                    <CardHeader className="bg-muted/80 py-3">
                      <CardTitle className="text-lg">General Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Zoom controls and other general options will be added here.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        </SidebarContent>
      </UISidebar>

      {/* Collapsed state button positioned just below toolbar */}
      {!open && (
        <button
          onClick={toggleSidebar}
          className="fixed z-50 bg-background/95 backdrop-blur-sm text-muted-foreground hover:text-foreground transition-all duration-200 flex items-center gap-2 px-3 py-2 rounded-r-md cursor-pointer shadow-md hover:shadow-lg border-0 outline-none"
          style={{
            left: '0',
            top: 'var(--toolbar-height, 64px)'
          }}
        >
          <ChevronsRight className="h-4 w-4" />
          <span className="text-sm">Open sidebar</span>
        </button>
      )}
    </>
  );
};
