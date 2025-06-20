
import React, { useState, useEffect, useRef } from 'react';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { useToolStore } from '../../stores/toolStore';
import { useUser } from '../../contexts/UserContext';

interface TextEditorProps {
  objectId: string;
  onComplete: (content: string) => void;
  onCancel: () => void;
}

export const TextEditor: React.FC<TextEditorProps> = ({ objectId, onComplete, onCancel }) => {
  const { objects } = useWhiteboardStore();
  const { toolSettings } = useToolStore();
  const { userId } = useUser();
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const textObject = objects[objectId];

  useEffect(() => {
    if (textObject?.data?.content) {
      setContent(textObject.data.content);
    }
  }, [textObject]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onComplete(content);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const handleBlur = () => {
    onComplete(content);
  };

  if (!textObject) return null;

  return (
    <div
      className="absolute z-50"
      style={{
        left: textObject.x,
        top: textObject.y,
        minWidth: '100px',
      }}
    >
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="bg-transparent border-2 border-blue-500 outline-none resize-none overflow-hidden"
        style={{
          color: textObject.stroke || toolSettings.strokeColor,
          fontSize: `${toolSettings.fontSize || 16}px`,
          fontFamily: toolSettings.fontFamily || 'Arial',
          fontWeight: toolSettings.fontWeight || 'normal',
          minHeight: '20px',
        }}
        rows={1}
        placeholder="Type here..."
      />
    </div>
  );
};
