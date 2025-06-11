
import React, { useState, useEffect } from 'react';
import { useWhiteboardStore } from '../stores/whiteboardStore';
import { useToolStore } from '../stores/toolStore';
import { Button } from './ui/button';
import { Eye, EyeOff, Layers, Settings, Search } from 'lucide-react';
import { cn } from '../lib/utils';
import { WhiteboardStatePanel } from './dev-tools/WhiteboardStatePanel';
import { ToolStatePanel } from './dev-tools/ToolStatePanel';
import { ActionHistoryPanel } from './dev-tools/ActionHistoryPanel';
import { StrokeTrackingPanel } from './dev-tools/StrokeTrackingPanel';

interface DevToolsOverlayProps {
  className?: string;
}

export const DevToolsOverlay: React.FC<DevToolsOverlayProps> = ({ className }) => {
  const [isVisible, setIsVisible] = useState(() => {
    return localStorage.getItem('devToolsVisible') === 'true';
  });
  const [activePanel, setActivePanel] = useState<string>('whiteboard');
  const [isMinimized, setIsMinimized] = useState(false);

  // Persist visibility state
  useEffect(() => {
    localStorage.setItem('devToolsVisible', isVisible.toString());
  }, [isVisible]);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isVisible) {
    return (
      <Button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 bg-black/80 hover:bg-black text-white"
        size="icon"
      >
        <Search className="h-4 w-4" />
      </Button>
    );
  }

  const panels = [
    { id: 'whiteboard', label: 'Whiteboard', icon: Layers },
    { id: 'tools', label: 'Tools', icon: Settings },
    { id: 'actions', label: 'Actions', icon: Search },
    { id: 'strokes', label: 'Strokes', icon: Eye },
  ];

  return (
    <div className={cn(
      "fixed top-4 right-4 z-50 bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg",
      "transition-all duration-300",
      isMinimized ? "w-64 h-12" : "w-96 h-[600px]",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="text-sm font-medium flex items-center gap-2">
          <Search className="h-4 w-4" />
          Dev Tools
        </div>
        <div className="flex items-center gap-1">
          <Button
            onClick={() => setIsMinimized(!isMinimized)}
            variant="ghost"
            size="icon"
            className="h-6 w-6"
          >
            {isMinimized ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          </Button>
          <Button
            onClick={() => setIsVisible(false)}
            variant="ghost"
            size="icon"
            className="h-6 w-6"
          >
            ✕
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Tab Navigation */}
          <div className="flex border-b">
            {panels.map((panel) => (
              <button
                key={panel.id}
                onClick={() => setActivePanel(panel.id)}
                className={cn(
                  "flex-1 px-2 py-2 text-xs font-medium transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  activePanel === panel.id
                    ? "bg-accent text-accent-foreground border-b-2 border-primary"
                    : "text-muted-foreground"
                )}
              >
                <panel.icon className="h-3 w-3 mx-auto mb-1" />
                {panel.label}
              </button>
            ))}
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-auto p-3">
            {activePanel === 'whiteboard' && <WhiteboardStatePanel />}
            {activePanel === 'tools' && <ToolStatePanel />}
            {activePanel === 'actions' && <ActionHistoryPanel />}
            {activePanel === 'strokes' && <StrokeTrackingPanel />}
          </div>
        </>
      )}

      {/* Keyboard shortcut hint */}
      <div className="absolute -bottom-6 right-0 text-xs text-muted-foreground">
        Ctrl+D to toggle
      </div>
    </div>
  );
};
