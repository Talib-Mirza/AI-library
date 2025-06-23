import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FixedSizeList as List } from 'react-window';
import OptimizedPDFService, { PDFDocumentData, PDFPageData, PDFTextSpan } from '../../services/OptimizedPDFService';
import VirtualizedPDFPage from './VirtualizedPDFPage';
import PDFControls from './PDFControls';
import PDFSearchPanel from './PDFSearchPanel';

interface ModernPDFViewerProps {
  bookId: number;
  onPageChange?: (pageNumber: number) => void;
  onTextSelect?: (text: string, spans: PDFTextSpan[]) => void;
  className?: string;
}

interface ViewerState {
  document: PDFDocumentData | null;
  currentPage: number;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  searchResults: any[];
  showSearch: boolean;
  selectedText: string;
}

// Constants for virtualization
const ITEM_HEIGHT = 820;
const OVERSCAN_COUNT = 1;
const PRELOAD_THRESHOLD = 2;
const FIXED_SCALE = 1.0; // Fixed scale instead of variable

// Types for the virtualized page wrapper
interface VirtualizedPageWrapperProps {
  index: number;
  style: React.CSSProperties;
  data: {
    document: PDFDocumentData | null;
    searchResults: any[];
    onTextSelect: (text: string, spans: PDFTextSpan[]) => void;
  };
}

const ModernPDFViewer: React.FC<ModernPDFViewerProps> = ({
  bookId,
  onPageChange,
  onTextSelect,
  className = '',
}) => {
  // State management
  const [state, setState] = useState<ViewerState>({
    document: null,
    currentPage: 1,
    isLoading: true,
    error: null,
    searchQuery: '',
    searchResults: [],
    showSearch: false,
    selectedText: '',
  });

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<List>(null);

  // Load PDF document
  useEffect(() => {
    const loadPDF = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        
        const pdfUrl = OptimizedPDFService.getPDFUrl(bookId);
        const document = await OptimizedPDFService.loadDocument(pdfUrl, bookId);
        
        setState(prev => ({
          ...prev,
          document,
          isLoading: false,
          currentPage: 1,
        }));

        // Preload first few pages silently
        OptimizedPDFService.preloadPages(document, 1, FIXED_SCALE, 2).catch(() => {});
        
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to load PDF',
          isLoading: false,
        }));
      }
    };

    loadPDF();
  }, [bookId]);

  // Handle page navigation with smooth scrolling
  const goToPage = useCallback((pageNumber: number) => {
    if (!state.document || pageNumber < 1 || pageNumber > state.document.numPages) {
      return;
    }

    if (listRef.current) {
      listRef.current.scrollToItem(pageNumber - 1, 'start');
    }
  }, [state.document]);

  // Handle search
  const handleSearch = useCallback(async (query: string) => {
    if (!state.document || !query.trim()) {
      setState(prev => ({ ...prev, searchResults: [], searchQuery: '' }));
      return;
    }

    try {
      const results = await OptimizedPDFService.searchText(state.document, query, FIXED_SCALE);
      setState(prev => ({
        ...prev,
        searchQuery: query,
        searchResults: results,
      }));
    } catch (error) {
      // Silently handle search errors
    }
  }, [state.document]);

  // Handle text selection from hover interactions
  const handleTextSelection = useCallback((text: string, spans: PDFTextSpan[]) => {
    setState(prev => ({ ...prev, selectedText: text }));
    onTextSelect?.(text, spans);
  }, [onTextSelect]);

  // Stable item data to prevent re-renders
  const itemData = useMemo(() => ({
    document: state.document,
    searchResults: state.searchResults,
    onTextSelect: handleTextSelection,
  }), [state.document, state.searchResults, handleTextSelection]);

  // Handle scroll to track current page
  const handleItemsRendered = useCallback(({ visibleStartIndex, visibleStopIndex }: {
    visibleStartIndex: number;
    visibleStopIndex: number;
  }) => {
    const middleIndex = Math.floor((visibleStartIndex + visibleStopIndex) / 2);
    const newCurrentPage = middleIndex + 1;
    
    if (newCurrentPage !== state.currentPage) {
      setState(prev => ({ ...prev, currentPage: newCurrentPage }));
      onPageChange?.(newCurrentPage);
    }
  }, [state.currentPage, onPageChange]);

  // Loading state
  if (state.isLoading) {
    return (
      <div className={`flex items-center justify-center h-[70vh] ${className}`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="relative mb-6">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-purple-200 border-r-purple-600 rounded-full animate-spin" 
                 style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-lg font-medium mb-4">
            Loading PDF document...
          </p>
          <div className="w-64 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
              animate={{ width: ['0%', '100%'] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (state.error) {
    return (
      <div className={`flex items-center justify-center h-[70vh] ${className}`}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center p-8 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800"
        >
          <svg className="w-16 h-16 mx-auto mb-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
            Failed to Load PDF
          </h3>
          <p className="text-red-700 dark:text-red-300 mb-4">{state.error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </motion.div>
      </div>
    );
  }

  if (!state.document) {
    return null;
  }

  return (
    <div className={`relative w-full flex flex-col ${className}`} style={{ height: 'calc(100vh - 100px)' }} ref={containerRef}>
      {/* PDF Controls */}
      <div className="flex-shrink-0">
        <PDFControls
          currentPage={state.currentPage}
          totalPages={state.document.numPages}
          onPageChange={goToPage}
          onSearchToggle={() => setState(prev => ({ ...prev, showSearch: !prev.showSearch }))}
          showSearch={state.showSearch}
        />
      </div>

      {/* Search Panel */}
      <AnimatePresence>
        {state.showSearch && (
          <div className="flex-shrink-0">
            <PDFSearchPanel
              searchQuery={state.searchQuery}
              searchResults={state.searchResults}
              onSearch={handleSearch}
              onResultClick={(pageNumber) => goToPage(pageNumber)}
              onClose={() => setState(prev => ({ ...prev, showSearch: false }))}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Virtualized PDF Pages */}
      <div className="flex-1 bg-gray-100 dark:bg-gray-900 rounded-b-2xl overflow-hidden">
        <List
          ref={(list: any) => {
            listRef.current = list;
          }}
          height={containerRef.current?.clientHeight ? containerRef.current.clientHeight - 80 : 700}
          width="100%"
          itemCount={state.document.numPages}
          itemSize={ITEM_HEIGHT}
          itemData={itemData}
          onItemsRendered={handleItemsRendered}
          overscanCount={OVERSCAN_COUNT}
          className="pdf-virtualized-list"
        >
          {VirtualizedPDFPageWrapper}
        </List>
      </div>

      {/* Selected Text Indicator */}
      <AnimatePresence>
        {state.selectedText && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50"
          >
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className="text-sm">Hover-selected: "{state.selectedText.slice(0, 50)}..."</span>
              <button
                onClick={() => setState(prev => ({ ...prev, selectedText: '' }))}
                className="ml-2 text-blue-200 hover:text-white"
              >
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Optimized wrapper component for react-window items
const VirtualizedPDFPageWrapper = memo<VirtualizedPageWrapperProps>(({ index, style, data }) => {
  const pageNumber = index + 1;
  
  // Memoized search results to prevent recalculation
  const pageSearchResults = useMemo(() => {
    return data.searchResults?.find((r: any) => r.pageNumber === pageNumber) || null;
  }, [data.searchResults, pageNumber]);
  
  return (
    <div style={{
      ...style,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      padding: '0px',
      paddingTop: index === 0 ? '4px' : '1px',
      paddingBottom: '1px',
      overflow: 'hidden',
    }}>
      <VirtualizedPDFPage
        pageNumber={pageNumber}
        documentData={data.document}
        scale={FIXED_SCALE}
        isLoaded={true}
        searchResults={pageSearchResults}
        onTextSelect={data.onTextSelect}
        intersectionObserver={null}
      />
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.index === nextProps.index &&
    prevProps.data.document === nextProps.data.document &&
    prevProps.data.searchResults === nextProps.data.searchResults &&
    prevProps.data.onTextSelect === nextProps.data.onTextSelect
  );
});

VirtualizedPDFPageWrapper.displayName = 'VirtualizedPDFPageWrapper';

export default ModernPDFViewer; 