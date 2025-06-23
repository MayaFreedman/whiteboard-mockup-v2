import React from 'react';
import { useToolStore } from '../../stores/toolStore';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { Check, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Sidebar as UISidebar,
  SidebarContent,
  SidebarHeader,
  useSidebar,
} from '../ui/sidebar';
import { DynamicToolSettings } from './settings/DynamicToolSettings';

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

  // ... keep existing code (backgroundImages array)
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
                  <DynamicToolSettings />
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
