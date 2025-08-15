import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Button } from '../../ui/button';
import { Upload, X } from 'lucide-react';
import { Skeleton } from '../../ui/skeleton';
import { removeCustomStamp } from '../../../utils/customStamps';
import { toast } from 'sonner';
import { useLazyImageLoading } from '../../../hooks/useLazyImageLoading';
import { StampGridItem } from './StampGridItem';
interface GridSelectorProps {
  label: string;
  items: Array<{
    name: string;
    url: string;
    preview: string;
  }>;
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

  // Memoize windowed items to prevent unnecessary re-renders
  const windowedItems = useMemo(() => {
    const itemsToShow = windowSize ? items.slice(0, currentWindowEnd) : items;
    return itemsToShow;
  }, [items, currentWindowEnd, windowSize]);

  // Memoize the URL array to prevent infinite loops in useLazyImageLoading
  const itemUrls = useMemo(() => 
    windowedItems.map(item => item.url), 
    [windowedItems]
  );

  // Use lazy loading hook with intersection observer
  const {
    visibleItems,
    observeElement
  } = useLazyImageLoading({
    items: itemUrls,
    rootMargin: '100px' // Load images 100px before they become visible
  });

  // Handle scroll to load more items
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (!windowSize || !batchSize) return;
    const {
      scrollTop,
      scrollHeight,
      clientHeight
    } = e.currentTarget;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;
    if (isNearBottom && currentWindowEnd < items.length) {
      setCurrentWindowEnd(prev => Math.min(prev + batchSize, items.length));
    }
  }, [windowSize, batchSize, currentWindowEnd, items.length]);

  // Reset window when items change
  useEffect(() => {
    setCurrentWindowEnd(windowSize || items.length);
  }, [items, windowSize]);

  // When the items set changes (e.g., switching categories or new search),
  // reset the scroll position to the top so the new list starts at the beginning
  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.scrollTop = 0;
    }
  }, [items]);

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
  return <div>
      
      <div ref={containerRef} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-3 max-h-[400px] overflow-y-auto pr-1 pt-2 pb-2 pr-2 pl-0" onScroll={handleScroll}>
        {windowedItems.map((item, index) => {
        const shouldLoad = visibleItems.has(item.url);
        const isLoaded = loadedImages.has(item.url);
        const isCustomStamp = item.url.startsWith('data:');
        return <div 
          key={`stamp-${index}-${item.url.substring(0, 50)}`} 
          className="relative" 
          ref={useCallback((el: HTMLDivElement | null) => {
            if (el) {
              observeElement(el, item.url);
            }
          }, [item.url, observeElement])}
        >
              <StampGridItem item={item} isSelected={selectedValue === item.url} onSelect={onChange} onImageLoad={() => handleImageLoaded(item.url)} />
              
              {/* Delete button for custom stamps */}
              {isCustomStamp && <button onClick={e => handleDeleteCustomStamp(e, item.url)} className="absolute -top-1 -right-1 w-5 h-5 bg-gray-500 text-white rounded-full flex items-center justify-center z-20 hover:bg-gray-600 shadow-md" title="Delete custom stamp">
                  <X className="w-3 h-3" />
                </button>}
            </div>;
      })}
        
        {/* Show loading indicator when more items are available */}
        {windowSize && currentWindowEnd < items.length && <div className="col-span-full flex justify-center py-4">
            <div className="text-sm text-muted-foreground">...</div>
          </div>}
      </div>
      {showUpload && <div className="mt-3">
          {/* Custom upload component will be added here */}
        </div>}
    </div>;
};