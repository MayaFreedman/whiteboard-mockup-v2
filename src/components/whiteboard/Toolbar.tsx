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
import { SimpleTooltip } from '../ui/simple-tooltip';

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
  ImageIcon,
  Camera,
  Trash2,
  StickyNote
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
  { id: 'sticky-note', icon: StickyNote, label: 'Sticky Note' },
  { id: 'stamp', icon: Stamp, label: 'Stamp' },
  { id: 'background', icon: ImageIcon, label: 'Background' },
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
      const breakpoint = 1125; // Use consistent breakpoint for all palettes
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
  <SimpleTooltip content={tool.label}>
    <Button
      variant={isActive ? "default" : "ghost"}
      size="sm"
      onClick={onClick}
      className={`p-2 ${isActive ? 'bg-company-dark-blue text-company-dark-blue-foreground hover:bg-company-dark-blue/90' : ''}`}
    >
      <tool.icon className="w-4 h-4" />
    </Button>
  </SimpleTooltip>
);

/**
 * Renders a color button for the color palette
 */
const ColorButton: React.FC<{
  color: string;
  isSelected: boolean;
  onClick: () => void;
}> = ({ color, isSelected, onClick }) => (
  <SimpleTooltip content={`Select color: ${color}`}>
    <button
      className={`w-6 h-6 rounded border-2 transition-all flex-shrink-0 ${
        isSelected 
          ? 'border-company-dark-blue scale-110' 
          : 'border-border hover:border-muted-foreground/50'
      }`}
      style={{ backgroundColor: color }}
      onClick={onClick}
    />
  </SimpleTooltip>
);

/**
 * Renders action buttons (undo, redo, clear canvas) using the undo/redo hook
 */
const ActionButtons: React.FC = () => {
  const { userId } = useUser();
  const { undo, redo, canUndo, canRedo } = useUndoRedo();
  const { clearCanvas } = useWhiteboardStore();
  
  const handleUndo = () => {
    
    undo(userId);
  };
  
  const handleRedo = () => {
    
    redo(userId);
  };

  const handleScreenshot = async () => {
    try {
      const canvas = document.getElementById('whiteboard-canvas') as HTMLCanvasElement | null;
      if (!canvas) {
        console.warn('📷 No whiteboard canvas found for screenshot');
        return;
      }

      // Compose onto an offscreen canvas with the same pixel dimensions
      const off = document.createElement('canvas');
      off.width = canvas.width;
      off.height = canvas.height;
      const ctx = off.getContext('2d');
      if (!ctx) return;

      // Use the computed background color of the visible canvas (matches theme/whiteboard)
      const computed = getComputedStyle(canvas);
      let bg = computed.backgroundColor || '#ffffff';
      if (/rgba\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0\s*\)/i.test(bg) || bg === 'transparent') {
        bg = '#ffffff';
      }
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, off.width, off.height);

      // Draw the current whiteboard bitmap on top
      ctx.drawImage(canvas, 0, 0);

      const dataUrl = off.toDataURL('image/png');

      // Filename with local date-time (YYYY-MM-DD_HH-mm-ss)
      const d = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const filename = `whiteboard-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}.png`;

      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename;
      a.click();
    } catch (err) {
      console.error('📷 Screenshot failed', err);
    }
  };
  const handleClearCanvas = () => {
    
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
      <SimpleTooltip content="Undo (Ctrl+Z)">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleUndo}
          disabled={!canUndo(userId)}
        >
          <Undo className="w-4 h-4" />
        </Button>
      </SimpleTooltip>
      <SimpleTooltip content="Redo (Ctrl+Y)">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleRedo}
          disabled={!canRedo(userId)}
        >
          <Redo className="w-4 h-4" />
        </Button>
      </SimpleTooltip>
      <SimpleTooltip content="Screenshot">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleScreenshot}
        >
          <Camera className="w-4 h-4" />
        </Button>
      </SimpleTooltip>
      <SimpleTooltip content="Clear Canvas">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleClearCanvas}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </SimpleTooltip>
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
    setPaletteCustomColor,
    colorPalettes,
    setActiveColorPalette,
    lastUsedShapeTool
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
  
  // Show last used shape when not actively using a shape tool
  const displayedShape = selectedShape || SHAPE_TOOLS.find(shape => shape.id === lastUsedShapeTool);
  const shouldHighlightShapeButton = isShapeSelected;

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
        <div className="min-h-16 flex items-center px-4 gap-1 w-max">
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
          <div className="flex items-center gap-1 flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={shouldHighlightShapeButton ? "default" : "ghost"}
                  size="sm"
                  className={`p-2 gap-1 ${shouldHighlightShapeButton ? 'bg-company-dark-blue text-company-dark-blue-foreground hover:bg-company-dark-blue/90' : ''}`}
                  title="Shape"
                >
                  {displayedShape ? (
                    <displayedShape.icon className="w-4 h-4" />
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
          <div className="flex items-center gap-1 flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`p-2 gap-1 text-sm font-medium ${isMobile ? 'px-2' : ''}`}
                  title="Select color palette"
                >
                  <span className={isMobile ? 'hidden' : ''}>Colors</span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-popover">
                {Object.entries(colorPalettes).map(([paletteName, palette]) => (
                  <DropdownMenuItem
                    key={paletteName}
                    onClick={() => setActiveColorPalette(paletteName as 'basic' | 'vibrant' | 'pastel' | 'professional')}
                    className="flex items-center gap-3 cursor-pointer pr-8"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <span className="capitalize">{paletteName}</span>
                      <div className="flex gap-0.5">
                        {palette.slice(0, 6).map((color, index) => (
                          <div
                            key={index}
                            className="w-3 h-3 rounded-full border border-border/20"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                    {activeColorPalette === paletteName && (
                      <span className="ml-auto">✓</span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="flex gap-1 items-center">
              {allColors.map((color, index) => {
                const isCustomColor = index === customColorIndex;
                
                if (isCustomColor) {
                  const isRainbow = color === 'rainbow-gradient';
                  const hasCustomColor = !isRainbow; // Show dot if user has set a custom color
                   
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
                        onClick={() => {
                          if (isRainbow) {
                            // If still rainbow, open picker on first click
                            colorPickerRef.current?.click();
                          } else {
                            // If custom color is set, select it
                            handleColorSelect(color);
                          }
                        }}
                        
                      />
                      
                      {/* Rainbow dot indicator when custom color is set - clickable to open picker */}
                      {hasCustomColor && (
                        <button
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-background flex items-center justify-center hover:scale-110 transition-transform duration-200 cursor-pointer"
                          style={{
                            background: 'linear-gradient(45deg, #ff0000, #ff8800, #ffff00, #88ff00, #00ff88, #0088ff, #8800ff, #ff0088)'
                          }}
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent triggering the main button
                            colorPickerRef.current?.click();
                          }}
                          
                        >
                          <div className="w-1.5 h-1.5 bg-white rounded-full" />
                        </button>
                      )}
                      
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
