
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
  const [isPlaceholder, setIsPlaceholder] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const textObject = objects[objectId];
  const defaultText = 'Type here...';

  useEffect(() => {
    if (textObject?.data?.content) {
      const objectContent = textObject.data.content;
      setContent(objectContent);
      setIsPlaceholder(objectContent === defaultText);
    }
  }, [textObject, defaultText]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      if (isPlaceholder) {
        textareaRef.current.select();
      }
    }
  }, [isPlaceholder]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    
    // If user starts typing and we're showing placeholder, clear it
    if (isPlaceholder && newContent.length > 0) {
      setIsPlaceholder(false);
    }
    
    // If content becomes empty, show placeholder again
    if (newContent.length === 0) {
      setIsPlaceholder(true);
      setContent(defaultText);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const finalContent = isPlaceholder ? '' : content;
      onComplete(finalContent || defaultText);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const handleBlur = () => {
    const finalContent = isPlaceholder ? '' : content;
    onComplete(finalContent || defaultText);
  };

  const handleFocus = () => {
    if (isPlaceholder) {
      setContent('');
      setIsPlaceholder(false);
    }
  };

  if (!textObject) return null;

  return (
    <div
      className="absolute z-50"
      style={{
        left: textObject.x,
        top: textObject.y,
        minWidth: textObject.width || 100,
        minHeight: textObject.height || 20,
      }}
    >
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onFocus={handleFocus}
        className="bg-transparent border-2 border-blue-500 outline-none resize-both overflow-hidden"
        style={{
          color: isPlaceholder ? 'rgba(156, 163, 175, 0.5)' : (textObject.stroke || toolSettings.strokeColor),
          fontSize: `${textObject.data?.fontSize || toolSettings.fontSize || 16}px`,
          fontFamily: textObject.data?.fontFamily || toolSettings.fontFamily || 'Arial',
          fontWeight: textObject.data?.bold ? 'bold' : 'normal',
          fontStyle: textObject.data?.italic ? 'italic' : 'normal',
          textAlign: textObject.data?.alignment || 'left',
          width: textObject.width || 100,
          height: textObject.height || 20,
          minWidth: '100px',
          minHeight: '20px',
        }}
        placeholder=""
      />
    </div>
  );
};
