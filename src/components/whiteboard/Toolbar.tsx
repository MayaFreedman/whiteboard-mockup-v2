import React, { useRef, useEffect, useState } from 'react';
import { useToolStore } from '../../stores/toolStore';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useUser } from '../../contexts/UserContext';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Slider } from '../ui/slider';
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
  PaintBucket,
  Triangle,
  Hexagon,
  Star,
  Pentagon,
  Diamond,
  ChevronDown,
  Stamp,
  Trash2
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
      const breakpoint = 950; // Use consistent breakpoint for all palettes
      setIsMobile(window.innerWidth < breakpoint);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
    className={`p-2 ${isActive ? 'bg-company-dark-blue text-company-dark-blue-foreground hover:bg-company-dark-blue/90' : ''}`}
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
        ? 'border-company-dark-blue scale-110' 
        : 'border-border hover:border-muted-foreground/50'
    }`}
    style={{ backgroundColor: color }}
    onClick={onClick}
    title={`Select color: ${color}`}
  />
);

/**
 * Renders action buttons (undo, redo, clear canvas) using the undo/redo hook
 */
const ActionButtons: React.FC = () => {
  const { userId } = useUser();
  const { undo, redo, canUndo, canRedo } = useUndoRedo();
  const { clearCanvas } = useWhiteboardStore();
  
  const handleUndo = () => {
    console.log('🎯 Toolbar undo clicked for user:', userId);
    undo(userId);
  };
  
  const handleRedo = () => {
    console.log('🎯 Toolbar redo clicked for user:', userId);
    redo(userId);
  };

  const handleClearCanvas = () => {
    console.log('🗑️ Toolbar clear canvas clicked for user:', userId);
    clearCanvas(userId);
  };

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [userId]);

  return (
    <div className="flex items-center gap-2">
      <Button 
        variant="ghost" 
        size="sm" 
        title="Undo (Ctrl+Z)"
        onClick={handleUndo}
        disabled={!canUndo(userId)}
      >
        <Undo className="w-4 h-4" />
      </Button>
      <Button 
        variant="ghost" 
        size="sm" 
        title="Redo (Ctrl+Y)"
        onClick={handleRedo}
        disabled={!canRedo(userId)}
      >
        <Redo className="w-4 h-4" />
      </Button>
      <Button 
        variant="ghost" 
        size="sm" 
        title="Clear Canvas"
        onClick={handleClearCanvas}
        className="text-destructive hover:text-destructive"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
};

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
    activeColorPalette,
    setPaletteCustomColor
  } = useToolStore();
  
  const toolbarRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLInputElement>(null);
  const isMobile = useResponsiveBreakpoint(activeColorPalette);
  
  // Update CSS custom property for toolbar height
  useToolbarHeight(toolbarRef, activeTool);

  const allColors = getActiveColors();
  const customColorIndex = allColors.length - 1;

  /**
   * Handles color selection and updates tool settings
   * @param color - The selected color
   */
  const handleColorSelect = (color: string) => {
    updateToolSettings({ strokeColor: color });
  };


  /**
   * Handles custom color selection from color picker
   * @param event - The input change event
   */
  const handleCustomColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = event.target.value;
    setPaletteCustomColor(activeColorPalette, newColor);
    updateToolSettings({ strokeColor: newColor });
    // Don't close the picker - let user click outside to close it naturally
  };

  /**
   * Handles tool selection
   * @param toolId - The ID of the tool to select
   */
  const handleToolSelect = (toolId: string) => {
    setActiveTool(toolId as any);
  };

  // Find the currently selected shape for the dropdown button
  const selectedShape = SHAPE_TOOLS.find(shape => shape.id === activeTool);
  const isShapeSelected = !!selectedShape;

  return (
    <div ref={toolbarRef} className="bg-card border-b border-company-light-pink/20 relative">
      {/* Desktop Action Buttons - Fixed to the right */}
      <div className={`absolute right-4 top-0 h-full items-center gap-2 z-10 ${isMobile ? 'hidden' : 'flex'}`}>
        <ActionButtons />
      </div>

      {/* Scrollable Content Container */}
      <div 
        className="overflow-x-auto scrollbar-hide"
        style={{ paddingRight: isMobile ? '16px' : '150px' }}
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
                  className={`p-2 gap-1 ${isShapeSelected ? 'bg-company-dark-blue text-company-dark-blue-foreground hover:bg-company-dark-blue/90' : ''}`}
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

          {/* Color Palette Section */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-sm font-medium whitespace-nowrap ${isMobile ? 'hidden' : ''}`}>
              Colors:
            </span>
            <div className="flex gap-1 items-center">
              {allColors.map((color, index) => {
                const isCustomColor = index === customColorIndex;
                
                if (isCustomColor) {
                  const isRainbow = color === 'rainbow-gradient';
                  let longPressTimer: NodeJS.Timeout | null = null;
                  let isLongPress = false;

                  const handleMouseDown = () => {
                    isLongPress = false;
                    longPressTimer = setTimeout(() => {
                      isLongPress = true;
                      colorPickerRef.current?.click();
                    }, 500); // 500ms for long press
                  };

                  const handleMouseUp = () => {
                    if (longPressTimer) {
                      clearTimeout(longPressTimer);
                    }
                    if (!isLongPress) {
                      // Short click - select the color
                      handleColorSelect(color);
                    }
                  };

                  const handleMouseLeave = () => {
                    if (longPressTimer) {
                      clearTimeout(longPressTimer);
                    }
                  };
                  
                  return (
                    <div key={`custom-color-slot`} className="relative w-6 h-6 flex-shrink-0">
                      {/* Interactive button area */}
                      <button
                        className={`w-6 h-6 rounded border-2 transition-all duration-200 hover:scale-110 relative ${
                          toolSettings.strokeColor === color 
                            ? 'border-company-dark-blue scale-110' 
                            : 'border-border hover:border-muted-foreground/50'
                        }`}
                        style={{
                          backgroundColor: isRainbow ? undefined : color,
                          background: isRainbow 
                            ? 'linear-gradient(45deg, #ff0000, #ff8800, #ffff00, #88ff00, #00ff88, #0088ff, #8800ff, #ff0088)'
                            : undefined
                        }}
                        onMouseDown={handleMouseDown}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseLeave}
                        onTouchStart={handleMouseDown}
                        onTouchEnd={handleMouseUp}
                        title="Click to select, hold to change custom color"
                      />
                      
                      {/* Plus badge */}
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold border border-background pointer-events-none">
                        +
                      </div>
                      
                      {/* Hidden color input */}
                      <input
                        ref={colorPickerRef}
                        type="color"
                        value={isRainbow ? '#ff0000' : color}
                        onChange={handleCustomColorChange}
                        className="absolute opacity-0 pointer-events-none"
                        aria-label="Custom color picker"
                      />
                    </div>
                  );
                }
                
                return (
                  <ColorButton
                    key={`color-${index}`}
                    color={color}
                    isSelected={toolSettings.strokeColor === color}
                    onClick={() => handleColorSelect(color)}
                  />
                );
              })}
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
