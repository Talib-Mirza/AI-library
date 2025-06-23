import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SearchResult {
  pageNumber: number;
  spans: any[];
  matches: Array<{ spanIndex: number; startOffset: number; endOffset: number }>;
}

interface PDFSearchPanelProps {
  searchQuery: string;
  searchResults: SearchResult[];
  onSearch: (query: string) => void;
  onResultClick: (pageNumber: number) => void;
  onClose: () => void;
}

const PDFSearchPanel: React.FC<PDFSearchPanelProps> = ({
  searchQuery,
  searchResults,
  onSearch,
  onResultClick,
  onClose,
}) => {
  const [query, setQuery] = useState(searchQuery);
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when panel opens
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Update local query when prop changes
  useEffect(() => {
    setQuery(searchQuery);
  }, [searchQuery]);

  // Handle search input
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
      setSelectedResultIndex(0);
    }
  }, [query, onSearch]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (searchResults.length > 0) {
        onResultClick(searchResults[selectedResultIndex].pageNumber);
      } else if (query.trim()) {
        onSearch(query.trim());
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedResultIndex(prev => 
        Math.min(prev + 1, searchResults.length - 1)
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedResultIndex(prev => Math.max(prev - 1, 0));
    }
  }, [query, searchResults, selectedResultIndex, onSearch, onResultClick, onClose]);

  // Get context around match
  const getMatchContext = (result: SearchResult, matchIndex: number = 0) => {
    const match = result.matches[matchIndex];
    if (!match || !result.spans[match.spanIndex]) return '';
    
    const span = result.spans[match.spanIndex];
    const text = span.text;
    const start = Math.max(0, match.startOffset - 20);
    const end = Math.min(text.length, match.endOffset + 20);
    
    return {
      before: text.slice(start, match.startOffset),
      match: text.slice(match.startOffset, match.endOffset),
      after: text.slice(match.endOffset, end),
      truncatedStart: start > 0,
      truncatedEnd: end < text.length,
    };
  };

  const totalMatches = searchResults.reduce((sum, result) => sum + result.matches.length, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-16 right-4 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Search Document
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Search Input */}
      <div className="p-4">
        <form onSubmit={handleSearch} className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search in document..."
            className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </form>

        {/* Search Stats */}
        {searchQuery && (
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {totalMatches > 0 ? (
              <>
                {totalMatches} match{totalMatches !== 1 ? 'es' : ''} found
                {searchResults.length > 1 && ` across ${searchResults.length} pages`}
              </>
            ) : (
              'No matches found'
            )}
          </div>
        )}
      </div>

      {/* Search Results */}
      <AnimatePresence>
        {searchResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-gray-200 dark:border-gray-700"
          >
            <div className="max-h-96 overflow-y-auto">
              {searchResults.map((result, index) => {
                const context = getMatchContext(result);
                const isSelected = index === selectedResultIndex;
                
                return (
                  <motion.button
                    key={`${result.pageNumber}-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => onResultClick(result.pageNumber)}
                    className={`w-full text-left p-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        Page {result.pageNumber}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {result.matches.length} match{result.matches.length !== 1 ? 'es' : ''}
                      </span>
                    </div>
                    
                    {context && (
                      <div className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                        {context.truncatedStart && '...'}
                        <span>{context.before}</span>
                        <mark className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">
                          {context.match}
                        </mark>
                        <span>{context.after}</span>
                        {context.truncatedEnd && '...'}
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Hints */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <div>Press <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Enter</kbd> to search or go to result</div>
          <div>Use <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">↑</kbd> <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">↓</kbd> to navigate results</div>
          <div>Press <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Esc</kbd> to close</div>
        </div>
      </div>
    </motion.div>
  );
};

export default PDFSearchPanel; 