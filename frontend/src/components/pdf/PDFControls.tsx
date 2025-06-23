import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PDFControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (pageNumber: number) => void;
  onSearchToggle: () => void;
  showSearch: boolean;
}

const PDFControls: React.FC<PDFControlsProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  onSearchToggle,
  showSearch,
}) => {
  const [pageInput, setPageInput] = useState(currentPage.toString());
  const [showPageInput, setShowPageInput] = useState(false);

  // Handle page input
  const handlePageInputSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(pageInput);
    if (pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum);
      setShowPageInput(false);
    } else {
      setPageInput(currentPage.toString());
    }
  }, [pageInput, totalPages, currentPage, onPageChange]);

  // Handle page input blur
  const handlePageInputBlur = useCallback(() => {
    setPageInput(currentPage.toString());
    setShowPageInput(false);
  }, [currentPage]);

  // Add keyboard navigation (removed zoom shortcuts)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName === 'INPUT') return; // Don't interfere with input fields
      
      switch (e.key) {
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault();
          onPageChange(Math.max(1, currentPage - 1));
          break;
        case 'ArrowDown':
        case 'PageDown':
          e.preventDefault();
          onPageChange(Math.min(totalPages, currentPage + 1));
          break;
        case 'Home':
          e.preventDefault();
          onPageChange(1);
          break;
        case 'End':
          e.preventDefault();
          onPageChange(totalPages);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages, onPageChange]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 rounded-t-2xl"
    >
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left side - Page navigation */}
          <div className="flex items-center space-x-4">
            {/* Previous page */}
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Previous page"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Page indicator */}
            <div className="flex items-center space-x-2">
              <AnimatePresence mode="wait">
                {showPageInput ? (
                  <motion.form
                    key="input"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onSubmit={handlePageInputSubmit}
                    className="flex items-center"
                  >
                    <input
                      type="number"
                      value={pageInput}
                      onChange={(e) => setPageInput(e.target.value)}
                      onBlur={handlePageInputBlur}
                      min={1}
                      max={totalPages}
                      className="w-16 px-2 py-1 text-sm text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                  </motion.form>
                ) : (
                  <motion.button
                    key="display"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onClick={() => {
                      setShowPageInput(true);
                      setPageInput(currentPage.toString());
                    }}
                    className="px-3 py-1 text-sm font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                  >
                    {currentPage}
                  </motion.button>
                )}
              </AnimatePresence>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                of {totalPages}
              </span>
            </div>

            {/* Next page */}
            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Next page"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Center - Document title or progress */}
          <div className="flex-1 flex justify-center">
            <div className="flex items-center space-x-4">
              {/* Progress bar */}
              <div className="hidden sm:flex items-center space-x-2">
                <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-blue-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${(currentPage / totalPages) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {Math.round((currentPage / totalPages) * 100)}%
                </span>
              </div>
            </div>
          </div>

          {/* Right side - Zoom and tools */}
          <div className="flex items-center space-x-2">
            {/* Search toggle */}
            <button
              onClick={onSearchToggle}
              className={`p-2 rounded-lg transition-colors ${
                showSearch
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                  : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              title="Search in document"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            {/* More options */}
            <button
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="More options"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PDFControls; 