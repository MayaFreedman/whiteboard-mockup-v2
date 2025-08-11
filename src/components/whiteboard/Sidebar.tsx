import React, { useState, useEffect, useRef, useContext } from 'react';
import { useToolStore } from '../../stores/toolStore';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { Check, ChevronsLeft, ChevronsRight, Upload, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Sidebar as UISidebar, SidebarContent, SidebarHeader, useSidebar } from '../ui/sidebar';
import { DynamicToolSettings } from './settings/DynamicToolSettings';
import { useUser } from '../../contexts/UserContext';
import { MultiplayerContext } from '../../contexts/MultiplayerContext';
import {
  getCustomBackgrounds,
  addCustomBackground,
  removeCustomBackgroundById,
  type CustomBackground,
} from '../../utils/customBackgrounds';

export const WhiteboardSidebar: React.FC = () => {
  const {
    toolSettings,
    updateToolSettings,
    colorPalettes,
    activeColorPalette,
    setActiveColorPalette,
    activeTool,
  } = useToolStore();
  const { settings, updateBackgroundSettings, updateSettings } = useWhiteboardStore();
  const { open, toggleSidebar } = useSidebar();
  const { userId } = useUser();
  const [activeTab, setActiveTab] = useState('tools');

  const multiplayerContext = useContext(MultiplayerContext);
  const [customBackgrounds, setCustomBackgrounds] = useState<CustomBackground[]>([]);
  useEffect(() => {
    setCustomBackgrounds(getCustomBackgrounds());
    const onUpdate = () => setCustomBackgrounds(getCustomBackgrounds());
    window.addEventListener('custom-backgrounds-updated', onUpdate as any);
    return () => window.removeEventListener('custom-backgrounds-updated', onUpdate as any);
  }, []);

  const broadcastBgEvent = (payload: any) => {
    const si = multiplayerContext?.serverInstance;
    const room = si?.server?.room;
    if (!room) return;
    si!.sendEvent({ ...payload, senderSessionId: room.sessionId });
  };

  const handleDeleteBackground = (id: string) => {
    try {
      removeCustomBackgroundById(id);
      broadcastBgEvent({ type: 'custom_background_removed', backgroundId: id });
    } catch (e) {
      console.error('Failed to delete custom background:', e);
    }
  };

  // Switch to tools tab when a tool is selected while on settings tab
  useEffect(() => {
    if (activeTab === 'settings') {
      setActiveTab('tools');
    }
  }, [activeTool]);

  // Handle exclusive background options
  const handleBackgroundToggle = (option: 'grid' | 'lines' | 'dots', enabled: boolean) => {
    if (enabled) {
      updateBackgroundSettings(option);
    } else {
      updateBackgroundSettings('none');
    }
  };

  // Upload custom background (stored locally and synced)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bgDragActive, setBgDragActive] = useState(false);
  const [isBgUploading, setIsBgUploading] = useState(false);
  const triggerUpload = () => fileInputRef.current?.click();

  const handleAddBackground = async (file: File) => {
    setIsBgUploading(true);
    try {
      const bg = await addCustomBackground(file);
      // Broadcast to other users so they add it to their lists
      broadcastBgEvent({ type: 'custom_background_added', background: bg });
      // Apply immediately as current background
      updateSettings({ backgroundColor: `url(${bg.dataUrl})` }, userId);
    } catch (e) {
      console.error('Failed to add custom background:', e);
    } finally {
      setIsBgUploading(false);
    }
  };

  const handleUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleAddBackground(file);
  };

  // Drag & Drop handlers for background upload
  const handleBgDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setBgDragActive(true);
  };
  const handleBgDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setBgDragActive(false);
  };
  const handleBgDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setBgDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      handleAddBackground(e.dataTransfer.files[0]);
    }
  };

  const backgroundImages = [
    { name: 'Aquarium', url: '/backgrounds/Aquarium.png', preview: '/backgrounds/Aquarium.png' },
    { name: 'Bedroom', url: '/backgrounds/Bedroom.png', preview: '/backgrounds/Bedroom.png' },
    { name: 'Garden', url: '/backgrounds/Garden.png', preview: '/backgrounds/Garden.png' },
    { name: 'Gym', url: '/backgrounds/Gym.png', preview: '/backgrounds/Gym.png' },
    { name: 'Hospital', url: '/backgrounds/Hospital.png', preview: '/backgrounds/Hospital.png' },
    { name: 'Kitchen', url: '/backgrounds/Kitchen.png', preview: '/backgrounds/Kitchen.png' },
    { name: 'Library', url: '/backgrounds/Library.png', preview: '/backgrounds/Library.png' },
    { name: 'Living Room', url: '/backgrounds/Living-Room.png', preview: '/backgrounds/Living-Room.png' },
    { name: 'School', url: '/backgrounds/School.png', preview: '/backgrounds/School.png' },
    { name: 'Treehouse', url: '/backgrounds/Treehouse.png', preview: '/backgrounds/Treehouse.png' },
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
          marginTop: 'var(--toolbar-height, 0px)',
        }}
      >
        <SidebarHeader className="border-b px-4 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-company-dark-blue">Tools & Settings</h2>
            <Button onClick={toggleSidebar} variant="ghost" size="icon" className="h-8 w-8">
              <ChevronsLeft className="h-4 w-4" />
              <span className="sr-only">Collapse sidebar</span>
            </Button>
          </div>
        </SidebarHeader>
        <SidebarContent className="flex-1 min-h-0 p-0">
          <ScrollArea className="h-full">
            <div className="p-4 pb-24">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                    <CardHeader className="bg-company-light-pink py-3 px-6 rounded-t-lg">
                      <CardTitle className="text-lg text-company-light-pink-foreground">Colors & Palettes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-6 px-6">
                      {Object.entries(colorPalettes).map(([name, colors]) => (
                        <div key={name} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => setActiveColorPalette(name as any)}
                              className={`flex items-center gap-2 text-left p-2 rounded transition-colors ${
                                activeColorPalette === name
                                  ? 'bg-company-dark-blue/10 text-company-dark-blue font-medium'
                                  : 'hover:bg-muted/50'
                              }`}
                            >
                              <span className="capitalize">{name}</span>
                              {activeColorPalette === name && <Check className="w-4 h-4 text-company-dark-blue" />}
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
                    <CardHeader className="bg-company-light-pink py-3 px-6 rounded-t-lg">
                      <CardTitle className="text-lg text-company-light-pink-foreground">Canvas Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6 px-6">
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">Background Options (choose one):</p>

                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-company-dark-blue">Show Grid</label>
                          <Switch
                            checked={settings.gridVisible}
                            onCheckedChange={(checked) => handleBackgroundToggle('grid', checked)}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-company-dark-blue">Show Lined Paper</label>
                          <Switch
                            checked={settings.linedPaperVisible}
                            onCheckedChange={(checked) => handleBackgroundToggle('lines', checked)}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-company-dark-blue">Show Dots</label>
                          <Switch
                            checked={settings.showDots}
                            onCheckedChange={(checked) => handleBackgroundToggle('dots', checked)}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-company-dark-blue mb-3 block">Set Custom Background</label>

                        {/* Custom Backgrounds Grid */}
                        {customBackgrounds.length > 0 && (
                          <div className="space-y-2 mb-3">
                            <div className="text-xs text-muted-foreground">Your Backgrounds</div>
                            <div className="grid grid-cols-2 gap-2">
                              {customBackgrounds.map((bg) => (
                                <div key={bg.id} className="relative group">
                                  <button
                                    className="relative w-full h-16 rounded border-2 border-border hover:border-company-dark-blue transition-colors overflow-hidden"
                                    title={bg.name}
                                    onClick={() => updateSettings({ backgroundColor: `url(${bg.dataUrl})` }, userId)}
                                  >
                                    <img
                                      src={bg.preview}
                                      alt={`${bg.name} custom background`}
                                      loading="lazy"
                                      className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors" />
                                  </button>
                                  <button
                                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-background/90 border border-border shadow-sm flex items-center justify-center hover:bg-muted"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteBackground(bg.id);
                                    }}
                                    aria-label={`Delete ${bg.name}`}
                                    title="Delete custom background"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}


                        {/* Preset Backgrounds Grid */}
                        <div className="space-y-2">
                          <div className="text-xs text-muted-foreground">Preset Backgrounds</div>
                          <div className="grid grid-cols-2 gap-2">
                            {backgroundImages.map((bg) => (
                              <button
                                key={bg.name}
                                className="relative w-full h-16 rounded border-2 border-border hover:border-company-dark-blue transition-colors overflow-hidden group"
                                onClick={() => updateSettings({ backgroundColor: `url(${bg.url})` }, userId)}
                                title={bg.name}
                              >
                                <img
                                  src={bg.preview}
                                  alt={`${bg.name} background`}
                                  loading="lazy"
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                                <div className="absolute bottom-1 left-1 right-1">
                                  <span className="text-xs text-white font-medium bg-black/50 px-1 rounded">{bg.name}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Upload / Drop Zone */}
                        <div
                          className={`relative border-2 border-dashed rounded-lg p-4 mt-3 transition-colors ${
                            bgDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                          }`}
                          onDragOver={handleBgDragOver}
                          onDragLeave={handleBgDragLeave}
                          onDrop={handleBgDrop}
                        >
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/jpg"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                            onChange={handleUploadChange}
                            disabled={isBgUploading}
                          />
                          <div className="flex flex-col items-center gap-2 text-center">
                            <Upload className="w-6 h-6 text-muted-foreground" />
                            <div className="text-sm">
                              <span className="font-medium">Upload a Background</span>
                            </div>
                            <div className="text-xs text-muted-foreground">Click to upload or drag and drop</div>
                          </div>
                          {isBgUploading && (
                            <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
                              <div className="text-sm font-medium">Processing...</div>
                            </div>
                          )}
                        </div>

                        <button
                          className="mt-2 w-full h-8 rounded border-2 border-border hover:border-company-dark-blue transition-colors bg-background"
                          onClick={() => updateSettings({ backgroundColor: '#ffffff' }, userId)}
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
          className="fixed z-50 bg-background/95 backdrop-blur-sm text-company-dark-blue hover:text-company-light-pink hover:bg-company-light-pink/5 transition-all duration-200 flex items-center gap-2 px-3 py-2 rounded-r-md cursor-pointer shadow-md hover:shadow-lg border-0 outline-none border-l-2 border-l-company-light-pink/30 hover:border-l-company-light-pink/60"
          style={{ left: '0', top: 'calc(var(--toolbar-height, 64px) + 1px)' }}
        >
          <ChevronsRight className="h-4 w-4" />
          <span className="text-sm font-medium">Open sidebar</span>
        </button>
      )}
    </>
  );
};
