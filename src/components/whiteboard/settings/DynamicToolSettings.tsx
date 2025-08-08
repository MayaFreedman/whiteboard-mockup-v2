import React, { useState, useMemo, useCallback } from 'react';
import { useToolStore } from '../../../stores/toolStore';
import { useWhiteboardStore } from '../../../stores/whiteboardStore';
import { toolsConfig, simpleToolsConfig, ToolConfig, ToolSettingConfig } from '../../../config/toolsConfig';
import { ToolSettingCard } from './ToolSettingCard';
import { SliderSetting } from './SliderSetting';
import { BadgeSelector } from './BadgeSelector';
import { ProgressiveGridSelector } from './ProgressiveGridSelector';
import { SelectSetting } from './SelectSetting';
import { ToggleButtonGroup } from './ToggleButtonGroup';
import { EraserSettings } from '../EraserSettings';
import { ShapePropertiesPanel } from '../ShapePropertiesPanel';
import { TextPropertiesPanel } from '../TextPropertiesPanel';
import { StampPropertiesPanel } from '../StampPropertiesPanel';
import { getAllCategories, getIconsByCategoryWithCustom, getCategoryDisplayName, getAllIcons } from '../../../utils/iconRegistry';
import { CustomStampUpload } from './CustomStampUpload';
import { SkinTonePicker } from './SkinTonePicker';
// Removed preloadCategoryEmojis import - now using progressive loading

import { Smile, Apple, Dog, Car, Lightbulb, Heart, Flag, Users, PartyPopper, LayoutGrid, Image, Circle } from 'lucide-react';

const categoryIcons: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  all: LayoutGrid,
  'smileys-emotion': Smile,
  'food-drink': Apple,
  'animals-nature': Dog,
  'people-body': Users,
  'activities-events': PartyPopper,
  'travel-places': Car,
  'objects-tools': Lightbulb,
  symbols: Heart,
  flags: Flag,
  custom: Image,
};

export const DynamicToolSettings: React.FC = () => {
  const { activeTool, toolSettings, updateToolSettings } = useToolStore();
  const { selectedObjectIds, objects } = useWhiteboardStore();
  
  // For stamp tool, we'll add category filtering
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [refreshKey, setRefreshKey] = useState(0); // Force refresh when custom stamps change
  
  // Memoize categories to prevent recalculation
  const categories = useMemo(() => 
    activeTool === 'stamp' ? ['all', ...getAllCategories()] : [], 
    [activeTool, refreshKey]
  );
  
  // Memoize stamp items with stable reference to prevent GridSelector re-renders
  const stampItems = useMemo(() => {
    if (activeTool !== 'stamp') return [];
    
    if (selectedCategory === 'all') {
      // Use getAllIcons to get all icons without duplicates
      const allIcons = getAllIcons();
      
      // Deduplicate by URL to ensure no duplicates
      const seen = new Set();
      return allIcons
        .filter(icon => {
          if (seen.has(icon.path)) return false;
          seen.add(icon.path);
          return true;
        })
        .map(icon => ({
          name: icon.name,
          url: icon.path,
          preview: icon.path
        }));
    }
    
    // Filter icons by category (including custom)
    return getIconsByCategoryWithCustom(selectedCategory).map(icon => ({
      name: icon.name,
      url: icon.path,
      preview: icon.path // Use the actual SVG/image path as preview for OpenMoji, dataURL for custom
    }));
  }, [activeTool, selectedCategory, refreshKey]);

  // Calculate optimal window config based on category size
  const windowConfig = useMemo(() => {
    const categorySize = stampItems.length;
    
    if (categorySize >= 2000) {
      return { windowSize: 100, batchSize: 25 };
    } else if (categorySize >= 500) {
      return { windowSize: 150, batchSize: 50 };
    } else if (categorySize >= 150) {
      return { windowSize: 200, batchSize: 50 };
    }
    
    // Small categories load everything immediately
    return { windowSize: undefined, batchSize: undefined };
  }, [stampItems.length]);
  
  // Memoize category change handler - now instant with progressive loading
  const handleCategoryChange = useCallback((category: string) => {
    setSelectedCategory(category);
    // No preloading needed - images load progressively as they become visible
    console.log(`🎯 Switched to category: ${category} (progressive loading enabled)`);
  }, []);
  
  // Memoize stamp selection handler
  const handleStampChange = useCallback((value: string) => {
    updateToolSettings({ selectedSticker: value });
  }, [updateToolSettings]);
  
  // Handle custom stamp added
  const handleCustomStampAdded = useCallback(() => {
    setRefreshKey(prev => prev + 1); // Force refresh of categories and stamp items
  }, []);
  
  // Show properties panel for selected objects (exact same logic as before)
  if (selectedObjectIds.length > 0) {
    const obj = objects[selectedObjectIds[0]];
    if (obj?.type === 'text') {
      return (
        <ToolSettingCard title="Text Properties">
          <TextPropertiesPanel selectedObjectId={selectedObjectIds[0]} />
        </ToolSettingCard>
      );
    } else if (obj?.type === 'image') {
      return (
        <ToolSettingCard title="Stamp Properties">
          <StampPropertiesPanel selectedObjectId={selectedObjectIds[0]} />
        </ToolSettingCard>
      );
    } else if (obj && ['rectangle', 'circle', 'triangle', 'diamond', 'pentagon', 'hexagon', 'star', 'heart'].includes(obj.type)) {
      return (
        <ToolSettingCard title="Shape Properties">
          <ShapePropertiesPanel selectedObjectId={selectedObjectIds[0]} />
        </ToolSettingCard>
      );
    }
  }

  // Eraser tool (keep existing component)
  if (activeTool === 'eraser') {
    return (
      <ToolSettingCard title="Eraser Settings">
        <EraserSettings />
      </ToolSettingCard>
    );
  }

  // Handle stamp tool with optimized rendering
  if (activeTool === 'stamp') {
    return (
      <ToolSettingCard title="Stamp Settings">
        <div className="space-y-4">
          {/* Size slider */}
          <SliderSetting
            label="Stamp Size"
            value={toolSettings.strokeWidth || 5}
            min={5}
            max={20}
            step={1}
            onChange={(value) => updateToolSettings({ strokeWidth: value })}
            valueFormatter={(value) => `${value * 10}px`}
            showValue={true}
          />
          
          {/* Category selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => {
                const IconComp = categoryIcons[category] || Circle;
                const label = category === 'all' ? 'All Icons' : getCategoryDisplayName(category);
                const isActive = selectedCategory === category;
                return (
                  <button
                    key={category}
                    className={`h-9 w-9 rounded-full flex items-center justify-center transition-colors ${
                      isActive 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                    onClick={() => handleCategoryChange(category)}
                    title={label}
                    aria-label={label}
                    aria-pressed={isActive}
                  >
                    <IconComp className="h-4 w-4" />
                    <span className="sr-only">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Progressive stamp grid with virtual windowing for large categories */}
          <ProgressiveGridSelector
            label="Select Stamp"
            items={stampItems}
            selectedValue={toolSettings.selectedSticker || ''}
            onChange={handleStampChange}
            showUpload={false}
            onCustomStampDeleted={handleCustomStampAdded}
            windowSize={windowConfig.windowSize}
            batchSize={windowConfig.batchSize}
          />
          
          {/* Custom stamp upload */}
          <CustomStampUpload onStampAdded={handleCustomStampAdded} />
        </div>
      </ToolSettingCard>
    );
  }

  // Handle configured tools
  const toolConfig = toolsConfig[activeTool];
  if (toolConfig) {
    return (
      <ToolSettingCard title={`${toolConfig.displayName} Settings`}>
        <div className="space-y-4">
          {toolConfig.settings.map((setting) => (
            <ToolSettingRenderer
              key={setting.key}
              setting={setting}
              toolSettings={toolSettings}
              updateToolSettings={updateToolSettings}
            />
          ))}
        </div>
      </ToolSettingCard>
    );
  }

  // Handle simple tools
  const simpleToolConfig = simpleToolsConfig[activeTool];
  if (simpleToolConfig) {
    return (
      <ToolSettingCard title={`${simpleToolConfig.displayName} Tool`}>
        <p className="text-sm text-muted-foreground">
          {simpleToolConfig.description}
        </p>
      </ToolSettingCard>
    );
  }

  return null;
};

interface ToolSettingRendererProps {
  setting: ToolSettingConfig;
  toolSettings: any;
  updateToolSettings: (updates: any) => void;
}

const ToolSettingRenderer: React.FC<ToolSettingRendererProps> = ({ 
  setting, 
  toolSettings, 
  updateToolSettings 
}) => {
  switch (setting.type) {
    case 'slider':
      return (
        <SliderSetting
          label={setting.label}
          value={toolSettings[setting.key] || (setting.key === 'shapeBorderWeight' ? 2 : 1)}
          min={setting.min!}
          max={setting.max!}
          step={setting.step!}
          onChange={(value) => updateToolSettings({ [setting.key]: value })}
          valueFormatter={setting.valueFormatter}
          showValue={setting.showValue}
        />
      );

    case 'badges':
      return (
        <BadgeSelector
          label={setting.label}
          items={setting.items!}
          selectedValue={toolSettings[setting.key] || setting.items![0].value}
          onChange={(value) => updateToolSettings({ [setting.key]: value })}
        />
      );

    case 'select':
      return (
        <SelectSetting
          label={setting.label}
          value={toolSettings[setting.key] || setting.options![0].value}
          options={setting.options!}
          onChange={(value) => updateToolSettings({ [setting.key]: value })}
        />
      );

    case 'toggleGroup':
      return (
        <ToggleButtonGroup
          label={setting.label}
          items={setting.items!}
          values={{
            textBold: toolSettings.textBold || false,
            textItalic: toolSettings.textItalic || false,
            textUnderline: toolSettings.textUnderline || false
          }}
          onChange={(key, value) => updateToolSettings({ [key]: value })}
        />
      );

    case 'grid':
      // We handle stamp tool separately now
      if (setting.key === 'selectedSticker') {
        return null;
      }
      
      return (
        <ProgressiveGridSelector
          label={setting.label}
          items={setting.gridItems!}
          selectedValue={toolSettings[setting.key] || setting.gridItems![0].url}
          onChange={(value) => updateToolSettings({ [setting.key]: value })}
          showUpload={setting.key === 'selectedSticker'}
        />
      );

    case 'text':
      if (setting.key === 'shapeHint') {
        return (
          <div>
            <p className="text-sm text-muted-foreground">
              To fill shapes, select the Fill tool from the toolbar and click on any shape. 
              The fill color will be the currently selected color from the main toolbar.
            </p>
          </div>
        );
      }
      return null;

    default:
      return null;
  }
};
