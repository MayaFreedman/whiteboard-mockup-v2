
import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Settings, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { WhiteboardStatePanel } from './dev-tools/WhiteboardStatePanel';
import { ToolStatePanel } from './dev-tools/ToolStatePanel';
import { ActionHistoryPanel } from './dev-tools/ActionHistoryPanel';
import { StrokeTrackingPanel } from './dev-tools/StrokeTrackingPanel';
import { MultiplayerStatePanel } from './dev-tools/multiplayer/MultiplayerStatePanel';

/**
 * Developer tools overlay component
 * Provides debugging information about the whiteboard state
 */
export const DevToolsOverlay: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50"
        variant="outline"
        size="sm"
      >
        <Settings className="w-4 h-4" />
        Dev Tools
      </Button>
    );
  }

  return (
    <Card className={`fixed bottom-4 right-4 z-50 transition-all duration-200 ${
      isMinimized ? 'w-12 h-12' : 'w-96 h-[600px]'
    }`}>
      <CardContent className="p-0 h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b bg-muted/50">
          <span className={`font-medium ${isMinimized ? 'hidden' : ''}`}>
            Dev Tools
          </span>
          <div className="flex gap-1">
            <Button
              onClick={() => setIsMinimized(!isMinimized)}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
            >
              {isMinimized ? (
                <ChevronLeft className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </Button>
            <Button
              onClick={() => setIsOpen(false)}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Content */}
        {!isMinimized && (
          <Tabs defaultValue="whiteboard" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-5 rounded-none border-b h-9">
              <TabsTrigger value="whiteboard" className="text-xs">State</TabsTrigger>
              <TabsTrigger value="tools" className="text-xs">Tools</TabsTrigger>
              <TabsTrigger value="actions" className="text-xs">Actions</TabsTrigger>
              <TabsTrigger value="strokes" className="text-xs">Strokes</TabsTrigger>
              <TabsTrigger value="multiplayer" className="text-xs">MP</TabsTrigger>
            </TabsList>
            
            <div className="flex-1 overflow-hidden">
              <TabsContent value="whiteboard" className="h-full m-0">
                <ScrollArea className="h-full p-3">
                  <WhiteboardStatePanel />
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="tools" className="h-full m-0">
                <ScrollArea className="h-full p-3">
                  <ToolStatePanel />
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="actions" className="h-full m-0">
                <ScrollArea className="h-full p-3">
                  <ActionHistoryPanel />
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="strokes" className="h-full m-0">
                <ScrollArea className="h-full p-3">
                  <StrokeTrackingPanel />
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="multiplayer" className="h-full m-0">
                <ScrollArea className="h-full p-3">
                  <MultiplayerStatePanel />
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};
