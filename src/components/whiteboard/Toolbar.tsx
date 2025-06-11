
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
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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

  // Check if scrolling is needed and update scroll buttons
  useEffect(() => {
    const checkScrollState = () => {
      if (scrollContainerRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
        const needsScrolling = scrollWidth > clientWidth;
        setShowScrollButtons(needsScrolling);
        setCanScrollLeft(scrollLeft > 0);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
      }
    };

    checkScrollState();
    window.addEventListener('resize', checkScrollState);
    
    return () => window.removeEventListener('resize', checkScrollState);
  }, [activeTool, toolSettings]);

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

  const handleColorSelect = (color: string) => {
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
    <div ref={toolbarRef} className="bg-card border-b border-border relative">
      {/* Scroll Left Button */}
      {showScrollButtons && canScrollLeft && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute left-0 top-0 h-full z-20 rounded-none border-r bg-card/95 backdrop-blur shadow-sm"
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
          className="absolute right-0 top-0 h-full z-20 rounded-none border-l bg-card/95 backdrop-blur shadow-sm"
          onClick={scrollRight}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      )}

      {/* Scrollable Content Container */}
      <div 
        ref={scrollContainerRef}
        className="overflow-x-auto scrollbar-hide"
        style={{
          paddingLeft: showScrollButtons && canScrollLeft ? '44px' : '0',
          paddingRight: showScrollButtons && canScrollRight ? '44px' : '0',
        }}
        onScroll={handleScroll}
      >
        <style>{`
          .scrollbar-hide {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          .scrollbar-hide::-webkit-scrollbar {
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

          {/* Color Palette */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-sm font-medium whitespace-nowrap">Colors:</span>
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
                <span className="text-sm font-medium whitespace-nowrap">Width:</span>
                <Slider
                  value={[toolSettings.strokeWidth]}
                  onValueChange={(value) => updateToolSettings({ strokeWidth: value[0] })}
                  min={1}
                  max={20}
                  step={1}
                  className="w-20"
                />
                <Badge variant="outline" className="min-w-8 text-center">
                  {toolSettings.strokeWidth}
                </Badge>
              </div>
            </>
          )}

          <Separator orientation="vertical" className="h-8 flex-shrink-0" />

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
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
      </div>
    </div>
  );
};

export default Toolbar;
