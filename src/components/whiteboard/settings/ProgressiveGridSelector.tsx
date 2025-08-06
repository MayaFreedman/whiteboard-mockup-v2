import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Button } from '../../ui/button';
import { Upload, X } from 'lucide-react';
import { Skeleton } from '../../ui/skeleton';
import { removeCustomStamp } from '../../../utils/customStamps';
import { toast } from 'sonner';
import { useLazyImageLoading } from '../../../hooks/useLazyImageLoading';

interface GridSelectorProps {
  label: string;
  items: Array<{ name: string; url: string; preview: string }>;
  selectedValue: string;
  onChange: (value: string) => void;
  showUpload?: boolean;
  onCustomStampDeleted?: () => void;
  windowSize?: number;
  batchSize?: number;
}

export const ProgressiveGridSelector: React.FC<GridSelectorProps> = ({
  label,
  items,
  selectedValue,
  onChange,
  showUpload = false,
  onCustomStampDeleted,
  windowSize,
  batchSize
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [currentWindowEnd, setCurrentWindowEnd] = useState<number>(windowSize || items.length);
  
  // Use lazy loading hook with intersection observer
  const { visibleItems, observeElement } = useLazyImageLoading({
    items: items.map(item => item.url),
    rootMargin: '100px' // Load images 100px before they become visible
  });
  
  // Memoize windowed items to prevent unnecessary re-renders
  const windowedItems = useMemo(() => {
    const itemsToShow = windowSize ? items.slice(0, currentWindowEnd) : items;
    return itemsToShow;
  }, [items, currentWindowEnd, windowSize]);
  
  // Handle scroll to load more items
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (!windowSize || !batchSize) return;
    
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;
    
    if (isNearBottom && currentWindowEnd < items.length) {
      setCurrentWindowEnd(prev => Math.min(prev + batchSize, items.length));
    }
  }, [windowSize, batchSize, currentWindowEnd, items.length]);
  
  // Reset window when items change
  useEffect(() => {
    setCurrentWindowEnd(windowSize || items.length);
  }, [items, windowSize]);
  
  // Handle image load complete
  const handleImageLoaded = useCallback((url: string) => {
    setLoadedImages(prev => new Set(prev).add(url));
  }, []);
  
  // Handle custom stamp deletion
  const handleDeleteCustomStamp = useCallback(async (e: React.MouseEvent, stampUrl: string) => {
    e.stopPropagation();
    
    if (!stampUrl.startsWith('data:')) return;
    
    try {
      await removeCustomStamp(stampUrl);
      toast.success('Custom stamp deleted');
      onCustomStampDeleted?.();
    } catch (error) {
      toast.error('Failed to delete stamp');
    }
  }, [onCustomStampDeleted]);
  
  // Handle image load error
  const handleImageError = useCallback((url: string) => {
    console.warn('Failed to load progressive image:', url);
  }, []);

  return (
    <div>
      <label className="text-sm font-medium mb-3 block">{label}</label>
      <div 
        ref={containerRef}
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-3 max-h-[400px] overflow-y-auto pr-1 pt-2 pb-2 pr-2 pl-0"
        onScroll={handleScroll}
      >
        {windowedItems.map((item, index) => {
          const shouldLoad = visibleItems.has(item.url);
          const isLoaded = loadedImages.has(item.url);
          const isCustomStamp = item.url.startsWith('data:');
          
          return (
            <div 
              key={`stamp-${index}-${item.url.substring(0, 50)}`} 
              className="relative"
              ref={(el) => {
                if (el) {
                  observeElement(el, item.url);
                }
              }}
            >
              <button
                className={`relative w-full h-20 rounded border-2 transition-colors overflow-hidden flex items-center justify-center ${
                  selectedValue === item.url
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-border hover:border-primary'
                }`}
                onClick={() => onChange(item.url)}
                title={item.name}
              >
                {/* Show skeleton if image should load but hasn't loaded yet */}
                {shouldLoad && !isLoaded && (
                  <Skeleton className="w-full h-full absolute inset-0" />
                )}
                
                {/* Only render image if it should be loaded */}
                {shouldLoad && (
                  <img 
                    src={item.preview} 
                    alt={item.name}
                    className={`w-full h-full object-contain p-2 transition-opacity duration-200 ${
                      isLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
                    onLoad={() => handleImageLoaded(item.url)}
                    onError={() => handleImageError(item.url)}
                    loading="lazy"
                  />
                )}
                
                {/* Placeholder for items not yet visible */}
                {!shouldLoad && (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <div className="w-8 h-8 bg-muted-foreground/20 rounded animate-pulse" />
                  </div>
                )}
              </button>
              
              {/* Delete button for custom stamps */}
              {isCustomStamp && (
                <button
                  onClick={(e) => handleDeleteCustomStamp(e, item.url)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-gray-500 text-white rounded-full flex items-center justify-center z-20 hover:bg-gray-600 shadow-md"
                  title="Delete custom stamp"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
        
        {/* Show loading indicator when more items are available */}
        {windowSize && currentWindowEnd < items.length && (
          <div className="col-span-full flex justify-center py-4">
            <div className="text-sm text-muted-foreground">
              Showing {currentWindowEnd} of {items.length} items • Scroll for more
            </div>
          </div>
        )}
      </div>
      {showUpload && (
        <div className="mt-3">
          {/* Custom upload component will be added here */}
        </div>
      )}
    </div>
  );
};