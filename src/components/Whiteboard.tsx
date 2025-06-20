
import React from 'react';
import { Toolbar } from './whiteboard/Toolbar';
import { Canvas } from './whiteboard/Canvas';
import { WhiteboardSidebar } from './whiteboard/Sidebar';
import { SidebarProvider, SidebarInset } from './ui/sidebar';
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
        
        {/* Left Sidebar */}
        <WhiteboardSidebar />
        
        {/* Main Content Area */}
        <SidebarInset className="flex flex-col flex-1">
          {/* Top Toolbar */}
          <Toolbar />
          
          {/* Canvas Area */}
          <div className="flex-1 overflow-hidden">
            <Canvas />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};
