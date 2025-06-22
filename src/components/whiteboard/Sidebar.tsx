
import React from 'react';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent } from '../ui/sidebar';
import { useToolStore } from '../../stores/toolStore';
import { ColorSelector } from './ColorSelector';
import { BrushSettings } from './BrushSettings';
import { EraserSettings } from './EraserSettings';
import { ShapeSettings } from './ShapeSettings';
import { TextSettings } from './TextSettings';
import { BackgroundSettings } from './BackgroundSettings';
import { StampSelector } from './StampSelector';

/**
 * Whiteboard sidebar component that shows tool-specific settings
 * Dynamically displays relevant controls based on the active tool
 */
export const WhiteboardSidebar: React.FC = () => {
  const activeTool = useToolStore((state) => state.activeTool);

  /**
   * Determines which settings panel to show based on the active tool
   */
  const renderToolSettings = () => {
    switch (activeTool) {
      case 'pencil':
      case 'brush':
        return (
          <>
            <ColorSelector />
            <BrushSettings />
          </>
        );
      
      case 'eraser':
        return <EraserSettings />;
      
      case 'rectangle':
      case 'circle':
      case 'triangle':
      case 'diamond':
      case 'pentagon':
      case 'hexagon':
      case 'star':
      case 'heart':
        return (
          <>
            <ColorSelector />
            <ShapeSettings />
          </>
        );
      
      case 'text':
        return (
          <>
            <ColorSelector />
            <TextSettings />
          </>
        );

      case 'stamp':
        return <StampSelector />;
      
      case 'fill':
        return <ColorSelector />;
      
      case 'select':
      case 'hand':
      default:
        return <BackgroundSettings />;
    }
  };

  return (
    <Sidebar side="left" className="border-r border-gray-200">
      <SidebarContent className="bg-white">
        <SidebarGroup>
          <SidebarGroupContent className="px-0">
            {renderToolSettings()}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};
