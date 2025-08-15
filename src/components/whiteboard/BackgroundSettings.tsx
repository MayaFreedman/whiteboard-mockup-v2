import React, { useRef, useState } from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useUser } from '../../contexts/UserContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Switch } from '../ui/switch';
import { SimpleTooltip } from '../ui/simple-tooltip';
import { Upload, X } from 'lucide-react';
import { getCustomBackgrounds, removeCustomBackgroundById, addCustomBackground } from '../../utils/customBackgrounds';
import { preloadAndCacheImage } from '../../utils/imagePreloader';

interface BackgroundSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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

export const BackgroundSettings: React.FC<BackgroundSettingsProps> = ({ open, onOpenChange }) => {
  const { settings, updateSettings, updateBackgroundSettings } = useWhiteboardStore();
  const { userId } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customBackgrounds, setCustomBackgrounds] = useState(getCustomBackgrounds());
  const [bgDragActive, setBgDragActive] = useState(false);
  const [isBgUploading, setIsBgUploading] = useState(false);

  const handleBackgroundToggle = (type: 'grid' | 'lines' | 'dots', checked: boolean) => {
    if (checked) {
      updateBackgroundSettings(type, userId);
    } else {
      updateBackgroundSettings('none', userId);
    }
  };

  const handleSelectPresetBg = (bgUrl: string) => {
    updateSettings({ backgroundColor: bgUrl }, userId);
  };

  const handleSelectCustomBg = (bg: any) => {
    updateSettings({ backgroundColor: bg.dataUrl }, userId);
  };

  const handleDeleteBackground = (bgId: string) => {
    removeCustomBackgroundById(bgId);
    setCustomBackgrounds(getCustomBackgrounds());
  };

  const handleBgDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setBgDragActive(true);
  };

  const handleBgDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setBgDragActive(false);
  };

  const handleBgDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setBgDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      await handleImageUpload(imageFile);
    }
  };

  const handleUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleImageUpload(file);
    }
  };

  const handleImageUpload = async (file: File) => {
    try {
      setIsBgUploading(true);
      const newBg = await addCustomBackground(file, file.name);
      setCustomBackgrounds(getCustomBackgrounds());
      updateSettings({ backgroundColor: newBg.dataUrl }, userId);
    } catch (error) {
      console.error('Failed to upload background:', error);
    } finally {
      setIsBgUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Background Settings</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-company-dark-blue">Show Grid</label>
              <Switch checked={settings.gridVisible} onCheckedChange={checked => handleBackgroundToggle('grid', checked)} />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-company-dark-blue">Show Lined Paper</label>
              <Switch checked={settings.linedPaperVisible} onCheckedChange={checked => handleBackgroundToggle('lines', checked)} />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-company-dark-blue">Show Dots</label>
              <Switch checked={settings.showDots} onCheckedChange={checked => handleBackgroundToggle('dots', checked)} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-company-dark-blue mb-3 block">Set Custom Background</label>

            {/* Custom Backgrounds Grid */}
            {customBackgrounds.length > 0 && (
              <div className="space-y-2 mb-3">
                <div className="text-xs text-muted-foreground">Your Backgrounds</div>
                <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
                  {customBackgrounds.map(bg => (
                    <div key={bg.id} className="relative group">
                      <SimpleTooltip content={bg.name}>
                        <button
                          className="relative w-full h-16 rounded border-2 border-border hover:border-company-dark-blue transition-colors overflow-hidden"
                          onMouseEnter={() => preloadAndCacheImage(bg.dataUrl)}
                          onClick={() => handleSelectCustomBg(bg)}
                        >
                          <img src={bg.preview} alt={`${bg.name} custom background`} loading="lazy" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors" />
                        </button>
                      </SimpleTooltip>
                      <SimpleTooltip content="Delete custom background">
                        <button 
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-background/90 border border-border shadow-sm flex items-center justify-center hover:bg-muted" 
                          onClick={e => {
                            e.stopPropagation();
                            handleDeleteBackground(bg.id);
                          }} 
                          aria-label={`Delete ${bg.name}`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </SimpleTooltip>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preset Backgrounds Grid */}
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Preset Backgrounds</div>
              <div className="grid grid-cols-2 gap-2">
                {backgroundImages.map(bg => (
                  <SimpleTooltip key={bg.name} content={bg.name}>
                    <button 
                      className="relative w-full h-16 rounded border-2 border-border hover:border-company-dark-blue transition-colors overflow-hidden group" 
                      onMouseEnter={() => preloadAndCacheImage(bg.url)} 
                      onClick={() => handleSelectPresetBg(bg.url)}
                    >
                      <img src={bg.preview} alt={`${bg.name} background`} loading="lazy" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                      <div className="absolute bottom-1 left-1 right-1">
                        <span className="text-xs text-white font-medium bg-black/50 px-1 rounded">{bg.name}</span>
                      </div>
                    </button>
                  </SimpleTooltip>
                ))}
              </div>
            </div>

            {/* Upload / Drop Zone */}
            <div 
              className={`relative border-2 border-dashed rounded-lg p-4 mt-3 transition-colors ${bgDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`} 
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
        </div>
      </DialogContent>
    </Dialog>
  );
};