import React, { useRef, useEffect, useState } from 'react';
import { useToolStore } from '../../stores/toolStore';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
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
  Stamp
} from 'lucide-react';

interface ToolItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

/**
 * Configuration for basic drawing tools
 */
const BASIC_TOOLS: ToolItem[] = [
  { id: 'select', icon: MousePointer, label: 'Select' },
  { id: 'pencil', icon: Pencil, label: 'Pencil' },
  { id: 'brush', icon: Brush, label: 'Brush' },
  { id: 'eraser', icon: Eraser, label: 'Eraser' },
  { id: 'text', icon: Type, label: 'Text' },
  { id: 'stamp', icon: Stamp, label: 'Stamp' },
  { id: 'fill', icon: PaintBucket, label: 'Fill' },
];

/**
 * Configuration for shape tools
 */
const SHAPE_TOOLS: ToolItem[] = [
  { id: 'rectangle', icon: Square, label: 'Rectangle' },
  { id: 'circle', icon: Circle, label: 'Circle' },
  { id: 'triangle', icon: Triangle, label: 'Triangle' },
  { id: 'hexagon', icon: Hexagon, label: 'Hexagon' },
  { id: 'star', icon: Star, label: 'Star' },
  { id: 'pentagon', icon: Pentagon, label: 'Pentagon' },
  { id: 'diamond', icon: Diamond, label: 'Diamond' },
];

/**
 * Hook to determine if the screen is mobile based on active color palette
 * @param activeColorPalette - Current active color palette
 * @returns Boolean indicating if screen should be treated as mobile
 */
const useResponsiveBreakpoint = (activeColorPalette: string) => {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    /**
     * Checks if current screen width is below the responsive breakpoint
     */
    const checkMobile = () => {
      const breakpoint = activeColorPalette === 'basic' ? 950 : 1100;
      setIsMobile(window.innerWidth < breakpoint);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [activeColorPalette]);

  return isMobile;
};

/**
 * Hook to update CSS custom property for toolbar height
 * @param toolbarRef - Reference to the toolbar element
 * @param activeTool - Current active tool (triggers recalculation)
 */
const useToolbarHeight = (toolbarRef: React.RefObject<HTMLDivElement>, activeTool: string) => {
  useEffect(() => {
    if (toolbarRef.current) {
      const height = toolbarRef.current.offsetHeight;
      document.documentElement.style.setProperty('--toolbar-height', `${height}px`);
    }
  }, [activeTool]);
};

/**
 * Renders a tool button with proper styling based on active state
 */
const ToolButton: React.FC<{
  tool: ToolItem;
  isActive: boolean;
  onClick: () => void;
}> = ({ tool, isActive, onClick }) => (
  <Button
    variant={isActive ? "default" : "ghost"}
    size="sm"
    onClick={onClick}
    className="p-2"
    title={tool.label}
  >
    <tool.icon className="w-4 h-4" />
  </Button>
);

/**
 * Renders a color button for the color palette
 */
const ColorButton: React.FC<{
  color: string;
  isSelected: boolean;
  onClick: () => void;
}> = ({ color, isSelected, onClick }) => (
  <button
    className={`w-6 h-6 rounded border-2 transition-all flex-shrink-0 ${
      isSelected 
        ? 'border-primary scale-110' 
        : 'border-border hover:border-muted-foreground/50'
    }`}
    style={{ backgroundColor: color }}
    onClick={onClick}
    title={`Select color: ${color}`}
  />
);

/**
 * Renders action buttons (undo, redo, zoom)
 */
const ActionButtons: React.FC = () => (
  <div className="flex items-center gap-2">
    <Button variant="ghost" size="sm" title="Undo">
      <Undo className="w-4 h-4" />
    </Button>
    <Button variant="ghost" size="sm" title="Redo">
      <Redo className="w-4 h-4" />
    </Button>
    <Button variant="ghost" size="sm" title="Zoom Out">
      <ZoomOut className="w-4 h-4" />
    </Button>
    <Button variant="ghost" size="sm" title="Zoom In">
      <ZoomIn className="w-4 h-4" />
    </Button>
  </div>
);

/**
 * Main toolbar component for the whiteboard
 * Provides tool selection, color palette, and action buttons
 */
export const Toolbar: React.FC = () => {
  const { 
    activeTool, 
    setActiveTool, 
    toolSettings, 
    updateToolSettings, 
    getActiveColors,
    activeColorPalette
  } = useToolStore();
  
  const { clearCanvas } = useWhiteboardStore();
  
  const toolbarRef = useRef<HTMLDivElement>(null);
  const isMobile = useResponsiveBreakpoint(activeColorPalette);
  
  // Update CSS custom property for toolbar height
  useToolbarHeight(toolbarRef, activeTool);

  const allColors = getActiveColors();

  /**
   * Handles color selection and updates tool settings
   * @param color - The selected color
   */
  const handleColorSelect = (color: string) => {
    updateToolSettings({ strokeColor: color });
  };

  /**
   * Handles tool selection
   * @param toolId - The ID of the tool to select
   */
  const handleToolSelect = (toolId: string) => {
    setActiveTool(toolId as any);
  };

  /**
   * Handles clearing the entire canvas
   */
  const handleClearCanvas = () => {
    clearCanvas();
  };

  // Find the currently selected shape for the dropdown button
  const selectedShape = SHAPE_TOOLS.find(shape => shape.id === activeTool);
  const isShapeSelected = !!selectedShape;

  return (
    <div ref={toolbarRef} className="bg-card border-b border-border relative">
      {/* Desktop Action Buttons - Fixed to the right */}
      <div className={`absolute right-4 top-0 h-full items-center gap-2 z-10 ${isMobile ? 'hidden' : 'flex'}`}>
        <ActionButtons />
      </div>

      {/* Scrollable Content Container */}
      <div 
        className="overflow-x-auto scrollbar-hide"
        style={{ paddingRight: isMobile ? '16px' : '200px' }}
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
        
        {/* Main Toolbar Content */}
        <div className="min-h-16 flex items-center px-4 gap-4 w-max">
          {/* Basic Tools Section */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {BASIC_TOOLS.map((tool) => (
              <ToolButton
                key={tool.id}
                tool={tool}
                isActive={activeTool === tool.id}
                onClick={() => handleToolSelect(tool.id)}
              />
            ))}
          </div>

          <Separator orientation="vertical" className="h-8 flex-shrink-0" />

          {/* Shapes Dropdown Section */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={isShapeSelected ? "default" : "ghost"}
                  size="sm"
                  className="p-2 gap-1"
                  title={selectedShape ? selectedShape.label : "Select Shape"}
                >
                  {selectedShape ? (
                    <selectedShape.icon className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-popover">
                {SHAPE_TOOLS.map((shape) => (
                  <DropdownMenuItem
                    key={shape.id}
                    onClick={() => handleToolSelect(shape.id)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <shape.icon className="w-4 h-4" />
                    <span>{shape.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Clear Canvas Button - Show only when eraser is active */}
          {activeTool === 'eraser' && (
            <>
              <Separator orientation="vertical" className="h-8 flex-shrink-0" />
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleClearCanvas}
                  className="flex items-center gap-2"
                  title="Clear entire canvas"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className={isMobile ? 'hidden' : ''}>Clear Canvas</span>
                </Button>
              </div>
            </>
          )}

          <Separator orientation="vertical" className="h-8 flex-shrink-0" />

          {/* Color Palette Section */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-sm font-medium whitespace-nowrap ${isMobile ? 'hidden' : ''}`}>
              Colors:
            </span>
            <div className="flex gap-1 items-center">
              {allColors.map((color) => (
                <ColorButton
                  key={color}
                  color={color}
                  isSelected={toolSettings.strokeColor === color}
                  onClick={() => handleColorSelect(color)}
                />
              ))}
            </div>
          </div>

          {/* Mobile Action Buttons - Show at the end on mobile */}
          {isMobile && (
            <>
              <Separator orientation="vertical" className="h-8 flex-shrink-0" />
              <div className="flex items-center gap-2 flex-shrink-0">
                <ActionButtons />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
