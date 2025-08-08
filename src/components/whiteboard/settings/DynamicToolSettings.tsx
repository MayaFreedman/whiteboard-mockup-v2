import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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

import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { Alert, AlertDescription } from '../../ui/alert';
import { searchIcons } from '../../../utils/iconSearch';
import { Smile, Apple, Dog, Car, Lightbulb, Heart, Flag, Users, PartyPopper, LayoutGrid, Image, Circle, Search } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../ui/tooltip';
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
  custom: Image
};
export const DynamicToolSettings: React.FC = () => {
  const {
    activeTool,
    toolSettings,
    updateToolSettings
  } = useToolStore();
  const {
    selectedObjectIds,
    objects
  } = useWhiteboardStore();

  // For stamp tool, we'll add category filtering + search
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [refreshKey, setRefreshKey] = useState(0); // Force refresh when custom stamps change
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const uploaderRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(searchQuery), 200);
    return () => clearTimeout(id);
  }, [searchQuery]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Memoize categories to prevent recalculation
  const categories = useMemo(() => {
    if (activeTool !== 'stamp') return [];
    const base = getAllCategories();
    const withCustom = base.includes('custom') ? base : [...base, 'custom'];
    return ['all', ...withCustom];
  }, [activeTool, refreshKey]);

  // Memoize stamp items with stable reference to prevent GridSelector re-renders
  const stampItems = useMemo(() => {
    if (activeTool !== 'stamp') return [];
    if (selectedCategory === 'all') {
      // Use getAllIcons to get all icons without duplicates
      const allIcons = getAllIcons();

      // Deduplicate by URL to ensure no duplicates
      const seen = new Set();
      return allIcons.filter(icon => {
        if (seen.has(icon.path)) return false;
        seen.add(icon.path);
        return true;
      }).map(icon => ({
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

  // Search results and displayed items
  const resolvedCategory = useMemo(() => selectedCategory === 'all' ? undefined : selectedCategory, [selectedCategory]);
  const searchResults = useMemo(() => {
    if (activeTool !== 'stamp') return null;
    const q = debouncedQuery.trim();
    if (!q) return null;
    return searchIcons(q, {
      category: resolvedCategory,
      limit: 500
    });
  }, [activeTool, debouncedQuery, resolvedCategory, refreshKey]);
  const displayedItems = useMemo(() => {
    if (searchResults) {
      const seen = new Set<string>();
      return searchResults.filter(icon => {
        if (seen.has(icon.path)) return false;
        seen.add(icon.path);
        return true;
      }).map(icon => ({
        name: icon.name,
        url: icon.path,
        preview: icon.path
      }));
    }
    return stampItems;
  }, [searchResults, stampItems]);
  const totalResults = searchResults?.length || 0;

  // Calculate optimal window config based on current list size
  const windowConfig = useMemo(() => {
    const size = displayedItems.length;
    if (size >= 2000) {
      return {
        windowSize: 100,
        batchSize: 25
      } as const;
    } else if (size >= 500) {
      return {
        windowSize: 150,
        batchSize: 50
      } as const;
    } else if (size >= 150) {
      return {
        windowSize: 200,
        batchSize: 50
      } as const;
    }
    return {
      windowSize: undefined,
      batchSize: undefined
    } as const;
  }, [displayedItems.length]);

  // Memoize category change handler - now instant with progressive loading
  const handleCategoryChange = useCallback((category: string) => {
    setSelectedCategory(category);
    // No preloading needed - images load progressively as they become visible
    console.log(`🎯 Switched to category: ${category} (progressive loading enabled)`);
  }, []);

  // Memoize stamp selection handler
  const handleStampChange = useCallback((value: string) => {
    updateToolSettings({
      selectedSticker: value
    });
  }, [updateToolSettings]);

  // Handle custom stamp added
  const handleCustomStampAdded = useCallback(() => {
    setRefreshKey(prev => prev + 1); // Force refresh of categories and stamp items
  }, []);

  // Show properties panel for selected objects (exact same logic as before)
  if (selectedObjectIds.length > 0) {
    const obj = objects[selectedObjectIds[0]];
    if (obj?.type === 'text') {
      return <ToolSettingCard title="Text Properties">
          <TextPropertiesPanel selectedObjectId={selectedObjectIds[0]} />
        </ToolSettingCard>;
    } else if (obj?.type === 'image') {
      return <ToolSettingCard title="Stamp Properties">
          <StampPropertiesPanel selectedObjectId={selectedObjectIds[0]} />
        </ToolSettingCard>;
    } else if (obj && ['rectangle', 'circle', 'triangle', 'diamond', 'pentagon', 'hexagon', 'star', 'heart'].includes(obj.type)) {
      return <ToolSettingCard title="Shape Properties">
          <ShapePropertiesPanel selectedObjectId={selectedObjectIds[0]} />
        </ToolSettingCard>;
    }
  }

  // Eraser tool (keep existing component)
  if (activeTool === 'eraser') {
    return <ToolSettingCard title="Eraser Settings">
        <EraserSettings />
      </ToolSettingCard>;
  }

  // Handle stamp tool with optimized rendering
  if (activeTool === 'stamp') {
    return <ToolSettingCard title="Stamp Settings">
        <div className="space-y-4">
          {/* Size slider */}
          <SliderSetting label="Stamp Size" value={toolSettings.strokeWidth || 5} min={5} max={20} step={1} onChange={value => updateToolSettings({
          strokeWidth: value
        })} valueFormatter={value => `${value * 10}px`} showValue={true} />
          
          {/* Category selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <TooltipProvider delayDuration={100}>
              <div className="flex flex-wrap gap-2">
                {categories.map(category => {
                const IconComp = categoryIcons[category] || Circle;
                const label = category === 'all' ? 'All Icons' : getCategoryDisplayName(category);
                const isActive = selectedCategory === category;
                return <Tooltip key={category}>
                      <TooltipTrigger asChild>
                        <button className={`h-9 w-9 rounded-full flex items-center justify-center transition-colors ${isActive ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`} onClick={() => handleCategoryChange(category)} aria-label={label} aria-pressed={isActive}>
                          <IconComp className="h-4 w-4" />
                          <span className="sr-only">{label}</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">{label}</TooltipContent>
                    </Tooltip>;
              })}
              </div>
            </TooltipProvider>
          </div>

          {/* Search input */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input ref={searchInputRef} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search emojis" className="pl-9" aria-label="Search emojis" />
            </div>
            {debouncedQuery && <div className="text-xs text-muted-foreground">Found {totalResults} result{totalResults === 1 ? '' : 's'}</div>}
          </div>
          {debouncedQuery && totalResults === 0 && (
            <Alert>
              <AlertDescription className="flex items-center justify-between gap-2">
                {selectedCategory !== 'all' ? (
                  <>
                    <span>No results for "{debouncedQuery}" in {getCategoryDisplayName(selectedCategory)}.</span>
                    <Button size="sm" variant="secondary" onClick={() => handleCategoryChange('all')}>
                      Search all icons
                    </Button>
                  </>
                ) : (
                  <>
                    <span>No results for "{debouncedQuery}" across all icons.</span>
                    <Button size="sm" onClick={() => uploaderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                      Upload custom stamp
                    </Button>
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}
          
        {/* Progressive stamp grid with virtual windowing for large categories */}
          {selectedCategory === 'custom' && displayedItems.length === 0 && !debouncedQuery ? <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">You haven't uploaded any custom stamps yet. Use the uploader below to add one!</div> : <ProgressiveGridSelector label="Select Stamp" items={displayedItems} selectedValue={toolSettings.selectedSticker || ''} onChange={handleStampChange} showUpload={false} onCustomStampDeleted={handleCustomStampAdded} windowSize={windowConfig.windowSize} batchSize={windowConfig.batchSize} />}
          
          {/* Custom stamp upload */}
          <div ref={uploaderRef}>
            <CustomStampUpload onStampAdded={handleCustomStampAdded} />
          </div>
        </div>
      </ToolSettingCard>;
  }

  // Handle configured tools
  const toolConfig = toolsConfig[activeTool];
  if (toolConfig) {
    return <ToolSettingCard title={`${toolConfig.displayName} Settings`}>
        <div className="space-y-4">
          {toolConfig.settings.map(setting => <ToolSettingRenderer key={setting.key} setting={setting} toolSettings={toolSettings} updateToolSettings={updateToolSettings} />)}
        </div>
      </ToolSettingCard>;
  }

  // Handle simple tools
  const simpleToolConfig = simpleToolsConfig[activeTool];
  if (simpleToolConfig) {
    return <ToolSettingCard title={`${simpleToolConfig.displayName} Tool`}>
        <p className="text-sm text-muted-foreground">
          {simpleToolConfig.description}
        </p>
      </ToolSettingCard>;
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
      return <SliderSetting label={setting.label} value={toolSettings[setting.key] || (setting.key === 'shapeBorderWeight' ? 2 : 1)} min={setting.min!} max={setting.max!} step={setting.step!} onChange={value => updateToolSettings({
        [setting.key]: value
      })} valueFormatter={setting.valueFormatter} showValue={setting.showValue} />;
    case 'badges':
      return <BadgeSelector label={setting.label} items={setting.items!} selectedValue={toolSettings[setting.key] || setting.items![0].value} onChange={value => updateToolSettings({
        [setting.key]: value
      })} />;
    case 'select':
      return <SelectSetting label={setting.label} value={toolSettings[setting.key] || setting.options![0].value} options={setting.options!} onChange={value => updateToolSettings({
        [setting.key]: value
      })} />;
    case 'toggleGroup':
      return <ToggleButtonGroup label={setting.label} items={setting.items!} values={{
        textBold: toolSettings.textBold || false,
        textItalic: toolSettings.textItalic || false,
        textUnderline: toolSettings.textUnderline || false
      }} onChange={(key, value) => updateToolSettings({
        [key]: value
      })} />;
    case 'grid':
      // We handle stamp tool separately now
      if (setting.key === 'selectedSticker') {
        return null;
      }
      return <ProgressiveGridSelector label={setting.label} items={setting.gridItems!} selectedValue={toolSettings[setting.key] || setting.gridItems![0].url} onChange={value => updateToolSettings({
        [setting.key]: value
      })} showUpload={setting.key === 'selectedSticker'} />;
    case 'text':
      if (setting.key === 'shapeHint') {
        return <div>
            <p className="text-sm text-muted-foreground">
              To fill shapes, select the Fill tool from the toolbar and click on any shape. 
              The fill color will be the currently selected color from the main toolbar.
            </p>
          </div>;
      }
      return null;
    default:
      return null;
  }
};