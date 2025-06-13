
import React from 'react';
import { Toolbar } from './whiteboard/Toolbar';
import { Canvas } from './whiteboard/Canvas';
import { WhiteboardSidebar } from './whiteboard/Sidebar';
import { SidebarProvider, SidebarInset } from './ui/sidebar';
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
      <div className="h-screen flex flex-col bg-background w-full">
        {/* Top Toolbar - Fixed at the top */}
        <Toolbar />
        
        {/* Main Content Area - Flexible layout with sidebar and canvas */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Left Sidebar - Positioned absolute to overlay content */}
          <div className="absolute top-0 left-0 z-10 h-full pt-0">
            <WhiteboardSidebar />
          </div>
          
          {/* Canvas Area - Takes remaining space */}
          <SidebarInset className="w-full">
            <Canvas />
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
};
