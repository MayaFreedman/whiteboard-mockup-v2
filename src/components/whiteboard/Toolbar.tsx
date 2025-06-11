
import React, { useRef, useEffect, useState } from 'react';
import { useToolStore } from '../../stores/toolStore';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { Slider } from '../ui/slider';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { 
  Pencil, 
  Brush,
  Square, 
  Circle, 
  Type, 
  MousePointer, 
  Eraser,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  PaintBucket,
  Triangle,
  Hexagon,
  Star,
  Pentagon,
  Diamond,
  ChevronDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export const Toolbar: React.FC = () => {
  const { 
    activeTool, 
    setActiveTool, 
    toolSettings, 
    updateToolSettings, 
    getActiveColors
  } = useToolStore();
  const toolbarRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const colorContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [maxVisibleColors, setMaxVisibleColors] = useState(15);

  // Tools that support width changes
  const widthSupportingTools = ['pencil', 'brush', 'eraser'];
  const showWidthControls = widthSupportingTools.includes(activeTool);

  // Update CSS custom property for toolbar height
  useEffect(() => {
    if (toolbarRef.current) {
      const height = toolbarRef.current.offsetHeight;
      document.documentElement.style.setProperty('--toolbar-height', `${height}px`);
    }
  }, [activeTool]);

  // Measure available space and calculate how many colors can fit
  useEffect(() => {
    const measureAvailableSpace = () => {
      if (!colorContainerRef.current) return;

      console.log('Measuring available space for colors...');
      
      const viewportWidth = window.innerWidth;
      console.log('Viewport width:', viewportWidth);
      
      const baseToolsWidth = 220;
      const shapesWidth = 45;
      const separatorsWidth = 25;
      const widthControlsWidth = showWidthControls ? 160 : 0;
      const actionsWidth = 140;
      const paddingAndMargins = 40;
      const scrollButtonsWidth = 50;
      
      const usedWidth = baseToolsWidth + shapesWidth + separatorsWidth + widthControlsWidth + actionsWidth + paddingAndMargins + scrollButtonsWidth;
      const availableForColors = viewportWidth - usedWidth;
      
      console.log('Available width for colors:', availableForColors);
      
      const colorButtonWidth = 26;
      const colorsLabelWidth = 55;
      
      const maxColors = Math.floor((availableForColors - colorsLabelWidth) / colorButtonWidth);
      
      console.log('Max colors that can fit:', maxColors);
      
      const newMaxColors = Math.max(3, Math.min(maxColors, 15));
      
      console.log('Setting maxVisibleColors to:', newMaxColors);
      
      setMaxVisibleColors(newMaxColors);
    };

    measureAvailableSpace();
    
    window.addEventListener('resize', measureAvailableSpace);
    
    return () => window.removeEventListener('resize', measureAvailableSpace);
  }, [showWidthControls, activeTool]);

  // Check scroll state
  useEffect(() => {
    const checkScrollState = () => {
      if (scrollContainerRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
        setShowScrollButtons(scrollWidth > clientWidth);
        setCanScrollLeft(scrollLeft > 0);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
      }
    };

    checkScrollState();
    window.addEventListener('resize', checkScrollState);
    
    return () => window.removeEventListener('resize', checkScrollState);
  }, [activeTool, toolSettings, maxVisibleColors]);

  const basicTools = [
    { id: 'select', icon: MousePointer, label: 'Select' },
    { id: 'pencil', icon: Pencil, label: 'Pencil' },
    { id: 'brush', icon: Brush, label: 'Brush' },
    { id: 'eraser', icon: Eraser, label: 'Eraser' },
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'fill', icon: PaintBucket, label: 'Fill' },
  ];

  const shapes = [
    { id: 'rectangle', icon: Square, label: 'Rectangle' },
    { id: 'circle', icon: Circle, label: 'Circle' },
    { id: 'triangle', icon: Triangle, label: 'Triangle' },
    { id: 'hexagon', icon: Hexagon, label: 'Hexagon' },
    { id: 'star', icon: Star, label: 'Star' },
    { id: 'pentagon', icon: Pentagon, label: 'Pentagon' },
    { id: 'diamond', icon: Diamond, label: 'Diamond' },
  ];

  const allColors = getActiveColors();
  const currentShape = shapes.find(shape => shape.id === activeTool);
  const ShapeIcon = currentShape?.icon || Square;

  // Check if we need scrolling for colors
  const actualColorSpace = colorContainerRef.current?.offsetWidth || 0;
  const neededColorSpace = allColors.length * 28 + 60;
  const needsScrolling = neededColorSpace > actualColorSpace && allColors.length > maxVisibleColors;
  
  console.log('Color scrolling logic:', {
    'allColors.length': allColors.length,
    maxVisibleColors,
    actualColorSpace,
    neededColorSpace,
    needsScrolling
  });

  const handleColorSelect = (color: string) => {
    console.log('Color selected:', color);
    updateToolSettings({ strokeColor: color });
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  return (
    <div ref={toolbarRef} className="bg-card border-b border-border relative flex">
      {/* Scroll Left Button */}
      {showScrollButtons && canScrollLeft && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute left-0 top-0 h-full z-10 rounded-none border-r bg-card/95 backdrop-blur"
          onClick={scrollLeft}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
      )}

      {/* Scroll Right Button */}
      {showScrollButtons && canScrollRight && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-20 top-0 h-full z-10 rounded-none border-l bg-card/95 backdrop-blur"
          onClick={scrollRight}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      )}

      {/* Scrollable Content Container */}
      <div 
        ref={scrollContainerRef}
        className="overflow-x-auto flex-1"
        style={{
          paddingLeft: showScrollButtons && canScrollLeft ? '40px' : '0',
          paddingRight: '180px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
        onScroll={handleScroll}
      >
        <style>{`
          .overflow-x-auto::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        
        {/* Single Line - All Tools */}
        <div className="min-h-16 flex items-center px-4 gap-4 w-max">
          {/* Basic Tools */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {basicTools.map((tool) => (
              <Button
                key={tool.id}
                variant={activeTool === tool.id ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTool(tool.id as any)}
                className="p-2"
              >
                <tool.icon className="w-4 h-4" />
              </Button>
            ))}
          </div>

          <Separator orientation="vertical" className="h-8 flex-shrink-0" />

          {/* Shapes Dropdown */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={currentShape ? "default" : "ghost"}
                  size="sm"
                  className="p-2 gap-1"
                >
                  <ShapeIcon className="w-4 h-4" />
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {shapes.map((shape) => (
                  <DropdownMenuItem
                    key={shape.id}
                    onClick={() => setActiveTool(shape.id as any)}
                    className="flex items-center gap-2"
                  >
                    <shape.icon className="w-4 h-4" />
                    {shape.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Separator orientation="vertical" className="h-8 flex-shrink-0" />

          {/* Scrollable Color Palette */}
          <div ref={colorContainerRef} className="flex items-center gap-2 flex-shrink-0">
            <span className="text-sm font-medium">Colors:</span>
            <div className="flex gap-1 items-center">
              {allColors.map((color) => (
                <button
                  key={color}
                  className={`w-6 h-6 rounded border-2 transition-all flex-shrink-0 ${
                    toolSettings.strokeColor === color 
                      ? 'border-primary scale-110' 
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorSelect(color)}
                />
              ))}
            </div>
          </div>

          {/* Stroke Width - Show only for width-supporting tools */}
          {showWidthControls && (
            <>
              <Separator orientation="vertical" className="h-8 flex-shrink-0" />
              <div className="flex items-center gap-2 min-w-32 flex-shrink-0">
                <span className="text-sm font-medium">Width:</span>
                <Slider
                  value={[toolSettings.strokeWidth]}
                  onValueChange={(value) => updateToolSettings({ strokeWidth: value[0] })}
                  min={1}
                  max={20}
                  step={1}
                  className="flex-1"
                />
                <Badge variant="outline" className="min-w-8 text-center">
                  {toolSettings.strokeWidth}
                </Badge>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Fixed Action Buttons on Right Edge */}
      <div className="absolute right-0 top-0 h-full flex items-center gap-2 px-4 border-l bg-card">
        <Button variant="ghost" size="sm">
          <Undo className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm">
          <Redo className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm">
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm">
          <ZoomIn className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default Toolbar;
