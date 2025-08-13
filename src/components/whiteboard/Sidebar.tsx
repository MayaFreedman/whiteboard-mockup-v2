import React from 'react';
import { ScrollArea } from '../ui/scroll-area';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '../ui/button';
import { Sidebar as UISidebar, SidebarContent, SidebarHeader, useSidebar } from '../ui/sidebar';
import { DynamicToolSettings } from './settings/DynamicToolSettings';
export const WhiteboardSidebar: React.FC = () => {
  const { open, toggleSidebar } = useSidebar();
  return <>
      <UISidebar side="left" className="border-r w-96 h-auto" collapsible="offcanvas" style={{
      transform: open ? 'translateX(0)' : 'translateX(-100%)',
      transition: 'transform 0.2s ease-linear',
      marginTop: 'var(--toolbar-height, 0px)',
      height: 'auto',
      maxHeight: 'calc(100vh - var(--toolbar-height, 64px))',
      position: 'fixed'
    }}>
        <SidebarContent className="p-4">
          <DynamicToolSettings />
        </SidebarContent>
      </UISidebar>

      {/* Collapsed state button positioned just below toolbar */}
      {!open && <button onClick={toggleSidebar} className="fixed z-50 bg-background/95 backdrop-blur-sm text-company-dark-blue hover:text-company-light-pink hover:bg-company-light-pink/5 transition-all duration-200 flex items-center gap-2 px-3 py-2 rounded-r-md cursor-pointer shadow-md hover:shadow-lg border-0 outline-none border-l-2 border-l-company-light-pink/30 hover:border-l-company-light-pink/60" style={{
      left: '0',
      top: 'calc(var(--toolbar-height, 64px) + 1px)'
    }}>
          <ChevronsRight className="h-4 w-4" />
          <span className="text-sm font-medium">Open sidebar</span>
        </button>}
    </>;
};