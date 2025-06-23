import { useRef, useCallback, useEffect } from 'react';

interface UseIntersectionObserverOptions {
  threshold?: number | number[];
  rootMargin?: string;
  root?: Element | null;
  onIntersect?: (entries: IntersectionObserverEntry[]) => void;
}

interface UseIntersectionObserverReturn {
  observeElement: (element: Element, attributes?: Record<string, string>) => void;
  unobserveElement: (element: Element) => void;
  disconnect: () => void;
}

export const useIntersectionObserver = (
  options: UseIntersectionObserverOptions = {}
): UseIntersectionObserverReturn => {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementsRef = useRef<Map<Element, Record<string, string>>>(new Map());

  const { threshold = 0.1, rootMargin = '0px', root = null, onIntersect } = options;

  // Initialize observer
  useEffect(() => {
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries: IntersectionObserverEntry[]) => {
          // Add attributes to entries for easier handling
          const enhancedEntries = entries.map(entry => {
            const attributes = elementsRef.current.get(entry.target) || {};
            Object.entries(attributes).forEach(([key, value]) => {
              entry.target.setAttribute(key, value);
            });
            return entry;
          });

          onIntersect?.(enhancedEntries);
        },
        {
          threshold,
          rootMargin,
          root,
        }
      );
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      elementsRef.current.clear();
    };
  }, [threshold, rootMargin, root, onIntersect]);

  const observeElement = useCallback((element: Element, attributes: Record<string, string> = {}) => {
    if (observerRef.current && element) {
      // Store attributes for this element
      elementsRef.current.set(element, attributes);
      
      // Set attributes on the element
      Object.entries(attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
      });

      observerRef.current.observe(element);
    }
  }, []);

  const unobserveElement = useCallback((element: Element) => {
    if (observerRef.current && element) {
      observerRef.current.unobserve(element);
      elementsRef.current.delete(element);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      elementsRef.current.clear();
    }
  }, []);

  return {
    observeElement,
    unobserveElement,
    disconnect,
  };
}; 