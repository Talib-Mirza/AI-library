import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useInView } from 'react-intersection-observer';
import PDFPage from './PDFPage';
import BookService from '../../services/BookService';
import { toast } from 'react-hot-toast';

interface PDFViewerProps {
  bookId: number;
}

interface PDFContent {
  total_pages: number;
  pages: Array<{
    page_number: number;
    width: number;
    height: number;
    blocks: Array<{
      type: string;
      text?: string;
      bbox: number[];
      font_size?: number;
      is_bold?: boolean;
      is_italic?: boolean;
      alignment?: 'left' | 'center' | 'right' | 'justify';
      indent?: number;
      is_paragraph_start?: boolean;
      line_height?: number;
      image_data?: {
        ext: string;
        width: number;
        height: number;
        xref: number;
      };
    }>;
  }>;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ bookId }) => {
  const [content, setContent] = useState<PDFContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadAttempts, setLoadAttempts] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const maxRetries = 3;
  
  // Load PDF content
  useEffect(() => {
    const loadContent = async () => {
      console.log(`[PDFViewer] Starting content load for book ${bookId} (attempt ${loadAttempts + 1}/${maxRetries})`);
      
      try {
        setIsLoading(true);
        setError(null);
        
        // Add delay between retries
        if (loadAttempts > 0) {
          const delay = Math.min(1000 * Math.pow(2, loadAttempts - 1), 5000); // Exponential backoff
          console.log(`[PDFViewer] Waiting ${delay}ms before retry`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        const response = await BookService.getBookContent(bookId);
        console.log('[PDFViewer] Content received:', {
          hasData: !!response,
          type: typeof response,
          isString: typeof response === 'string',
          preview: typeof response === 'string' ? response.slice(0, 100) : undefined
        });
        
        let data;
        if (typeof response === 'string') {
          try {
            data = JSON.parse(response);
          } catch (e) {
            console.error('[PDFViewer] Error parsing content:', e);
            throw new Error('Invalid PDF content format');
          }
        } else {
          data = response;
        }
        
        if (!data) {
          throw new Error('No data received from server');
        }
        
        if (!data.pages || !Array.isArray(data.pages)) {
          console.error('[PDFViewer] Invalid content structure:', {
            data: JSON.stringify(data).slice(0, 500),
            type: typeof data,
            keys: Object.keys(data)
          });
          throw new Error('Invalid PDF content structure');
        }
        
        // Validate and clean the data
        const cleanedPages = data.pages.map((page: any) => ({
          ...page,
          blocks: page.blocks || []
        }));
        
        setContent({
          ...data,
          pages: cleanedPages
        });
        setLoadAttempts(0); // Reset attempts on success
        console.log('[PDFViewer] Content loaded successfully');
      } catch (err: any) {
        console.error('[PDFViewer] Error loading content:', {
          error: err,
          message: err.message,
          response: err.response?.data,
          status: err.response?.status,
          stack: err.stack
        });
        
        const errorMessage = err.response?.data?.detail || err.message || 'Failed to load PDF content';
        setError(errorMessage);
        
        // Retry logic
        if (loadAttempts < maxRetries - 1) {
          console.log(`[PDFViewer] Retrying load (attempt ${loadAttempts + 1}/${maxRetries})`);
          setLoadAttempts(prev => prev + 1);
        } else {
          console.error('[PDFViewer] Max retries reached');
          toast.error(errorMessage);
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    loadContent();
  }, [bookId, loadAttempts]);
  
  // Setup intersection observer for each page
  const createPageObserver = useCallback((pageNumber: number) => {
    console.log(`[PDFViewer] Creating observer for page ${pageNumber}`);
    const { ref, inView } = useInView({
      threshold: 0.3, // Trigger when 30% of page is visible
      triggerOnce: false,
      rootMargin: '-50px 0px',
    });
    
    return { ref, isVisible: inView, pageNumber };
  }, []);
  
  // Create observers for all pages
  const pageObservers = useMemo(() => {
    if (!content?.pages) return [];
    console.log(`[PDFViewer] Creating observers for ${content.pages.length} pages`);
    return content.pages.map(page => createPageObserver(page.page_number));
  }, [content, createPageObserver]);
  
  // Track current page based on visibility
  useEffect(() => {
    const visiblePages = pageObservers.filter(observer => observer.isVisible);
    if (visiblePages.length > 0) {
      // Use the first visible page
      setCurrentPage(visiblePages[0].pageNumber);
    }
  }, [pageObservers]);
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600 dark:text-gray-300">
          Loading PDF content{loadAttempts > 0 ? ` (Attempt ${loadAttempts + 1}/${maxRetries})` : '...'}
        </p>
      </div>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Failed to Load PDF</h3>
        <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
        <button
          onClick={() => setLoadAttempts(prev => prev + 1)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          disabled={loadAttempts >= maxRetries}
        >
          Try Again
        </button>
      </div>
    );
  }
  
  if (!content) return null;
  
  return (
    <div className="relative w-full">
      {/* Fixed header */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
          <div className="flex items-center space-x-3">
            {/* Page indicator */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Page {currentPage}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  of {content.total_pages} pages
                </div>
              </div>
            </div>
          </div>
          
          {/* Progress and stats */}
          <div className="flex items-center space-x-4">
            {/* Progress bar */}
            <div className="flex items-center space-x-2">
              <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-300 ease-out"
                  style={{ width: `${(currentPage / content.total_pages) * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                {Math.round((currentPage / content.total_pages) * 100)}%
              </span>
            </div>
            
            {/* Element count */}
            <div className="hidden sm:flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m0 0V1a1 1 0 011-1h2a1 1 0 011 1v18a1 1 0 01-1 1h-2a1 1 0 01-1-1V4m0 0H7m10 0v16a1 1 0 01-1 1H8a1 1 0 01-1-1V4" />
              </svg>
              <span>{content.pages.reduce((total, page) => total + page.blocks.length, 0)} elements</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pages container */}
      <div className="px-6 py-6 max-w-5xl mx-auto">{content.pages.map((page, index) => {
          const observer = pageObservers[index];
          if (!observer) return null;

          return (
            <div 
              ref={observer.ref} 
              key={page.page_number}
            >
              <PDFPage
                page={page}
                isVisible={observer.isVisible}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PDFViewer; 
