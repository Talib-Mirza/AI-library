import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import ragService, { QuotaError } from '../services/RagService';
import bookService from '../services/BookService';
import type { Book as BookType } from '../services/BookService';
import type { AskQuestionResponse } from '../services/RagService';
import { getAuthToken, ensureDemoToken } from '../utils/auth';
import '../index.css'; // Import global styles to ensure download button styles are available
import ModernPDFViewer from '../components/pdf/ModernPDFViewer';
import type { PDFTextSpan } from '../services/OptimizedPDFService';
import ErrorBoundary from '../components/ErrorBoundary';
import TTSControls from '../components/TTS/TTSControls';

// Typing animation component
interface TypingAnimationProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
}

const TypingAnimation: React.FC<TypingAnimationProps> = ({ text, speed = 30, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timer);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, text, speed, onComplete]);

  useEffect(() => {
    // Reset when text changes
    setDisplayedText('');
    setCurrentIndex(0);
  }, [text]);

  return (
    <span className="whitespace-pre-wrap leading-relaxed">
      {displayedText}
      {currentIndex < text.length && (
        <span className="animate-pulse bg-blue-500 text-blue-500 rounded">|</span>
      )}
    </span>
  );
};

// Message interface for chat
interface Message {
  role: 'user' | 'assistant' | 'model';
  content: string;
  isTyping?: boolean;
}

const BookDetailsPage = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<BookType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Chat state
  const [selectedText, setSelectedText] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [relevantContext, setRelevantContext] = useState<string>('');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // RAG state
  const [ragStatus, setRagStatus] = useState<'loading' | 'ready' | 'error' | 'embedding'>('loading');
  const [embeddingProgress, setEmbeddingProgress] = useState<string>('');
  
  // PDF viewer state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  
  // PDF viewer container ref for TTS
  const pdfViewerRef = useRef<HTMLDivElement>(null);
  
  // New state for book viewer customization
  const [backgroundColor, setBackgroundColor] = useState('bg-white dark:bg-gray-900');
  const [textColor, setTextColor] = useState('text-gray-700 dark:text-gray-300');
  const [fontSize, setFontSize] = useState('text-base');
  const [previousPage, setPreviousPage] = useState(1);
  const [pageChanged, setPageChanged] = useState(false);
  
  // Background color options
  const backgroundOptions = [
    { name: 'Default', preview: 'bg-white', value: 'bg-white dark:bg-gray-900', textColor: 'text-gray-700 dark:text-gray-300' },
    { name: 'Warm', preview: 'bg-amber-50', value: 'bg-amber-50 dark:bg-amber-950', textColor: 'text-amber-900 dark:text-amber-100' },
    { name: 'Cool', preview: 'bg-blue-50', value: 'bg-blue-50 dark:bg-blue-950', textColor: 'text-blue-900 dark:text-blue-100' },
    { name: 'Soft', preview: 'bg-gray-50', value: 'bg-gray-50 dark:bg-gray-800', textColor: 'text-gray-700 dark:text-gray-300' },
    { name: 'Black', preview: 'bg-gray-900', value: 'bg-gray-900 dark:bg-black', textColor: 'text-white dark:text-white' },
    { name: 'Mint', preview: 'bg-green-50', value: 'bg-green-50 dark:bg-green-950', textColor: 'text-green-900 dark:text-green-100' }
  ];
  
  // Font size options
  const fontSizeOptions = [
    { name: 'Small', value: 'text-sm', label: 'A' },
    { name: 'Normal', value: 'text-base', label: 'A' },
    { name: 'Large', value: 'text-lg', label: 'A' },
    { name: 'X-Large', value: 'text-xl', label: 'A' },
    { name: 'XX-Large', value: 'text-2xl', label: 'A' }
  ];
  
  // Track page changes for animation with debounce
  useEffect(() => {
    if (currentPage !== previousPage && !pageChanged) {
      setPageChanged(true);
      setPreviousPage(currentPage);
      
      // Reset animation flag after animation completes
      const timer = setTimeout(() => {
        setPageChanged(false);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [currentPage, previousPage, pageChanged]);
  
  // Auto-embed book when component loads
  useEffect(() => {
    if (book) {
      const setupRag = async () => {
        try {
          setRagStatus('loading');
          setEmbeddingProgress('Checking if book is already embedded...');
          
          // Check if book is already embedded
          const isEmbedded = await ragService.isBookEmbedded(book.id);
          
          if (isEmbedded) {
            setRagStatus('ready');
            setEmbeddingProgress('');
            console.log(`Book ${book.id} is already embedded and ready for queries`);
          } else {
            setRagStatus('embedding');
            setEmbeddingProgress('Embedding book for AI chat...');
            
            // Embed the book
            const result = await ragService.embedBook(book.id);
            
            setRagStatus('ready');
            setEmbeddingProgress('');
            console.log(`Book ${book.id} embedded successfully with ${result.chunk_count} chunks`);
            toast.success('Book is now ready for AI chat!');
          }
        } catch (error) {
          console.error(`Failed to setup RAG for book ${book.id}:`, error);
          setRagStatus('error');
          setEmbeddingProgress('Failed to prepare book for AI chat');
          toast.error('Failed to prepare book for AI chat. You can still read the book.');
        }
      };
      
      setupRag();
      
      // Start with an empty chat history for the UI
      setChatHistory([]);
    }
  }, [book]);

  // Scroll chat to bottom when messages are added
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);
  
  // Format conversation history for RAG service
  const formatConversationHistory = (history: Message[]): Array<{ role: string; content: string }> => {
    return history.map(msg => ({
      role: msg.role === 'model' ? 'assistant' : msg.role,
      content: msg.content
    }));
  };
  
  const handleSendMessage = async () => {
    if (!chatMessage.trim() || isSending || !book) return;
    
    try {
      setIsSending(true);
      
      // Add user's message to chat
      const newChatHistory: Message[] = [...chatHistory, { role: 'user', content: chatMessage }];
      setChatHistory(newChatHistory);
      
      // Prepare conversation history for RAG service
      const conversationHistory = formatConversationHistory(newChatHistory);
      
      // Build question with selected text context if available
      let question = chatMessage;
      if (selectedText) {
        question = `Context from the book: "${selectedText}"\n\nQuestion: ${chatMessage}`;
        setRelevantContext(`Selected text: ${selectedText}`);
      }
      
      // Send message to RAG service
      const result = await ragService.askQuestionAboutBook(
        book.id,
        question,
        conversationHistory.length > 1 ? conversationHistory.slice(0, -1) : undefined
      );
      
      // Set relevant context from sources
      if (result.sources && result.sources.length > 0) {
        const sourcesText = result.sources.map(source => source.content).join('\n\n');
        setRelevantContext(sourcesText);
      }
      
      // Add response to chat history with typing animation
      setChatHistory([...newChatHistory, { role: 'model', content: result.answer, isTyping: true }]);
      
      // Clear the input and selected text
      setChatMessage('');
      setSelectedText('');
      
    } catch (error: any) {
      console.error('Error sending message:', error);
      if (error instanceof QuotaError || error?.response?.status === 402) {
        toast.error('AI chat limit reached for your plan. Please wait for reset.');
        setChatHistory([...chatHistory, 
          { role: 'user', content: chatMessage },
          { role: 'model', content: "You've reached your AI chat limit for this period. Please wait for reset.", isTyping: true }
        ]);
      } else {
        toast.error('Failed to get response from AI. Please try again.');
        setChatHistory([...chatHistory, 
          { role: 'user', content: chatMessage },
          { role: 'model', content: "I'm sorry, I encountered an error processing your request. Please try again.", isTyping: true }
        ]);
      }
    } finally {
      setIsSending(false);
    }
  };
  
  useEffect(() => {
    const fetchBook = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!bookId) {
          setError("No book ID provided");
          setLoading(false);
          return;
        }
        
        console.log('[BookDetailsPage] Fetching book:', bookId);
        
        // Fetch book details from the API
        const bookData = await bookService.getBookById(parseInt(bookId));
        console.log('[BookDetailsPage] Book data received:', bookData);
        
        if (!bookData) {
          throw new Error('No book data received');
        }
        
        setBook(bookData);
        
      } catch (error: any) {
        console.error('[BookDetailsPage] Error fetching book:', {
          error,
          message: error.message,
          response: error.response?.data,
          stack: error.stack
        });
        const errorMessage = error.response?.status === 401 
          ? "Authentication failed. Please log in again." 
          : "Error loading book details. Please try again later.";
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    
    fetchBook();
  }, [bookId]);
  
  // Ensure we have a token for demo purposes
  useEffect(() => {
    // Only in development mode
    if (import.meta.env.DEV) {
      ensureDemoToken();
    }
  }, []);
  
  // Handle text selection from PDF viewer hover interactions
  const handleTextSelection = (text: string, spans: PDFTextSpan[]) => {
    if (text && text.length > 10) { // Only show for meaningful hover selections
      setSelectedText(text);
      toast.success("Text highlighted! Ask a question about this passage.", {
        icon: '💡',
        position: 'bottom-right',
        duration: 2000
      });
    }
  };
  
  // Handle page change from PDF viewer
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };
  
  // Update the download handler
  const handleDownload = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (!book) return;

    try {
      const { data, type, filename } = await bookService.getBookContent(book.id);
      
      // Create a blob URL from the response data
      const blob = new Blob([data], { type });
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary link and click it
      const link = document.createElement('a');
      link.href = url;
      // Use original filename if available, otherwise fallback to book title
      link.download = filename || `${book.title}.${book.fileType}`;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error downloading file:', error);
      if (error.message?.includes('Unauthorized')) {
        toast.error('Session expired. Please log in again.');
      } else {
        toast.error('Failed to download file. Please try again.');
      }
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/20 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-12 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/30"
        >
          <div className="relative mb-8">
            <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-20 h-20 border-4 border-purple-200 border-r-purple-600 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-bold text-gray-900 dark:text-white mb-2"
          >
            Loading Book
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-gray-600 dark:text-gray-300"
          >
            Preparing your reading experience...
          </motion.p>
        </motion.div>
      </div>
    );
  }
  
  if (error || !book) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/20 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center p-12 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/30 max-w-md"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl flex items-center justify-center"
          >
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </motion.div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {error || "Book Not Found"}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            {error 
              ? "There was an error loading your book." 
              : "The book you're looking for could not be found."}
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/dashboard')}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Return to Dashboard
          </motion.button>
        </motion.div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Enhanced Book Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 dark:from-blue-800 dark:via-purple-800 dark:to-blue-900 rounded-3xl mb-8 overflow-hidden shadow-2xl"
          >
            {/* Animated background patterns */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
            <div className="absolute inset-0">
              <div className="absolute top-0 left-0 w-40 h-40 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute bottom-0 right-0 w-60 h-60 bg-white/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-gradient-to-r from-white/5 to-transparent rounded-full blur-2xl animate-spin" style={{ animationDuration: '20s' }}></div>
            </div>
            
            <div className="relative p-8 md:p-12">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                {/* Book Info Section */}
                <div className="flex flex-col md:flex-row items-center gap-6 flex-1">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                    className="relative group"
                  >
                    <div className="w-32 h-44 md:w-40 md:h-56 rounded-2xl overflow-hidden shadow-2xl transform transition-transform group-hover:scale-105 duration-300">
                      {book.coverUrl ? (
                        <img 
                          src={book.coverUrl} 
                          alt={`Cover of ${book.title}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                          <div className="text-center p-4">
                            <svg className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{book.title}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="absolute -inset-1 bg-white/20 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
                  </motion.div>
                  
                  <div className="text-center md:text-left">
                    <motion.h1 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.6 }}
                      className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 leading-tight"
                    >
                      {book.title}
                    </motion.h1>
                    <motion.p 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4, duration: 0.6 }}
                      className="text-xl text-white/90 mb-4"
                    >
                      by {book.author || 'Unknown Author'}
                    </motion.p>
                    
                    {/* Book metadata */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5, duration: 0.6 }}
                      className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-white/80 text-sm"
                    >
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                        <span className="uppercase font-medium">{book.fileType}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>Added {book.uploadDate ? new Date(book.uploadDate).toLocaleString() : 'Unknown'}</span>
                      </div>
                    </motion.div>
                    
                    {/* Tags */}
                    {book.tags && book.tags.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6, duration: 0.6 }}
                        className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start"
                      >
                        {book.tags.slice(0, 4).map((tag, index) => (
                          <motion.span 
                            key={index}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.7 + index * 0.1 }}
                            className="px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white text-sm rounded-xl border border-white/30"
                          >
                            {tag}
                          </motion.span>
                        ))}
                        {book.tags.length > 4 && (
                          <span className="px-3 py-1.5 bg-white/10 text-white/70 text-sm rounded-xl">
                            +{book.tags.length - 4}
                          </span>
                        )}
                      </motion.div>
                    )}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7, duration: 0.6 }}
                  className="flex flex-col sm:flex-row gap-4"
                >
                  <motion.button 
                    onClick={() => navigate('/dashboard')}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="group relative px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-2xl font-semibold backdrop-blur-sm border border-white/30 transition-all duration-300 overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center">
                      <svg className="w-5 h-5 mr-2 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                      Back to Library
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                  </motion.button>
                  
                  <motion.a 
                    href={`/api/books/${book.id}/content`}
                    download={`${book.title}.${book.fileType}`}
                    onClick={handleDownload}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="group relative px-6 py-3 bg-white hover:bg-gray-50 text-blue-700 rounded-2xl font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center">
                      <svg className="w-5 h-5 mr-2 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 via-blue-600/10 to-blue-600/0 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                  </motion.a>
                </motion.div>
              </div>
            </div>
          </motion.div>
          
          {/* Main Content Area - PDF + Chat */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="grid grid-cols-1 lg:grid-cols-5 gap-8"
          >
            {/* PDF Viewer - takes 3/5 width on large screens, narrower than before */}
            <div className="lg:col-span-3 space-y-4">
              {/* TTS Controls */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                <TTSControls 
                  currentPage={currentPage}
                  totalPages={totalPages}
                  selectedText={selectedText}
                  viewerContainer={pdfViewerRef.current || undefined}
                />
              </motion.div>
              
              <ErrorBoundary>
                <div 
                  ref={pdfViewerRef}
                  className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/30 overflow-hidden"
                >
                  <ModernPDFViewer
                    bookId={book.id}
                    onTextSelect={handleTextSelection}
                    onPageChange={handlePageChange}
                  />
                </div>
              </ErrorBoundary>
            </div>
            
            {/* Chat Interface - takes 2/5 width on large screens, wider than before */}
            <div className="lg:col-span-2">
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/30 h-[85vh] flex flex-col">
                {/* Chat header */}
                <div className="relative p-6 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-3xl overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h2 className="text-xl font-bold text-white">AI Book Assistant</h2>
                        <p className="text-white/90 text-sm">Ask questions or hover over text to highlight</p>
                      </div>
                      {/* RAG Status Indicator */}
                      <div className="flex items-center space-x-2">
                        {ragStatus === 'loading' && (
                          <div className="flex items-center space-x-2 bg-white/20 rounded-full px-3 py-1">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                            <span className="text-white/90 text-xs">Checking...</span>
                          </div>
                        )}
                        {ragStatus === 'embedding' && (
                          <div className="flex items-center space-x-2 bg-white/20 rounded-full px-3 py-1">
                            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce"></div>
                            <span className="text-white/90 text-xs">Preparing...</span>
                          </div>
                        )}
                        {ragStatus === 'ready' && (
                          <div className="flex items-center space-x-2 bg-white/20 rounded-full px-3 py-1">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            <span className="text-white/90 text-xs">Ready</span>
                          </div>
                        )}
                        {ragStatus === 'error' && (
                          <div className="flex items-center space-x-2 bg-white/20 rounded-full px-3 py-1">
                            <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                            <span className="text-white/90 text-xs">Error</span>
                          </div>
                        )}
                       </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Selected text badge */}
                {selectedText && (
                  <div className="m-4 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border border-yellow-200 dark:border-yellow-800/30 rounded-2xl">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-yellow-400 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2M7 4h10M7 4l-2 16h14l-2-16M11 9v4m4-4v4" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-200 mb-1">Highlighted text:</p>
                        <p className="text-sm text-gray-800 dark:text-gray-200 italic leading-relaxed">
                          "{selectedText.length > 500 
                            ? `${selectedText.substring(0, 500)}...` 
                            : selectedText}"
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Relevant context from vector search */}
                {relevantContext && (
                  <div className="mx-4 mb-4">
                    <details className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-200 dark:border-blue-800/30">
                      <summary className="text-sm font-semibold text-blue-800 dark:text-blue-200 p-3 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-2xl transition-colors">
                        📚 AI's context from the book
                      </summary>
                      <div className="p-3 pt-0 text-xs text-blue-700 dark:text-blue-300 border-t border-blue-200 dark:border-blue-800 overflow-auto max-h-32">
                        <pre className="whitespace-pre-wrap font-sans leading-relaxed">{relevantContext}</pre>
                      </div>
                    </details>
                  </div>
                )}
                
                {/* Chat messages */}
                <div 
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto p-4 space-y-4"
                >
                  {chatHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6">
                      <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center mb-6 shadow-lg">
                        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Chat with your book</h3>
                      <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-xs">
                        Ask questions about <span className="font-semibold">"{book.title}"</span> or hover over text to highlight and get insights
                      </p>
                      <div className="space-y-3 w-full max-w-sm">
                        <button 
                          onClick={() => setChatMessage("What is this book about?")}
                          className="w-full text-left p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl text-blue-800 dark:text-blue-300 text-sm hover:from-blue-100 hover:to-purple-100 dark:hover:from-blue-900/40 dark:hover:to-purple-900/40 transition-all duration-300 border border-blue-200/50 dark:border-blue-800/30"
                        >
                          What is this book about?
                        </button>
                        <button 
                          onClick={() => setChatMessage("Who are the main characters?")}
                          className="w-full text-left p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl text-blue-800 dark:text-blue-300 text-sm hover:from-blue-100 hover:to-purple-100 dark:hover:from-blue-900/40 dark:hover:to-purple-900/40 transition-all duration-300 border border-blue-200/50 dark:border-blue-800/30"
                        >
                          Who are the main characters?
                        </button>
                        <button 
                          onClick={() => setChatMessage("Summarize the main themes")}
                          className="w-full text-left p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl text-blue-800 dark:text-blue-300 text-sm hover:from-blue-100 hover:to-purple-100 dark:hover:from-blue-900/40 dark:hover:to-purple-900/40 transition-all duration-300 border border-blue-200/50 dark:border-blue-800/30"
                        >
                          Summarize the main themes
                        </button>
                      </div>
                    </div>
                  ) : (
                    chatHistory.map((message, index) => (
                      <div 
                        key={index} 
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div 
                          className={`max-w-[85%] p-4 rounded-2xl shadow-sm ${
                            message.role === 'user' 
                              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' 
                              : 'bg-white/90 dark:bg-gray-700/90 text-gray-800 dark:text-gray-200 border border-gray-200/50 dark:border-gray-600/50'
                          }`}
                        >
                          {message.role === 'model' && message.isTyping ? (
                            <TypingAnimation 
                              text={message.content}
                              speed={25}
                              onComplete={() => {
                                // Update the message to stop typing animation
                                setChatHistory(prev => 
                                  prev.map((msg, idx) => 
                                    idx === index ? { ...msg, isTyping: false } : msg
                                  )
                                );
                              }}
                            />
                          ) : (
                            <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                  
                  {isSending && (
                    <div className="flex justify-start">
                      <div className="bg-white/90 dark:bg-gray-700/90 border border-gray-200/50 dark:border-gray-600/50 p-4 rounded-2xl text-gray-800 dark:text-gray-200 flex items-center space-x-2 shadow-sm">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Chat input */}
                <div className="p-4 border-t border-gray-200/50 dark:border-gray-700/50">
                  <div className="relative">
                    <input
                      type="text"
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder={
                        ragStatus === 'ready' 
                          ? "Ask about the book or highlighted text..." 
                          : ragStatus === 'embedding' 
                            ? "Preparing book for AI chat..." 
                            : ragStatus === 'error' 
                              ? "AI chat unavailable" 
                              : "Checking book status..."
                      }
                      className="w-full p-4 pr-14 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 backdrop-blur-sm"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={isSending || !chatMessage.trim() || ragStatus !== 'ready'}
                      className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-3 rounded-xl transition-all duration-300 ${
                          isSending || !chatMessage.trim() || ragStatus !== 'ready'
                          ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl hover:scale-105'
                      }`}
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default BookDetailsPage; 
