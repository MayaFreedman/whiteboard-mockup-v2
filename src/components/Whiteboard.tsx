
import React from 'react';
import { Toolbar } from './whiteboard/Toolbar';
import { Canvas } from './whiteboard/Canvas';
import { WhiteboardSidebar } from './whiteboard/Sidebar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from './ui/sidebar';
import { ConnectionStatus } from './ConnectionStatus';
import { useMultiplayerSync } from '../hooks/useMultiplayerSync';

/**
 * Main whiteboard application component
 * Orchestrates the layout and provides the sidebar context
 */
export const Whiteboard: React.FC = () => {
  // Initialize multiplayer sync
  useMultiplayerSync();

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full bg-background">
        {/* Connection Status - Fixed overlay */}
        <ConnectionStatus />
        
        {/* Left Sidebar - Managed by SidebarProvider */}
        <WhiteboardSidebar />
        
        {/* Main Content Area - Canvas and Toolbar */}
        <SidebarInset className="flex flex-col flex-1">
          {/* Top Toolbar - Fixed at the top with sidebar trigger */}
          <div className="flex items-center gap-2 border-b border-border bg-card px-4 py-2">
            <SidebarTrigger />
            <div className="flex-1">
              <Toolbar />
            </div>
          </div>
          
          {/* Canvas Area - Takes remaining space */}
          <div className="flex-1 overflow-hidden">
            <Canvas />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};
