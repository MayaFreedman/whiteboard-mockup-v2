
import React from 'react';
import { useToolStore } from '../../stores/toolStore';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Switch } from '../ui/switch';
import { Slider } from '../ui/slider';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { Check, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Sidebar as SidebarRoot,
  SidebarContent,
  SidebarHeader,
  useSidebar,
} from '../ui/sidebar';

export const Sidebar: React.FC = () => {
  const { toolSettings, updateToolSettings, colorPalettes, activeColorPalette, setActiveColorPalette } = useToolStore();
  const { settings, updateSettings } = useWhiteboardStore();
  const { open, toggleSidebar } = useSidebar();

  return (
    <>
      <SidebarRoot 
        side="left" 
        className="border-r w-96" 
        collapsible="offcanvas"
        style={{
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.2s ease-linear',
          marginTop: 'var(--toolbar-height, 0px)' // Account for toolbar height
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
            <div className="p-4 pb-8">
              <Tabs defaultValue="tools" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="tools">Tools</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="tools" className="space-y-4">
                  {/* Brush Settings */}
                  <Card>
                    <CardHeader className="bg-muted/80 py-3">
                      <CardTitle className="text-lg">Brush Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
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

                  {/* Color Palettes */}
                  <Card>
                    <CardHeader className="bg-muted/80 py-3">
                      <CardTitle className="text-lg">Color Palettes</CardTitle>
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

                  {/* Text Settings */}
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
                </TabsContent>

                <TabsContent value="settings" className="space-y-4">
                  {/* Canvas Settings */}
                  <Card>
                    <CardHeader className="bg-muted/80 py-3">
                      <CardTitle className="text-lg">Canvas Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Show Grid</label>
                        <Switch
                          checked={settings.gridVisible}
                          onCheckedChange={(checked) => updateSettings({ gridVisible: checked })}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Show Lined Paper</label>
                        <Switch
                          checked={toolSettings.showLinedPaper}
                          onCheckedChange={(checked) => updateToolSettings({ showLinedPaper: checked })}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Background Settings */}
                  <Card>
                    <CardHeader className="bg-muted/80 py-3">
                      <CardTitle className="text-lg">Background</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Background Color</label>
                        <div className="grid grid-cols-4 gap-2">
                          {['#ffffff', '#f8f9fa', '#f1f3f4', '#e8eaed'].map((color) => (
                            <button
                              key={color}
                              className="w-12 h-8 rounded border-2 border-border hover:border-primary"
                              style={{ backgroundColor: color }}
                              onClick={() => updateSettings({ backgroundColor: color })}
                            />
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        </SidebarContent>
      </SidebarRoot>

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
