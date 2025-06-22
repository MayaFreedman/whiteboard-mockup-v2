
import React from 'react';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent } from '../ui/sidebar';
import { useToolStore } from '../../stores/toolStore';
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
      case 'stamp':
        return <StampSelector />;
      
      default:
        return (
          <div className="p-3">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              {activeTool.charAt(0).toUpperCase() + activeTool.slice(1)} Tool
            </h3>
            <p className="text-xs text-gray-500">
              Settings for the {activeTool} tool will appear here.
            </p>
          </div>
        );
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
