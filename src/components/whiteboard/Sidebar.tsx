
import React from 'react';
import { useToolStore } from '../../stores/toolStore';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Switch } from '../ui/switch';
import { Slider } from '../ui/slider';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

export const Sidebar: React.FC = () => {
  const { toolSettings, updateToolSettings, colorPalettes } = useToolStore();
  const { settings, updateSettings } = useWhiteboardStore();

  return (
    <div className="w-80 bg-card border-r border-border p-4 overflow-y-auto">
      <Tabs defaultValue="tools" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tools">Tools</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="tools" className="space-y-4">
          {/* Brush Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Brush Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Brush Type</label>
                <div className="flex gap-2">
                  {['solid', 'marker', 'highlighter'].map((type) => (
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
            <CardHeader>
              <CardTitle className="text-lg">Color Palettes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(colorPalettes).map(([name, colors]) => (
                <div key={name}>
                  <h4 className="text-sm font-medium mb-2 capitalize">{name}</h4>
                  <div className="grid grid-cols-6 gap-1">
                    {colors.map((color, index) => (
                      <button
                        key={index}
                        className={`w-8 h-8 rounded border-2 ${
                          toolSettings.strokeColor === color 
                            ? 'border-primary ring-2 ring-primary/20' 
                            : 'border-border hover:border-primary/50'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => updateToolSettings({ strokeColor: color })}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Text Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Text Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
            <CardHeader>
              <CardTitle className="text-lg">Canvas Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Snap to Grid</label>
                <Switch
                  checked={settings.snapToGrid}
                  onCheckedChange={(checked) => updateSettings({ snapToGrid: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Background Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Background</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
  );
};
