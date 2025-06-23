import React, { forwardRef, useEffect, useRef, useState, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import OptimizedPDFService, { PDFDocumentData, PDFPageData, PDFTextSpan } from '../../services/OptimizedPDFService';
import './PDFTextLayer.css';

// Add CSS styles for text layer and hover highlighting
const textLayerStyles = `
.textLayer {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  opacity: 0;
  line-height: 1.0;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  pointer-events: auto;
  z-index: 10;
}

.textLayer > span,
.textLayer > div {
  position: absolute;
  color: transparent;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  cursor: pointer;
  pointer-events: auto;
  white-space: pre;
  margin: 0;
  padding: 0;
  display: inline-block;
  box-sizing: border-box;
  transition: background-color 0.2s ease;
}

.hover-highlight {
  background: rgba(59, 130, 246, 0.2) !important;
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.3);
  border-radius: 2px;
}

.sentence-group {
  position: relative;
}

.sentence-group::before {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  background: rgba(59, 130, 246, 0.15);
  border-radius: 4px;
  z-index: -1;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.sentence-group.highlight::before {
  opacity: 1;
}
`;

// Inject styles if not already present
if (typeof document !== 'undefined' && !document.getElementById('pdf-text-layer-styles')) {
  const style = document.createElement('style');
  style.id = 'pdf-text-layer-styles';
  style.textContent = textLayerStyles;
  document.head.appendChild(style);
}

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

// Text chunking utilities
const isEndOfSentence = (text: string): boolean => {
  return /[.!?][\s]*$/.test(text.trim());
};

const isListItem = (text: string): boolean => {
  return /^[\s]*[•·‣⁃▪▫◦‣⁌⁍]*[\s]*[a-zA-Z0-9]/.test(text) || 
         /^[\s]*\d+\.[\s]/.test(text) ||
         /^[\s]*[a-zA-Z]\.[\s]/.test(text) ||
         /^[\s]*[-*+][\s]/.test(text);
};

const isNewParagraph = (text: string): boolean => {
  return /^[\s]*[A-Z]/.test(text);
};

const shouldStartNewChunk = (currentText: string, nextText: string): boolean => {
  // Don't start new chunk if current text is very short (likely partial word/line)
  if (currentText.length < 20) return false;
  
  // Start new chunk if current text ends with sentence-ending punctuation followed by space
  if (/[.!?]\s*$/.test(currentText.trim())) {
    return true;
  }
  
  // Start new chunk if next text starts with capital letter after significant content
  if (currentText.length > 50 && /^[A-Z]/.test(nextText.trim())) {
    return true;
  }
  
  // Start new chunk if current chunk is getting very long (>300 chars for paragraphs)
  if (currentText.length > 300) return true;
  
  // Start new chunk if next text looks like a new paragraph (indented or after line break)
  if (isNewParagraph(nextText) && currentText.length > 100) return true;
  
  // Start new chunk if next text is a list item
  if (isListItem(nextText)) return true;
  
  return false;
};

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
  const [hoveredChunk, setHoveredChunk] = useState<number | null>(null);
  const [textChunks, setTextChunks] = useState<Array<{
    text: string;
    bounds: DOMRect;
    items: any[];
  }>>([]);
  
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

  // Optimized load function
  const loadPage = useCallback(async () => {
    if (!documentData || loadingRef.current) {
      return;
    }
    
    console.log(`[PDFPage ${pageNumber}] Starting to load page`);
    loadingRef.current = true;
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await OptimizedPDFService.getPageWithTextLayer(documentData, pageNumber, scale);
      
      console.log(`[PDFPage ${pageNumber}] Page data loaded:`, {
        hasCanvas: !!data.canvas,
        hasTextContent: !!data.textContent,
        textItems: data.textContent?.items?.length || 0,
        viewport: { width: data.viewport?.width, height: data.viewport?.height }
      });
      
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
          console.log(`[PDFPage ${pageNumber}] Canvas rendered successfully`);
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

  // Create intelligent text chunks based on PDF.js textContent items directly
  const createTextChunks = useCallback((textItems: any[]) => {
    console.log(`[PDFPage ${pageNumber}] Creating text chunks from ${textItems.length} text items`);
    
    if (!pageData?.viewport || textItems.length === 0) {
      console.log(`[PDFPage ${pageNumber}] No viewport or text items available`);
      return [];
    }

    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      const chunks: Array<{
        text: string;
        bounds: DOMRect;
        items: any[];
      }> = [];

      let currentChunk = '';
      let currentItems: any[] = [];
      
      const viewport = pageData.viewport;
      
      textItems.forEach((item: any, index: number) => {
        if (!item.str || !item.str.trim()) return;

        // Add item to current chunk
        currentChunk += (currentChunk ? ' ' : '') + item.str;
        currentItems.push(item);

        // Check if we should start a new chunk
        const nextItem = textItems[index + 1];
        const shouldEnd = shouldStartNewChunk(currentChunk, nextItem?.str || '');
        
        if (shouldEnd || index === textItems.length - 1) {
          if (currentItems.length > 0) {
            // Calculate bounds directly from PDF.js transform data
            const bounds = calculateChunkBounds(currentItems, viewport);
            
            console.log(`[PDFPage ${pageNumber}] Created chunk ${chunks.length}:`, {
              text: currentChunk.substring(0, 30) + '...',
              items: currentItems.length,
              bounds: {
                left: bounds.left.toFixed(1),
                top: bounds.top.toFixed(1),
                width: bounds.width.toFixed(1),
                height: bounds.height.toFixed(1)
              }
            });
            
            chunks.push({
              text: currentChunk.trim(),
              bounds,
              items: [...currentItems],
            });
          }
          
          // Reset for next chunk
          currentChunk = '';
          currentItems = [];
        }
      });
      
      console.log(`[PDFPage ${pageNumber}] Created ${chunks.length} text chunks total`);
      setTextChunks(chunks);
    });
    
    return [];
  }, [pageNumber, pageData]);

  // Calculate chunk bounds directly from PDF.js item transforms
  const calculateChunkBounds = useCallback((items: any[], viewport: any): DOMRect => {
    if (items.length === 0) return new DOMRect();
    
    const pdfjsLib = (window as any).pdfjsLib;
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    items.forEach((item: any) => {
      if (!item.transform || item.transform.length < 6) return;
      
      // Use PDF.js coordinate transformation
      const transform = pdfjsLib?.Util?.transform?.(viewport.transform, item.transform) || item.transform;
      const [scaleX, skewY, skewX, scaleY, translateX, translateY] = transform;
      
      const x = translateX;
      const y = viewport.height - translateY; // Convert from PDF bottom-up to DOM top-down
      
      // Calculate actual text width more accurately
      const fontSize = Math.sqrt(scaleX * scaleX + skewY * skewY);
      const estimatedCharWidth = fontSize * 0.6; // More accurate character width estimation
      const textWidth = item.width || (item.str.length * estimatedCharWidth);
      const textHeight = Math.abs(scaleY);
      
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x + textWidth);
      minY = Math.min(minY, y - textHeight); // Adjust for text baseline
      maxY = Math.max(maxY, y);
    });
    
    // Add some padding for better visual feedback
    const padding = 2;
    return new DOMRect(
      minX - padding,
      minY - padding,
      (maxX - minX) + (padding * 2),
      (maxY - minY) + (padding * 2)
    );
  }, []);

  // Professional text layer rendering
  const renderTextLayer = useCallback(async () => {
    if (!textLayerRef.current || !pageData?.textContent || !pageData?.viewport) {
      console.log(`[PDFPage ${pageNumber}] Missing requirements for text layer rendering:`, {
        hasTextLayer: !!textLayerRef.current,
        hasTextContent: !!pageData?.textContent,
        hasViewport: !!pageData?.viewport
      });
      return;
    }
    
    console.log(`[PDFPage ${pageNumber}] Starting text layer rendering`);
    
    // Clear existing content
    textLayerRef.current.innerHTML = '';
    
    try {
      // Try PDF.js native methods first
      const pdfjsLib = (window as any).pdfjsLib;
      console.log(`[PDFPage ${pageNumber}] PDF.js available:`, !!pdfjsLib);
      
      if (pdfjsLib?.TextLayerBuilder) {
        console.log(`[PDFPage ${pageNumber}] Using TextLayerBuilder`);
        
        const textLayerBuilder = new pdfjsLib.TextLayerBuilder({
          container: textLayerRef.current,
          viewport: pageData.viewport,
          enhanceTextSelection: false,
        });
        
        await textLayerBuilder.render(pageData.textContent);
        
        // Apply styling for hover interaction
        const spans = textLayerRef.current.querySelectorAll('span, div');
        console.log(`[PDFPage ${pageNumber}] Applied styling to ${spans.length} text elements`);
        
        spans.forEach((element, index) => {
          const htmlElement = element as HTMLElement;
          htmlElement.style.color = 'transparent';
          htmlElement.style.userSelect = 'none';
          htmlElement.style.cursor = 'pointer';
          htmlElement.style.pointerEvents = 'auto';
          htmlElement.dataset.elementIndex = index.toString();
        });
        
        // Create intelligent text chunks after rendering
        const textItems = pageData.textContent.items || [];
        createTextChunks(textItems);
        
        return;
      }
      
      if (pdfjsLib?.renderTextLayer) {
        console.log(`[PDFPage ${pageNumber}] Using renderTextLayer`);
        
        const task = pdfjsLib.renderTextLayer({
          textContentSource: pageData.textContent,
          container: textLayerRef.current,
          viewport: pageData.viewport,
          textDivs: [],
          enhanceTextSelection: false,
        });
        
        await task.promise;
        
        const spans = textLayerRef.current.querySelectorAll('span, div');
        console.log(`[PDFPage ${pageNumber}] Applied styling to ${spans.length} text elements (renderTextLayer)`);
        
        spans.forEach((element, index) => {
          const htmlElement = element as HTMLElement;
          htmlElement.style.color = 'transparent';
          htmlElement.style.userSelect = 'none';
          htmlElement.style.cursor = 'pointer';
          htmlElement.style.pointerEvents = 'auto';
          htmlElement.dataset.elementIndex = index.toString();
        });
        
        const textItems = pageData.textContent.items || [];
        createTextChunks(textItems);
        
        return;
      }
    } catch (error) {
      console.warn(`[PDFPage ${pageNumber}] PDF.js text layer rendering failed:`, error);
    }

    // Manual text layer implementation
    console.log(`[PDFPage ${pageNumber}] Using manual text layer implementation`);
    const textItems = pageData.textContent.items || [];
    const viewport = pageData.viewport;
    
    console.log(`[PDFPage ${pageNumber}] Manual rendering with ${textItems.length} text items`);
    
    textItems.forEach((item: any, index: number) => {
      if (!item.str || !item.str.trim()) return;
      
      const span = document.createElement('span');
      span.textContent = item.str;
      span.style.position = 'absolute';
      span.style.color = 'transparent';
      span.style.userSelect = 'none';
      span.style.cursor = 'pointer';
      span.style.pointerEvents = 'auto';
      span.style.whiteSpace = 'pre';
      span.style.margin = '0';
      span.style.padding = '0';
      span.style.display = 'inline-block';
      span.style.boxSizing = 'border-box';
      
      // Professional coordinate transformation
      const transform = item.transform;
      if (transform && transform.length >= 6) {
        const transformMatrix = (window as any).pdfjsLib?.Util?.transform?.(viewport.transform, transform) || transform;
        const [scaleX, skewY, skewX, scaleY, translateX, translateY] = transformMatrix;
        
        const x = translateX;
        const y = translateY;
        
        span.style.left = `${x}px`;
        span.style.top = `${y}px`;
        
        const fontSize = Math.sqrt(scaleX * scaleX + skewY * skewY);
        span.style.fontSize = `${fontSize}px`;
        
        const charWidth = fontSize * 0.6;
        const textWidth = item.width || (charWidth * item.str.length);
        const textHeight = fontSize;
        
        span.style.width = `${textWidth}px`;
        span.style.height = `${textHeight}px`;
        span.style.lineHeight = `${textHeight}px`;
        
        if (item.fontName) {
          span.style.fontFamily = item.fontName;
        }
        
        if (Math.abs(skewY) > 0.01 || Math.abs(skewX) > 0.01) {
          const rotation = Math.atan2(skewY, scaleX) * (180 / Math.PI);
          span.style.transform = `rotate(${rotation.toFixed(2)}deg)`;
          span.style.transformOrigin = '0 0';
        }
        
        span.dataset.textIndex = index.toString();
        span.dataset.originalText = item.str;
        span.dataset.elementIndex = index.toString();
        
        textLayerRef.current!.appendChild(span);
      }
    });
    
    console.log(`[PDFPage ${pageNumber}] Manual text layer completed, creating chunks`);
    
    // Create intelligent text chunks after manual rendering
    createTextChunks(textItems);
  }, [pageData, pageNumber, createTextChunks]);

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

  // Handle hover interactions with improved coordinate calculation
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!textLayerRef.current || textChunks.length === 0) {
      console.log(`[PDFPage ${pageNumber}] Mouse move ignored - no text layer (${!!textLayerRef.current}) or chunks (${textChunks.length})`);
      return;
    }
    
    // Get page-relative coordinates
    const pageRect = containerRef.current?.getBoundingClientRect();
    const layerRect = textLayerRef.current.getBoundingClientRect();
    
    if (!pageRect || !layerRect) {
      console.log(`[PDFPage ${pageNumber}] Missing rect data for coordinate calculation`);
      return;
    }
    
    // Calculate coordinates relative to the page container
    const pageX = event.clientX - pageRect.left;
    const pageY = event.clientY - pageRect.top;
    
    // Calculate coordinates relative to the text layer
    const layerX = event.clientX - layerRect.left;
    const layerY = event.clientY - layerRect.top;
    
    console.log(`[PDFPage ${pageNumber}] Mouse position - Page: (${pageX.toFixed(1)}, ${pageY.toFixed(1)}), Layer: (${layerX.toFixed(1)}, ${layerY.toFixed(1)}), Chunks: ${textChunks.length}`);
    
    // Find which chunk the mouse is over
    let foundChunk = -1;
    for (let i = 0; i < textChunks.length; i++) {
      const chunk = textChunks[i];
      
      // Chunk bounds are already in layer-relative coordinates
      const chunkLeft = chunk.bounds.left;
      const chunkTop = chunk.bounds.top;
      const chunkRight = chunkLeft + chunk.bounds.width;
      const chunkBottom = chunkTop + chunk.bounds.height;
      
      // Check if mouse is within chunk bounds (with some padding)
      const padding = 5;
      const isInside = layerX >= chunkLeft - padding && 
                      layerX <= chunkRight + padding &&
                      layerY >= chunkTop - padding && 
                      layerY <= chunkBottom + padding;
      
      if (i < 3) { // Log first few chunks for debugging
        console.log(`[PDFPage ${pageNumber}] Chunk ${i} bounds: (${chunkLeft.toFixed(1)}, ${chunkTop.toFixed(1)}, ${chunkRight.toFixed(1)}, ${chunkBottom.toFixed(1)}) - Inside: ${isInside}`);
      }
      
      if (isInside) {
        console.log(`[PDFPage ${pageNumber}] Mouse over chunk ${i}: "${chunk.text.substring(0, 30)}..." at bounds (${chunkLeft.toFixed(1)}, ${chunkTop.toFixed(1)}, ${chunkRight.toFixed(1)}, ${chunkBottom.toFixed(1)})`);
        foundChunk = i;
        break;
      }
    }
    
    if (foundChunk !== hoveredChunk) {
      console.log(`[PDFPage ${pageNumber}] Hovered chunk changed from ${hoveredChunk} to ${foundChunk}`);
      setHoveredChunk(foundChunk >= 0 ? foundChunk : null);
    }
  }, [textChunks, hoveredChunk, pageNumber]);

  const handleMouseLeave = useCallback(() => {
    console.log(`[PDFPage ${pageNumber}] Mouse left page, clearing hover`);
    setHoveredChunk(null);
  }, [pageNumber]);

  const handleChunkClick = useCallback(() => {
    if (hoveredChunk !== null && textChunks[hoveredChunk]) {
      const chunk = textChunks[hoveredChunk];
      console.log(`[PDFPage ${pageNumber}] Chunk clicked: "${chunk.text}"`);
      onTextSelect?.(chunk.text, pageData?.textSpans || []);
    } else {
      console.log(`[PDFPage ${pageNumber}] Click ignored - no hovered chunk`);
    }
  }, [hoveredChunk, textChunks, onTextSelect, pageData?.textSpans, pageNumber]);

  // Apply highlighting to hovered chunk
  useEffect(() => {
    if (!textLayerRef.current) return;
    
    // Remove all existing highlights
    const elements = textLayerRef.current.querySelectorAll('.hover-highlight');
    elements.forEach(el => el.classList.remove('hover-highlight'));
    
    // Apply highlight to current chunk by finding corresponding text elements
    if (hoveredChunk !== null && textChunks[hoveredChunk]) {
      const chunk = textChunks[hoveredChunk];
      console.log(`[PDFPage ${pageNumber}] Applying highlight to chunk ${hoveredChunk} with ${chunk.items.length} items`);
      
      // Find text elements that correspond to this chunk's items
      const textElements = Array.from(textLayerRef.current.querySelectorAll('span, div')) as HTMLElement[];
      
      chunk.items.forEach((item, itemIndex) => {
        // Find the corresponding DOM element by matching text content
        const matchingElement = textElements.find(el => 
          el.textContent?.trim() === item.str?.trim()
        );
        
        if (matchingElement) {
          matchingElement.classList.add('hover-highlight');
          console.log(`[PDFPage ${pageNumber}] Added highlight to element for item ${itemIndex}: "${item.str}"`);
        } else {
          console.warn(`[PDFPage ${pageNumber}] Could not find DOM element for item ${itemIndex}: "${item.str}"`);
        }
      });
    }
  }, [hoveredChunk, textChunks, pageNumber]);

  // Render text layer when page data is available
  useEffect(() => {
    if (pageData?.textContent && textLayerRef.current) {
      console.log(`[PDFPage ${pageNumber}] Triggering text layer render`);
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
      {/* Canvas for PDF content with text layer overlay */}
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
          
          {/* Interactive text layer for hover highlighting */}
          <div
            ref={textLayerRef}
            className="textLayer absolute inset-0 w-full h-full"
            style={{
              width: pageData?.viewport ? `${pageData.viewport.width}px` : '100%',
              height: pageData?.viewport ? `${pageData.viewport.height}px` : '100%',
              fontSize: '1px',
              lineHeight: '1',
              overflow: 'hidden',
              userSelect: 'none',
              cursor: 'pointer',
              zIndex: 10,
              pointerEvents: 'auto',
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={handleChunkClick}
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
      
      {/* Hover tooltip */}
      {hoveredChunk !== null && textChunks[hoveredChunk] && (
        <div className="absolute bottom-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded shadow-lg z-20 max-w-xs">
          Click to select: "{textChunks[hoveredChunk].text.slice(0, 50)}..."
        </div>
      )}
      
      {/* Debug overlay showing chunk bounds for testing */}
      {textChunks.length > 0 && (
        <div className="absolute inset-0 pointer-events-none z-15">
          {textChunks.map((chunk, index) => (
            <div
              key={index}
              className={`absolute border-2 ${index === hoveredChunk ? 'border-blue-500 bg-blue-200/20' : 'border-green-400/50 bg-green-200/10'}`}
              style={{
                left: `${chunk.bounds.left}px`,
                top: `${chunk.bounds.top}px`,
                width: `${chunk.bounds.width}px`,
                height: `${chunk.bounds.height}px`,
                fontSize: '10px',
                color: index === hoveredChunk ? '#1e40af' : '#16a34a',
                backgroundColor: index === hoveredChunk ? 'rgba(59, 130, 246, 0.1)' : 'rgba(34, 197, 94, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '1px',
              }}
            >
              {index}
            </div>
          ))}
        </div>
      )}
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