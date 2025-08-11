import React from 'react';
import { Button } from '../../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';

interface SkinTonePickerProps {
  baseEmojiPath: string;
  skinToneVariants: string[];
  onSelect: (path: string) => void;
  children: React.ReactNode;
}

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

  // Local component to handle per-option loading state and remove tooltips
  const SkinToneOption: React.FC<{
    option: { tone: string; path: string; label: string };
    onSelect: (path: string) => void;
  }> = ({ option, onSelect }) => {
    const [loaded, setLoaded] = React.useState(false);

    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 rounded-md hover:bg-secondary/80 overflow-hidden"
        onClick={() => onSelect(option.path)}
        aria-label="Select skin tone"
      >
        <div className="relative w-full h-full">
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="h-4 w-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            </div>
          )}
          <img
            src={option.path}
            alt={option.label}
            className={`w-full h-full object-contain ${loaded ? 'opacity-100' : 'opacity-0'}`}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={() => setLoaded(true)}
          />
        </div>
      </Button>
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" side="top">
        <div className="flex flex-col gap-1">
          <div className="flex gap-1">
            {skinToneOptions.map((option) => (
              <SkinToneOption key={option.tone} option={option} onSelect={onSelect} />
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};