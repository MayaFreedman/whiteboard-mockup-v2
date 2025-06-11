
import React from 'react';
import { Toolbar } from './whiteboard/Toolbar';
import { Canvas } from './whiteboard/Canvas';
import { Sidebar } from './whiteboard/Sidebar';

export const Whiteboard: React.FC = () => {
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Toolbar */}
      <Toolbar />
      
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar />
        
        {/* Canvas Area */}
        <div className="flex-1 relative">
          <Canvas />
        </div>
      </div>
    </div>
  );
};
