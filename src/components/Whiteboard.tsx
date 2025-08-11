
import React, { useEffect, useState } from 'react';
import { Toolbar } from './whiteboard/Toolbar';
import { Canvas } from './whiteboard/Canvas';
import { WhiteboardSidebar } from './whiteboard/Sidebar';
import { SidebarProvider, SidebarInset } from './ui/sidebar';
import { ConnectionStatus } from './ConnectionStatus';
import { InitialStateLoader } from './InitialStateLoader';
import { useMultiplayerSync } from '../hooks/useMultiplayerSync';
import { useScreenSizeStore } from '../stores/screenSizeStore';
import { DEV_MODE } from '../config/devMode';

/**
 * Main whiteboard application component
 * Orchestrates the layout and provides the sidebar context
 */
export const Whiteboard: React.FC = () => {
  // Initialize multiplayer sync and get loading state
  const { isWaitingForInitialState } = useMultiplayerSync();
  const { activeWhiteboardSize } = useScreenSizeStore();
  const [showLoader, setShowLoader] = useState(false);

  // Show loader only when actually waiting for initial state from other users
  useEffect(() => {
    setShowLoader(isWaitingForInitialState);
  }, [isWaitingForInitialState]);

  return (
    <SidebarProvider>
      <div className="h-screen flex flex-col bg-background w-full">
        {/* Connection Status - Fixed overlay */}
        {DEV_MODE && <ConnectionStatus />}
        
        {/* Top Toolbar - Fixed at the top */}
        <Toolbar />
        
        {/* Main Content Area - Flexible layout with sidebar and canvas */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Initial State Loading Overlay - shorter duration */}
          {showLoader && (
            <InitialStateLoader />
          )}
          
          {/* Left Sidebar - Positioned absolute to overlay content */}
          <div className="absolute top-0 left-0 z-10 h-full pt-0">
            <WhiteboardSidebar />
          </div>
          
          {/* Canvas Area - Takes remaining space */}
          <SidebarInset className="w-full h-full m-0 p-0" style={{ minHeight: 'auto' }}>
            <Canvas />
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
};
