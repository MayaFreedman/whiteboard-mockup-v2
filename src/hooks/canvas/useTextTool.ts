
import { useCallback, useState } from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useToolStore } from '../../stores/toolStore';
import { useUser } from '../../contexts/UserContext';
import { WhiteboardObject } from '../../types/whiteboard';

export const useTextTool = () => {
  const whiteboardStore = useWhiteboardStore();
  const toolStore = useToolStore();
  const { userId } = useUser();
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  const createTextObject = useCallback((x: number, y: number): string => {
    const textObject: Omit<WhiteboardObject, 'id' | 'createdAt' | 'updatedAt'> = {
      type: 'text',
      x,
      y,
      width: 100,
      height: 20,
      stroke: toolStore.toolSettings.strokeColor,
      fill: 'transparent',
      opacity: toolStore.toolSettings.opacity || 1,
      data: {
        content: 'Type here...',
        fontSize: toolStore.toolSettings.fontSize || 16,
        fontFamily: toolStore.toolSettings.fontFamily || 'Arial',
        fontWeight: toolStore.toolSettings.fontWeight || 'normal',
      }
    };

    const objectId = whiteboardStore.addObject(textObject, userId);
    console.log('📝 Created text object:', objectId.slice(0, 8), 'for user:', userId.slice(0, 8));
    return objectId;
  }, [whiteboardStore, toolStore.toolSettings, userId]);

  const startTextEditing = useCallback((objectId: string) => {
    setEditingTextId(objectId);
    whiteboardStore.selectObjects([objectId], userId);
    console.log('📝 Started editing text:', objectId.slice(0, 8));
  }, [whiteboardStore, userId]);

  const updateTextContent = useCallback((objectId: string, content: string) => {
    const textObject = whiteboardStore.objects[objectId];
    if (!textObject) return;

    // Calculate approximate text dimensions
    const fontSize = textObject.data?.fontSize || 16;
    const lines = content.split('\n').length;
    const longestLine = Math.max(...content.split('\n').map(line => line.length));
    const width = Math.max(100, longestLine * fontSize * 0.6);
    const height = Math.max(20, lines * fontSize * 1.2);

    whiteboardStore.updateObject(objectId, {
      data: {
        ...textObject.data,
        content
      },
      width,
      height
    }, userId);

    console.log('📝 Updated text content:', objectId.slice(0, 8), content.slice(0, 20));
  }, [whiteboardStore, userId]);

  const endTextEditing = useCallback((objectId: string, finalContent: string) => {
    updateTextContent(objectId, finalContent);
    setEditingTextId(null);
    console.log('📝 Ended editing text:', objectId.slice(0, 8));
  }, [updateTextContent]);

  const cancelTextEditing = useCallback(() => {
    setEditingTextId(null);
    console.log('📝 Cancelled text editing');
  }, []);

  const handleTextClick = useCallback((coords: { x: number; y: number }) => {
    const objectId = createTextObject(coords.x, coords.y);
    startTextEditing(objectId);
  }, [createTextObject, startTextEditing]);

  const handleTextDoubleClick = useCallback((objectId: string) => {
    startTextEditing(objectId);
  }, [startTextEditing]);

  return {
    editingTextId,
    createTextObject,
    startTextEditing,
    updateTextContent,
    endTextEditing,
    cancelTextEditing,
    handleTextClick,
    handleTextDoubleClick
  };
};
