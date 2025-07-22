
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  
  // Memoize items to prevent unnecessary re-initialization
  const memoizedItems = useMemo(() => items, [JSON.stringify(items.map(item => item.url))]);
  
  // Initialize loading state only for new items that haven't been loaded before
  useEffect(() => {
    const newLoadingState: Record<string, boolean> = { ...imageLoading };
    let hasChanges = false;
    
    memoizedItems.forEach(item => {
      // Only set loading to true if we haven't loaded this image before and it's not already tracked
      if (!loadedImages.has(item.url) && !(item.url in imageLoading)) {
        newLoadingState[item.url] = true;
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      setImageLoading(newLoadingState);
    }
  }, [memoizedItems]); // Only depend on memoized items, not imageLoading or loadedImages
  
  // Handle image load complete with caching
  const handleImageLoaded = useCallback((url: string) => {
    setImageLoading(prev => ({
      ...prev,
      [url]: false
    }));
    setLoadedImages(prev => new Set(prev).add(url));
  }, []);
  
  // Handle image load error
  const handleImageError = useCallback((url: string) => {
    console.warn('Failed to load image:', url);
    setImageLoading(prev => ({
      ...prev,
      [url]: false
    }));
  }, []);

  return (
    <div>
      <label className="text-sm font-medium mb-3 block">{label}</label>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-3 max-h-[400px] overflow-y-auto pr-1">
        {memoizedItems.map((item) => {
          const isLoading = imageLoading[item.url] === true;
          const isEmoji = item.preview.length <= 4 && !item.preview.endsWith('.svg');
          
          return (
            <button
              key={item.url}
              className={`relative w-full h-20 rounded border-2 transition-colors overflow-hidden group flex items-center justify-center ${
                selectedValue === item.url
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-border hover:border-primary'
              }`}
              onClick={() => onChange(item.url)}
              title={item.name}
            >
              {isEmoji ? (
                <span className="text-3xl">{item.preview}</span>
              ) : (
                <>
                  {isLoading && (
                    <Skeleton className="w-full h-full absolute inset-0" />
                  )}
                  <img 
                    src={item.preview} 
                    alt={item.name}
                    className={`w-full h-full object-contain p-2 transition-opacity duration-200 ${
                      isLoading ? 'opacity-0' : 'opacity-100'
                    }`}
                    onLoad={() => handleImageLoaded(item.url)}
                    onError={() => handleImageError(item.url)}
                    loading="lazy"
                  />
                </>
              )}
            </button>
          );
        })}
      </div>
      {showUpload && (
        <div className="mt-3">
          {/* Custom upload component will be added here */}
        </div>
      )}
    </div>
  );
};
