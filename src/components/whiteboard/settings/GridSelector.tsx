
import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/button';
import { Upload } from 'lucide-react';
import { Skeleton } from '../../ui/skeleton';

interface GridSelectorProps {
  label: string;
  items: Array<{ name: string; url: string; preview: string }>;
  selectedValue: string;
  onChange: (value: string) => void;
  showUpload?: boolean;
}

export const GridSelector: React.FC<GridSelectorProps> = ({
  label,
  items,
  selectedValue,
  onChange,
  showUpload = false
}) => {
  const [imageLoading, setImageLoading] = useState<Record<string, boolean>>({});
  
  // Initialize loading state for all items
  useEffect(() => {
    const initialLoadingState: Record<string, boolean> = {};
    items.forEach(item => {
      initialLoadingState[item.url] = true;
    });
    setImageLoading(initialLoadingState);
  }, [items]);
  
  // Handle image load complete
  const handleImageLoaded = (url: string) => {
    setImageLoading(prev => ({
      ...prev,
      [url]: false
    }));
  };

  return (
    <div>
      <label className="text-sm font-medium mb-3 block">{label}</label>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-3 max-h-[400px] overflow-y-auto pr-1">
        {items.map((item) => (
          <button
            key={item.name}
            className={`relative w-full h-20 rounded border-2 transition-colors overflow-hidden group flex items-center justify-center ${
              selectedValue === item.url
                ? 'border-primary ring-2 ring-primary/20'
                : 'border-border hover:border-primary'
            }`}
            onClick={() => onChange(item.url)}
            title={item.name}
          >
            {/* Check if it's an emoji character or an image path */}
            {item.preview.length <= 4 && !item.preview.endsWith('.svg') ? (
              <span className="text-3xl">{item.preview}</span>
            ) : (
              <>
                {imageLoading[item.url] && (
                  <Skeleton className="w-full h-full absolute inset-0" />
                )}
                <img 
                  src={item.preview} 
                  alt={item.name}
                  className={`w-full h-full object-contain p-2 ${imageLoading[item.url] ? 'opacity-0' : 'opacity-100'}`}
                  onLoad={() => handleImageLoaded(item.url)}
                  onError={() => handleImageLoaded(item.url)}
                />
              </>
            )}
          </button>
        ))}
      </div>
      {showUpload && (
        <Button variant="outline" size="sm" className="w-full gap-2">
          <Upload className="w-4 h-4" />
          Upload Custom Sticker
        </Button>
      )}
    </div>
  );
};
