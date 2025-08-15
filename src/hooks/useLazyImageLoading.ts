import { useState, useCallback, useRef, useEffect } from 'react';
import { loadProgressiveImage } from '../utils/progressiveLoader';

interface UseLazyImageLoadingOptions {
  items: string[];
  rootMargin?: string;
  threshold?: number;
}

export const useLazyImageLoading = ({ 
  items, 
  rootMargin = '50px', 
  threshold = 0.1 
}: UseLazyImageLoadingOptions) => {
  const [visibleItems, setVisibleItems] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementRefs = useRef<Map<string, Element>>(new Map());
  
  // Initialize intersection observer
  useEffect(() => {
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const url = entry.target.getAttribute('data-image-url');
            if (!url) return;
            
            if (entry.isIntersecting) {
              setVisibleItems(prev => {
                const newSet = new Set(prev);
                newSet.add(url);
                return newSet;
              });
              
              // Start loading the image progressively
              loadProgressiveImage(url).catch(console.error);
            }
          });
        },
        {
          rootMargin,
          threshold
        }
      );
    }
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [rootMargin, threshold]);
  
  // Function to observe an element
  const observeElement = useCallback((element: Element, url: string) => {
    if (!observerRef.current) return;
    
    // Store the URL as a data attribute for the observer callback
    element.setAttribute('data-image-url', url);
    
    // Clean up previous observation for this URL
    const existingElement = elementRefs.current.get(url);
    if (existingElement && existingElement !== element) {
      observerRef.current.unobserve(existingElement);
    }
    
    // Store and observe the new element
    elementRefs.current.set(url, element);
    observerRef.current.observe(element);
  }, []);
  
  // Track if initial batch has been processed to prevent re-processing
  const processedItemsRef = useRef<string>('');
  
  // Preload first visible items immediately for instant feedback
  useEffect(() => {
    const itemsKey = items.join(',');
    if (processedItemsRef.current === itemsKey) return; // Prevent duplicate processing
    
    processedItemsRef.current = itemsKey;
    const firstBatch = items.slice(0, 8); // Load first 8 items immediately
    
    setVisibleItems(prev => {
      const newSet = new Set(prev);
      let hasChanges = false;
      
      firstBatch.forEach(url => {
        if (!newSet.has(url)) {
          newSet.add(url);
          hasChanges = true;
          loadProgressiveImage(url).catch(console.error);
        }
      });
      
      return hasChanges ? newSet : prev;
    });
  }, [items]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      elementRefs.current.clear();
    };
  }, []);
  
  return {
    visibleItems,
    observeElement
  };
};