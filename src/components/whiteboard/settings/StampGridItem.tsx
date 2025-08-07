import React from 'react';
import { SkinTonePicker } from './SkinTonePicker';

// Temporary placeholder functions - will be replaced when registry is regenerated
const hasSkinToneVariants = (path: string): boolean => false;
const getSkinToneVariants = (path: string): string[] => [];

interface StampGridItemProps {
  item: {
    name: string;
    url: string;
    preview: string;
  };
  isSelected: boolean;
  onSelect: (path: string) => void;
  onImageLoad?: () => void;
}

export const StampGridItem: React.FC<StampGridItemProps> = ({
  item,
  isSelected,
  onSelect,
  onImageLoad
}) => {
  const hasVariants = hasSkinToneVariants(item.url);
  const skinToneVariants = hasVariants ? getSkinToneVariants(item.url) : [];

  const handleDirectSelect = () => {
    if (!hasVariants) {
      onSelect(item.url);
    }
  };

  const handleSkinToneSelect = (selectedPath: string) => {
    onSelect(selectedPath);
  };

  const ButtonContent = (
    <div
      className={`relative group aspect-square rounded-lg border-2 transition-all duration-200 cursor-pointer hover:border-primary/50 hover:bg-secondary/50 ${
        isSelected 
          ? 'border-primary bg-primary/10 ring-2 ring-primary/20' 
          : 'border-border/20 bg-background/50'
      }`}
      onClick={handleDirectSelect}
    >
      <img
        src={item.url}
        alt={item.name}
        className="w-full h-full object-contain p-1 transition-transform group-hover:scale-110"
        onLoad={onImageLoad}
        loading="lazy"
      />
      {hasVariants && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-background flex items-center justify-center">
          <div className="w-1 h-1 bg-primary-foreground rounded-full" />
        </div>
      )}
    </div>
  );

  if (hasVariants) {
    return (
      <SkinTonePicker
        baseEmojiPath={item.url}
        skinToneVariants={skinToneVariants}
        onSelect={handleSkinToneSelect}
      >
        {ButtonContent}
      </SkinTonePicker>
    );
  }

  return ButtonContent;
};