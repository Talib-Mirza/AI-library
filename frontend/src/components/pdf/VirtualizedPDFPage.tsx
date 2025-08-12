import React, { forwardRef, useEffect, useRef, useState, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import OptimizedPDFService, { PDFDocumentData, PDFPageData, PDFTextSpan } from '../../services/OptimizedPDFService';
import './PDFTextLayer.css';

interface VirtualizedPageProps {
  pageNumber: number;
  documentData: PDFDocumentData | null;
  scale: number;
  isLoaded: boolean;
  searchResults?: {
    pageNumber: number;
    spans: PDFTextSpan[];
    matches: Array<{ spanIndex: number; startOffset: number; endOffset: number }>;
  };
  onTextSelect?: (text: string, spans: PDFTextSpan[]) => void;
  intersectionObserver?: IntersectionObserver | null;
}



const VirtualizedPDFPage = memo(forwardRef<HTMLDivElement, VirtualizedPageProps>(({
  pageNumber,
  documentData,
  scale,
  isLoaded,
  searchResults,
  onTextSelect,
  intersectionObserver,
}, ref) => {
  const [pageData, setPageData] = useState<PDFPageData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textLayerRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef<boolean>(false);

  // Callback ref to track when canvas is available
  const setCanvasRef = useCallback((node: HTMLCanvasElement | null) => {
    canvasRef.current = node;
    setCanvasReady(!!node);
  }, []);

  // Helper function to set refs
  const setRefs = useCallback((node: HTMLDivElement | null) => {
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
    containerRef.current = node;
  }, [ref]);

  // Load PDF page
  const loadPage = useCallback(async () => {
    if (!documentData || loadingRef.current) {
      return;
    }
    
    loadingRef.current = true;
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await OptimizedPDFService.getPageWithTextLayer(documentData, pageNumber, scale);
      
      setPageData(data);
      setHasLoaded(true);
      
      if (data.canvas && canvasRef.current) {
        const context = canvasRef.current.getContext('2d');
        if (context) {
          canvasRef.current.width = data.canvas.width;
          canvasRef.current.height = data.canvas.height;
          canvasRef.current.style.width = `${data.viewport.width}px`;
          canvasRef.current.style.height = `${data.viewport.height}px`;
          context.drawImage(data.canvas, 0, 0);
        }
      }
    } catch (err) {
      console.error(`[PDFPage ${pageNumber}] Failed to load page:`, err);
      setError(err instanceof Error ? err.message : 'Failed to load page');
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [documentData, pageNumber, scale]);

  // Load page when dependencies change
  useEffect(() => {
    loadPage();
  }, [loadPage]);

  // Reset loaded state when scale changes
  useEffect(() => {
    setHasLoaded(false);
    setPageData(null);
  }, [scale]);

  // Render text layer with proper PDF.js text selection
  const renderTextLayer = useCallback(async () => {
    if (!textLayerRef.current || !pageData?.textContent || !pageData?.viewport) {
      return;
    }
    
    // Clear existing content
    textLayerRef.current.innerHTML = '';
    
    try {
      const pdfjsLib = (window as any).pdfjsLib;
      
      if (pdfjsLib?.TextLayerBuilder) {
        
        const textLayerBuilder = new pdfjsLib.TextLayerBuilder({
          container: textLayerRef.current,
          viewport: pageData.viewport,
          enhanceTextSelection: true, // Enable native PDF.js text selection
        });
        
        await textLayerBuilder.render(pageData.textContent);
        
        return;
      }
      
      if (pdfjsLib?.renderTextLayer) {
        
        const task = pdfjsLib.renderTextLayer({
          textContentSource: pageData.textContent,
          container: textLayerRef.current,
          viewport: pageData.viewport,
          textDivs: [],
          enhanceTextSelection: true, // Enable native PDF.js text selection
        });
        
        await task.promise;
        
        return;
    }

      // Fallback: Manual text layer with proper coordinates
    const textItems = pageData.textContent.items || [];
    const viewport = pageData.viewport;
    
    textItems.forEach((item: any, index: number) => {
      if (!item.str || !item.str.trim()) return;
      
      const span = document.createElement('span');
      span.textContent = item.str;
      span.style.position = 'absolute';
      span.style.color = 'transparent';
        span.style.userSelect = 'text';
        span.style.cursor = 'text';
      span.style.whiteSpace = 'pre';
      span.style.margin = '0';
      span.style.padding = '0';
        span.style.transformOrigin = '0% 0%';
      
        // Calculate position and size from PDF.js transform
      const transform = item.transform;
      if (transform && transform.length >= 6) {
          const transformMatrix = pdfjsLib?.Util?.transform?.(viewport.transform, transform) || transform;
        const [scaleX, skewY, skewX, scaleY, translateX, translateY] = transformMatrix;
        
        const x = translateX;
        const y = translateY;
        
        span.style.left = `${x}px`;
        span.style.top = `${y}px`;
        
        const fontSize = Math.sqrt(scaleX * scaleX + skewY * skewY);
        span.style.fontSize = `${fontSize}px`;
        
          // Apply rotation if needed
          if (Math.abs(skewY) > 0.01 || Math.abs(skewX) > 0.01) {
            const rotation = Math.atan2(skewY, scaleX) * (180 / Math.PI);
            span.style.transform = `rotate(${rotation.toFixed(2)}deg)`;
          }
        
        if (item.fontName) {
          span.style.fontFamily = item.fontName;
        }
        
          textLayerRef.current!.appendChild(span);
        }
      });
      
    } catch (error) {
      console.warn(`[PDFPage ${pageNumber}] Text layer rendering failed:`, error);
    }
  }, [pageData, pageNumber]);

  // Handle text selection with improved position data - ONLY from this PDF page
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      return;
        }
        
    const selectedText = selection.toString();
    if (selectedText.trim().length > 0) {
      // Check if the selection is within this PDF page
      const range = selection.getRangeAt(0);
      const selectionContainer = range.commonAncestorContainer;
      
      // Verify the selection is within our text layer
      let isWithinPDFPage = false;
      let currentNode: Node | null = selectionContainer;
      
      while (currentNode && currentNode !== document.body) {
        if (currentNode === textLayerRef.current) {
          isWithinPDFPage = true;
          break;
        }
        currentNode = currentNode.parentNode;
      }
      
      // Only process selections from within this PDF page's text layer
      if (!isWithinPDFPage) {
        return;
      }
      
      // Get selection bounds for better positioning
      const rect = range.getBoundingClientRect();
      
      // Calculate position relative to the page container
      const containerRect = containerRef.current?.getBoundingClientRect();
      const relativeX = containerRect ? rect.left - containerRect.left : 0;
      const relativeY = containerRect ? rect.top - containerRect.top : 0;
    
      // Create spans with better position data
      const spans: PDFTextSpan[] = [{
        text: selectedText,
        x: relativeX,
        y: relativeY,
        width: rect.width,
        height: rect.height,
        fontSize: 12,
        fontName: 'default',
        transform: [1, 0, 0, 1, relativeX, relativeY]
      }];
      
      onTextSelect?.(selectedText, spans);
    }
  }, [pageNumber, onTextSelect]);

  // Add selection change listener
  useEffect(() => {
    document.addEventListener('selectionchange', handleTextSelection);
    
    return () => {
      document.removeEventListener('selectionchange', handleTextSelection);
    };
  }, [handleTextSelection]);

  // Monitor canvas ref and re-render if needed
  useEffect(() => {
    if (pageData?.canvas && canvasRef.current && canvasReady) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = pageData.canvas.width;
        canvasRef.current.height = pageData.canvas.height;
        canvasRef.current.style.width = `${pageData.viewport.width}px`;
        canvasRef.current.style.height = `${pageData.viewport.height}px`;
        context.drawImage(pageData.canvas, 0, 0);
      }
    }
  }, [pageData, pageNumber, canvasReady]);

  // Render text layer when page data is available
  useEffect(() => {
    if (pageData?.textContent && textLayerRef.current) {
      renderTextLayer();
    }
  }, [pageData, renderTextLayer, pageNumber]);

  return (
    <div
      ref={setRefs}
      data-page-number={pageNumber}
      className="relative bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden"
      style={{
        width: pageData?.viewport ? `${pageData.viewport.width}px` : '800px',
        height: pageData?.viewport ? `${pageData.viewport.height}px` : '1000px',
        maxWidth: '100%',
        margin: '0 auto',
      }}
    >
      {/* Canvas for PDF content */}
      {pageData?.canvas ? (
        <div className="relative w-full h-full">
          <canvas
            ref={setCanvasRef}
            className="w-full h-full"
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          />
          
          {/* Text layer for selection */}
          <div
            ref={textLayerRef}
            className="textLayer absolute inset-0 w-full h-full"
            style={{
              width: pageData?.viewport ? `${pageData.viewport.width}px` : '100%',
              height: pageData?.viewport ? `${pageData.viewport.height}px` : '100%',
              fontSize: '1px',
              lineHeight: '1',
              overflow: 'hidden',
              userSelect: 'text',
              cursor: 'text',
              zIndex: 10,
              pointerEvents: 'auto',
            }}
          />
        </div>
      ) : pageData ? (
        <div className="absolute inset-0 flex items-center justify-center bg-yellow-50">
          <div className="text-center p-4">
            <p className="text-sm text-yellow-700">Page data exists but no canvas</p>
            <p className="text-xs text-yellow-600">Viewport: {pageData.viewport?.width}x{pageData.viewport?.height}</p>
          </div>
        </div>
      ) : null}

      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50/80">
          <div className="text-center">
            <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-2"></div>
            <p className="text-xs text-gray-600">Loading page {pageNumber}...</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50/80">
          <div className="text-center p-4">
            <svg className="w-6 h-6 mx-auto mb-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-red-700">Failed to load page {pageNumber}</p>
            <button 
              onClick={() => {
                setHasLoaded(false);
                setError(null);
              }}
              className="text-xs text-red-600 underline mt-1"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Placeholder when no data */}
      {!pageData && !isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="text-center p-4">
            <svg className="w-6 h-6 mx-auto mb-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-xs text-gray-600">Page {pageNumber}</p>
          </div>
        </div>
      )}

      {/* Page number indicator */}
      <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded opacity-0 hover:opacity-100 transition-opacity z-20">
        {pageNumber}
      </div>
    </div>
  );
}), (prevProps, nextProps) => {
  return (
    prevProps.pageNumber === nextProps.pageNumber &&
    prevProps.scale === nextProps.scale &&
    prevProps.documentData === nextProps.documentData &&
    prevProps.searchResults === nextProps.searchResults
  );
});

VirtualizedPDFPage.displayName = 'VirtualizedPDFPage';

export default VirtualizedPDFPage; 