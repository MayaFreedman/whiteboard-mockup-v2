
import React, { useEffect, useState } from 'react';
import { Toolbar } from './whiteboard/Toolbar';
import { Canvas } from './whiteboard/Canvas';
import { WhiteboardSidebar } from './whiteboard/Sidebar';
import { SidebarProvider, SidebarInset } from './ui/sidebar';
import { ConnectionStatus } from './ConnectionStatus';
import { InitialStateLoader } from './InitialStateLoader';
import { useMultiplayerSync } from '../hooks/useMultiplayerSync';

/**
 * Main whiteboard application component
 * Orchestrates the layout and provides the sidebar context
 */
export const Whiteboard: React.FC = () => {
  // Initialize multiplayer sync and get loading state
  const { isWaitingForInitialState } = useMultiplayerSync();
  const [showReloadPrompt, setShowReloadPrompt] = useState(false);

  // Show reload prompt after 10 seconds of waiting
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    if (isWaitingForInitialState) {
      timeout = setTimeout(() => {
        setShowReloadPrompt(true);
      }, 10000); // 10 seconds
    } else {
      setShowReloadPrompt(false);
    }

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [isWaitingForInitialState]);

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <SidebarProvider>
      <div className="h-screen flex flex-col bg-background w-full">
        {/* Connection Status - Fixed overlay */}
        <ConnectionStatus />
        
        {/* Top Toolbar - Fixed at the top */}
        <Toolbar />
        
        {/* Main Content Area - Flexible layout with sidebar and canvas */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Initial State Loading Overlay */}
          {isWaitingForInitialState && (
            <InitialStateLoader 
              onReload={handleReload}
              showReloadButton={showReloadPrompt}
            />
          )}
          
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
