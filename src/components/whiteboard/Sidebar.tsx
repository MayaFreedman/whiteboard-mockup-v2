
import React from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '../ui/sidebar';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { ShapePropertiesPanel } from './ShapePropertiesPanel';
import { TextPropertiesPanel } from './TextPropertiesPanel';
import { Palette, Square, Type } from 'lucide-react';

export function WhiteboardSidebar() {
  const { selectedObjectIds, objects } = useWhiteboardStore();
  
  // Check if we have text objects selected
  const hasTextSelected = selectedObjectIds.some(id => {
    const obj = objects[id];
    return obj && obj.type === 'text';
  });
  
  // Check if we have shape objects selected
  const hasShapeSelected = selectedObjectIds.some(id => {
    const obj = objects[id];
    return obj && obj.type !== 'text' && obj.type !== 'path';
  });

  // Get the first selected object ID for panels that need a single ID
  const firstSelectedId = selectedObjectIds[0];

  return (
    <Sidebar side="left" className="w-80 border-r">
      <SidebarHeader>
        <h2 className="px-4 py-2 text-lg font-semibold">Properties</h2>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {hasTextSelected && (
            <SidebarMenuItem>
              <SidebarMenuButton className="w-full justify-start p-0">
                <div className="flex items-center gap-2 px-4 py-2">
                  <Type className="h-4 w-4" />
                  <span>Text Properties</span>
                </div>
              </SidebarMenuButton>
              <div className="px-2">
                <TextPropertiesPanel selectedObjectIds={selectedObjectIds} />
              </div>
            </SidebarMenuItem>
          )}
          
          {hasShapeSelected && (
            <SidebarMenuItem>
              <SidebarMenuButton className="w-full justify-start p-0">
                <div className="flex items-center gap-2 px-4 py-2">
                  <Square className="h-4 w-4" />
                  <span>Shape Properties</span>
                </div>
              </SidebarMenuButton>
              <div className="px-2">
                <ShapePropertiesPanel selectedObjectId={firstSelectedId} />
              </div>
            </SidebarMenuItem>
          )}
          
          {selectedObjectIds.length === 0 && (
            <SidebarMenuItem>
              <div className="px-4 py-8 text-center text-muted-foreground">
                <Palette className="mx-auto h-8 w-8 mb-2" />
                <p>Select an object to view its properties</p>
              </div>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
