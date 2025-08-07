import React from 'react';
import { Button } from '../../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';

interface SkinTonePickerProps {
  baseEmojiPath: string;
  skinToneVariants: string[];
  onSelect: (path: string) => void;
  children: React.ReactNode;
}

const SKIN_TONE_COLORS = {
  light: '#F5DEB3',
  'medium-light': '#F5C99B', 
  medium: '#E8B982',
  'medium-dark': '#D29B6E',
  dark: '#A0522D'
};

const SKIN_TONE_LABELS = {
  light: 'Light',
  'medium-light': 'Medium Light',
  medium: 'Medium', 
  'medium-dark': 'Medium Dark',
  dark: 'Dark'
};

export const SkinTonePicker: React.FC<SkinTonePickerProps> = ({
  baseEmojiPath,
  skinToneVariants,
  onSelect,
  children
}) => {
  // Parse skin tone variants to get organized options
  const skinToneOptions = React.useMemo(() => {
    const options = [
      { tone: 'default', path: baseEmojiPath, label: 'Default' }
    ];
    
    skinToneVariants.forEach(variantPath => {
      const filename = variantPath.split('/').pop() || '';
      const match = filename.match(/-1F3F([B-F])/);
      if (match) {
        const toneMap: Record<string, string> = {
          'B': 'light',
          'C': 'medium-light',
          'D': 'medium', 
          'E': 'medium-dark',
          'F': 'dark'
        };
        
        const tone = toneMap[match[1]];
        if (tone) {
          options.push({
            tone,
            path: variantPath,
            label: SKIN_TONE_LABELS[tone as keyof typeof SKIN_TONE_LABELS]
          });
        }
      }
    });
    
    return options;
  }, [baseEmojiPath, skinToneVariants]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" side="top">
        <div className="flex flex-col gap-1">
          <div className="text-xs font-medium text-muted-foreground mb-1">
            Choose skin tone:
          </div>
          <div className="flex gap-1">
            {skinToneOptions.map((option) => (
              <Button
                key={option.tone}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-1 rounded-full hover:bg-secondary/80"
                onClick={() => onSelect(option.path)}
                title={option.label}
              >
                {option.tone === 'default' ? (
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-yellow-200 to-yellow-400 border border-yellow-500/30" />
                ) : (
                  <div 
                    className="w-5 h-5 rounded-full border border-border/30"
                    style={{ 
                      backgroundColor: SKIN_TONE_COLORS[option.tone as keyof typeof SKIN_TONE_COLORS]
                    }}
                  />
                )}
              </Button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};