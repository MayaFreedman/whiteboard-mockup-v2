
import React from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from '../ui/sidebar';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { ShapePropertiesPanel } from './ShapePropertiesPanel';
import { TextPropertiesPanel } from './TextPropertiesPanel';
import { Palette } from 'lucide-react';

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
      <SidebarContent className="p-4">
        <SidebarMenu>
          {hasTextSelected && (
            <SidebarMenuItem>
              <TextPropertiesPanel selectedObjectId={firstSelectedId} />
            </SidebarMenuItem>
          )}
          
          {hasShapeSelected && (
            <SidebarMenuItem>
              <ShapePropertiesPanel selectedObjectId={firstSelectedId} />
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
