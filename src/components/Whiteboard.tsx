
import React from 'react';
import { Toolbar } from './whiteboard/Toolbar';
import { Canvas } from './whiteboard/Canvas';
import { WhiteboardSidebar } from './whiteboard/Sidebar';
import { SidebarProvider, SidebarInset } from './ui/sidebar';

export const Whiteboard: React.FC = () => {
  return (
    <SidebarProvider>
      <div className="h-screen flex flex-col bg-background w-full">
        {/* Top Toolbar */}
        <Toolbar />
        
        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Left Sidebar - positioned to start below toolbar */}
          <div className="absolute top-0 left-0 z-10 h-full pt-0">
            <WhiteboardSidebar />
          </div>
          
          {/* Canvas Area */}
          <SidebarInset className="w-full">
            <Canvas />
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
};
