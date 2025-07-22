import React, { useState, useMemo, useCallback } from 'react';
import { useToolStore } from '../../../stores/toolStore';
import { useWhiteboardStore } from '../../../stores/whiteboardStore';
import { toolsConfig, simpleToolsConfig, ToolConfig, ToolSettingConfig } from '../../../config/toolsConfig';
import { ToolSettingCard } from './ToolSettingCard';
import { SliderSetting } from './SliderSetting';
import { BadgeSelector } from './BadgeSelector';
import { GridSelector } from './GridSelector';
import { SelectSetting } from './SelectSetting';
import { ToggleButtonGroup } from './ToggleButtonGroup';
import { EraserSettings } from '../EraserSettings';
import { ShapePropertiesPanel } from '../ShapePropertiesPanel';
import { TextPropertiesPanel } from '../TextPropertiesPanel';
import { getCategories, getIconsByCategory, getCategoryDisplayName } from '../../../utils/iconRegistry';

export const DynamicToolSettings: React.FC = () => {
  const { activeTool, toolSettings, updateToolSettings } = useToolStore();
  const { selectedObjectIds, objects } = useWhiteboardStore();
  
  // For stamp tool, we'll add category filtering
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Memoize categories to prevent recalculation
  const categories = useMemo(() => 
    activeTool === 'stamp' ? ['all', ...getCategories()] : [], 
    [activeTool]
  );
  
  // Memoize stamp items with stable reference to prevent GridSelector re-renders
  const stampItems = useMemo(() => {
    if (activeTool !== 'stamp') return [];
    
    if (selectedCategory === 'all') {
      // Get all OpenMoji icons from iconRegistry
      return getCategories().flatMap(category => 
        getIconsByCategory(category).map(icon => ({
          name: icon.name,
          url: icon.path,
          preview: icon.path // Use the SVG path as preview
        }))
      );
    }
    
    // Filter OpenMoji icons by category
    return getIconsByCategory(selectedCategory).map(icon => ({
      name: icon.name,
      url: icon.path,
      preview: icon.path // Use the SVG path as preview
    }));
  }, [activeTool, selectedCategory]);
  
  // Memoize category change handler to prevent re-renders
  const handleCategoryChange = useCallback((category: string) => {
    setSelectedCategory(category);
  }, []);
  
  // Memoize stamp selection handler
  const handleStampChange = useCallback((value: string) => {
    updateToolSettings({ selectedSticker: value });
  }, [updateToolSettings]);
  
  // Show properties panel for selected objects (exact same logic as before)
  if (selectedObjectIds.length > 0) {
    const obj = objects[selectedObjectIds[0]];
    if (obj?.type === 'text') {
      return (
        <ToolSettingCard title="Text Properties">
          <TextPropertiesPanel selectedObjectId={selectedObjectIds[0]} />
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
              {categories.map((category) => (
                <button
                  key={category}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    selectedCategory === category 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                  onClick={() => handleCategoryChange(category)}
                >
                  {category === 'all' ? 'All Icons' : getCategoryDisplayName(category)}
                </button>
              ))}
            </div>
          </div>
          
          {/* Stamp grid with memoized items */}
          <GridSelector
            label="Select Stamp"
            items={stampItems}
            selectedValue={toolSettings.selectedSticker || ''}
            onChange={handleStampChange}
            showUpload={true}
          />
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
        <GridSelector
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
