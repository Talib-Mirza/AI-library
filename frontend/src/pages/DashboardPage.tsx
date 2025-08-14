import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import BookService from '../services/BookService';
import gsap from 'gsap';

// Types
interface Book {
  id: number;
  title: string;
  author: string;
  coverUrl?: string;
  fileType?: string;
  uploadDate?: string;
  tags?: string[];
  filePath?: string;
  userId?: string;
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 100,
      damping: 12
    }
  }
};

const DashboardPage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [books, setBooks] = useState<Book[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchFocused, setSearchFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [tags, setTags] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedPicture, setUploadedPicture] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  
  // Book management state
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [bookToEdit, setBookToEdit] = useState<Book | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editTags, setEditTags] = useState('');
  
  // GSAP animations on mount
  useEffect(() => {
    const tl = gsap.timeline();
    
    // Animate header on mount
    if (headerRef.current) {
      gsap.fromTo(headerRef.current, 
        { opacity: 0, y: 30 },
        { 
          opacity: 1, 
          y: 0, 
          duration: 1.2, 
          ease: "easeOut" 
        }
      );
    }
  }, []);
  
  // Load books from API
  useEffect(() => {
    const loadBooks = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const fetchedBooks = await BookService.getBooks();
        setBooks(fetchedBooks || []);
      } catch (error: any) {
        console.error('Error fetching books:', error);
        setError(error.message || 'Failed to load books. Please try again.');
        toast.error(error.message || 'Failed to load books. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadBooks();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('verified') === '1') {
      toast.success('Your email has been verified. Welcome!');
      // Remove the param from URL without reloading
      const url = new URL(window.location.href);
      url.searchParams.delete('verified');
      window.history.replaceState({}, document.title, url.toString());
    }
  }, [location.search]);
  
  const filteredBooks = books.filter(book => {
    // First filter by category if not 'all'
    if (activeCategory !== 'all' && book.tags) {
      if (!book.tags.some(tag => tag.toLowerCase() === activeCategory.toLowerCase())) {
        return false;
      }
    }
    
    // Then filter by search query
    return book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (book.tags && book.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())));
  });
  
  // Get unique categories from books
  const categories = ['all', ...new Set(books.flatMap(book => book.tags || []))];
  
  const openModal = () => {
    setIsModalOpen(true);
  };
  
  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };
  
  const resetForm = () => {
    setTitle('');
    setAuthor('');
    setTags('');
    setSelectedFile(null);
    setUploadedPicture(null);
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };
  
  const handlePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && event.target.result) {
          setUploadedPicture(event.target.result as string);
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title) {
      toast.error('Please enter a title');
      return;
    }
    
    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create FormData to send file and metadata
      const formData = new FormData();
      formData.append('title', title);
      formData.append('author', author || 'Unknown');
      formData.append('description', ''); // Optional description
      formData.append('file', selectedFile);
      formData.append('tags', tags || '');
      
      // Add cover image if selected
      if (imageInputRef.current?.files?.[0]) {
        formData.append('cover_image', imageInputRef.current.files[0]);
      }
      
      // Upload the book using BookService
      const newBook = await BookService.createBook(formData);
      
      // Update state with the new book
      const updatedBooks = [newBook, ...books];
      setBooks(updatedBooks);
      
      toast.success('Book uploaded successfully!');
      closeModal();
    } catch (error: any) {
      console.error('Error uploading book:', error);
      if (error?.response?.status === 402) {
        const detail = error.response?.data?.detail || 'Upload limit reached for your plan. Please wait for reset.';
        toast.error(detail);
      } else {
        toast.error('Failed to upload book. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle book deletion
  const handleDeleteBook = (book: Book, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation
    e.stopPropagation(); // Prevent event bubbling
    console.log('[DashboardPage] Opening delete modal for book:', {
      id: book.id,
      title: book.title
    });
    setBookToDelete(book);
    setIsDeleteModalOpen(true);
  };
  
  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setBookToDelete(null);
  };
  
  const confirmDelete = async () => {
    if (!bookToDelete) return;
    
    try {
      console.log('[DashboardPage] Attempting to delete book:', {
        id: bookToDelete.id,
        title: bookToDelete.title
      });
      
      setIsSubmitting(true);
      // Delete the book using BookService
      await BookService.deleteBook(bookToDelete.id);
      
      console.log('[DashboardPage] Book deleted successfully');
      
      // Filter out the deleted book from state
      setBooks(prevBooks => prevBooks.filter(book => book.id !== bookToDelete.id));
      
      toast.success('Book deleted successfully');
      closeDeleteModal();
    } catch (error: any) {
      console.error('[DashboardPage] Error deleting book:', {
        error,
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // Handle specific error cases
      if (error.response?.status === 401) {
        toast.error('Session expired. Please log in again.');
      } else if (error.response?.status === 403) {
        toast.error('You do not have permission to delete this book.');
      } else if (error.response?.status === 404) {
        toast.error('Book not found. It may have been already deleted.');
        // Remove from local state if not found on server
        setBooks(prevBooks => prevBooks.filter(book => book.id !== bookToDelete.id));
      } else {
        toast.error(error.message || 'Failed to delete book. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle book editing
  const openEditModal = (book: Book, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation to book details
    e.stopPropagation(); // Prevent event bubbling
    setBookToEdit(book);
    setEditTitle(book.title);
    setEditTags(book.tags?.join(', ') || '');
    setIsEditModalOpen(true);
  };
  
  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setBookToEdit(null);
    setEditTitle('');
    setEditTags('');
  };
  
  const confirmEdit = () => {
    try {
      if (!bookToEdit) return;
      
      // Find and update the book
      const updatedBooks = books.map(book => {
        if (book.id === bookToEdit.id) {
          return {
            ...book,
            title: editTitle,
            tags: editTags.split(',').map(tag => tag.trim()).filter(tag => tag !== '')
          };
        }
        return book;
      });
      
      // Update state
      setBooks(updatedBooks);
      
      toast.success('Book updated successfully');
      closeEditModal();
    } catch (error) {
      console.error('Error updating book:', error);
      toast.error('Failed to update book');
    }
  };
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/20 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-6"></div>
            <div className="absolute inset-0 w-20 h-20 border-4 border-purple-200 border-r-purple-600 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-gray-600 dark:text-gray-300 text-lg font-medium"
          >
            Loading your digital library...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  // Show error state
  if (error && !books.length) {
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
            className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl flex items-center justify-center"
          >
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </motion.div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">Unable to Load Books</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Try Again
          </motion.button>
        </motion.div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/20 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header with gradient background */}
        <motion.div 
          ref={headerRef}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 dark:from-blue-800 dark:via-purple-800 dark:to-blue-900 rounded-3xl mb-12 overflow-hidden shadow-2xl"
        >
          {/* Animated background patterns */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
          <div className="absolute inset-0">
            <div className="absolute top-0 left-0 w-40 h-40 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-60 h-60 bg-white/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-gradient-to-r from-white/5 to-transparent rounded-full blur-2xl animate-spin" style={{ animationDuration: '20s' }}></div>
          </div>
          
          <div className="relative p-8 md:p-12">
            <div className="max-w-4xl">
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="text-4xl md:text-5xl font-bold text-white mb-4 bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent"
              >
                Welcome back, {user?.full_name?.split(' ')[0]}!
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="text-white/90 text-lg md:text-xl mb-8 max-w-2xl"
              >
                Discover, organize, and explore your digital library with AI-powered insights and seamless reading experiences.
              </motion.p>
              
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="flex flex-wrap gap-4"
              >
                <motion.button 
                  onClick={openModal} 
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="group relative px-8 py-4 bg-white hover:bg-gray-50 text-blue-700 rounded-2xl font-bold shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden"
                >
                  <span className="relative z-10 flex items-center">
                    <svg className="w-6 h-6 mr-3 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Upload New Book
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 via-blue-600/10 to-blue-600/0 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                </motion.button>
                
                <motion.div 
                  className="flex items-center space-x-6 text-white/80 text-sm"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                    <span>{books.length} Books</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse delay-300"></div>
                    <span>{categories.length - 1} Categories</span>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </motion.div>
        
        {/* Search and filter section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mb-10"
        >
          <div className="relative mb-6">
            <div className="relative group">
              <input
                type="text"
                placeholder="Search through your digital collection..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className={`w-full p-6 pl-14 pr-6 border-2 ${searchFocused ? 'border-blue-500/50 bg-white/90 dark:bg-gray-800/90' : 'border-gray-200/50 bg-white/60 dark:bg-gray-800/60'} dark:border-gray-700/50 rounded-2xl backdrop-blur-xl transition-all duration-300 shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-500/20 text-lg`}
              />
              <svg 
                className={`w-6 h-6 absolute left-4 top-1/2 transform -translate-y-1/2 transition-colors duration-300 ${searchFocused ? 'text-blue-500' : 'text-gray-400'}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
            </div>
          </div>
          
          {/* Category filters */}
          <div className="flex flex-wrap gap-3">
            {categories.map((category) => (
              <motion.button
                key={category}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveCategory(category)}
                className={`px-6 py-3 rounded-2xl font-medium transition-all duration-300 backdrop-blur-xl relative overflow-hidden group ${
                  activeCategory === category
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transform scale-105'
                    : 'bg-white/60 dark:bg-gray-800/60 hover:bg-white/80 dark:hover:bg-gray-800/80 text-gray-700 dark:text-gray-300 border border-gray-200/50 dark:border-gray-700/50'
                }`}
              >
                <span className="relative z-10 capitalize">
                  {category === 'all' ? 'All Books' : category}
                </span>
                {activeCategory !== category && (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                )}
              </motion.button>
            ))}
          </div>
        </motion.div>
        
        {/* Books grid */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
        >
          {filteredBooks.map(book => (
            <BookCard 
              key={book.id} 
              book={book} 
              onDelete={(e) => handleDeleteBook(book, e)}
              onEdit={(e) => openEditModal(book, e)}
            />
          ))}
        </motion.div>
        
        {/* Empty state */}
        {filteredBooks.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-center py-20 mt-8 bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-3xl shadow-lg border border-white/20 dark:border-gray-700/30"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
              className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-400 to-gray-600 rounded-2xl flex items-center justify-center"
            >
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </motion.div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">No books found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
              {searchQuery ? `No books match "${searchQuery}"` : `No books in ${activeCategory === 'all' ? 'your library' : activeCategory} category`}
            </p>
            <motion.button 
              onClick={openModal}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }} 
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Upload Your First Book
            </motion.button>
          </motion.div>
        )}
      </div>
      
      {/* Upload Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 border border-white/20 dark:border-gray-700/30 relative overflow-hidden max-h-[85vh] overflow-y-auto"
            >
              {/* Glass effect overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-3xl"></div>
              
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-6 sm:mb-8">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">Upload New Book</h2>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Add a new book to your digital library</p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={closeModal}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </motion.button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                  <div>
                    <label htmlFor="title" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-700/50 dark:text-white backdrop-blur-sm transition-all duration-300"
                      placeholder="Enter book title"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="author" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Author
                    </label>
                    <input
                      type="text"
                      id="author"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-700/50 dark:text-white backdrop-blur-sm transition-all duration-300"
                      placeholder="Enter author name"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="tags" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Tags
                    </label>
                    <input
                      type="text"
                      id="tags"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-700/50 dark:text-white backdrop-blur-sm transition-all duration-300"
                      placeholder="Enter tags (comma separated)"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Book File *
                    </label>
                    <div className="relative group">
                      <div className="flex justify-center px-6 pt-8 pb-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-300 cursor-pointer group-hover:bg-blue-50/50 dark:group-hover:bg-blue-900/10">
                        <div className="space-y-2 text-center">
                          <svg
                            className="mx-auto h-12 w-12 text-gray-400 group-hover:text-blue-500 transition-colors duration-300"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            <label
                              htmlFor="file-upload"
                              className="cursor-pointer font-medium text-blue-600 hover:text-blue-500 transition-colors duration-200"
                            >
                              Click to upload
                            </label>
                            <span> or drag and drop</span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            PDF, EPUB, or TXT up to 10MB
                          </p>
                          {selectedFile && (
                            <motion.p 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-sm text-blue-600 dark:text-blue-400 font-medium"
                            >
                              ✓ Selected: {selectedFile.name}
                            </motion.p>
                          )}
                        </div>
                      </div>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={handleFileChange}
                        accept=".pdf,.epub,.txt"
                        ref={fileInputRef}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Cover Image (Optional)
                    </label>
                    <div className="flex items-center space-x-4">
                      <div className="w-24 h-32 bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-600">
                        {uploadedPicture ? (
                          <img
                            src={uploadedPicture}
                            alt="Book cover preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePictureChange}
                          ref={imageInputRef}
                          className="hidden"
                        />
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => imageInputRef.current?.click()}
                          className="w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl text-gray-600 dark:text-gray-400 hover:border-blue-500 dark:hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-300"
                        >
                          Choose Cover Image
                        </motion.button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-4 pt-4">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={closeModal}
                      className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-2xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      type="submit"
                      disabled={isSubmitting}
                      whileHover={!isSubmitting ? { scale: 1.02 } : {}}
                      whileTap={!isSubmitting ? { scale: 0.98 } : {}}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                    >
                      <span className="relative z-10 flex items-center justify-center">
                        {isSubmitting ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Uploading...
                          </>
                        ) : (
                          'Upload Book'
                        )}
                      </span>
                      {!isSubmitting && (
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                      )}
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Delete Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full p-8 border border-white/20 dark:border-gray-700/30 relative overflow-hidden"
            >
              {/* Glass effect overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-3xl"></div>
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Delete Book</h2>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">This action cannot be undone</p>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={closeDeleteModal}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </motion.button>
                </div>
                
                <div className="mb-8">
                  <p className="text-gray-700 dark:text-gray-300 mb-4">
                    Are you sure you want to delete <span className="font-semibold text-gray-900 dark:text-white">"{bookToDelete?.title}"</span>?
                  </p>
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-2xl p-4">
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 19c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span className="text-red-800 dark:text-red-200 text-sm font-medium">
                        This will permanently remove the book from your library
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={closeDeleteModal}
                    className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-2xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={confirmDelete}
                    disabled={isSubmitting}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                  >
                    <span className="relative z-10 flex items-center justify-center">
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Deleting...
                        </>
                      ) : (
                        'Delete Book'
                      )}
                    </span>
                    {!isSubmitting && (
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Edit Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full p-8 border border-white/20 dark:border-gray-700/30 relative overflow-hidden"
            >
              {/* Glass effect overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-3xl"></div>
              
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Edit Book</h2>
                    <p className="text-gray-600 dark:text-gray-400">Update your book information</p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={closeEditModal}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </motion.button>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <label htmlFor="editTitle" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      id="editTitle"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-700/50 dark:text-white backdrop-blur-sm transition-all duration-300"
                      placeholder="Enter book title"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="editTags" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Tags
                    </label>
                    <input
                      type="text"
                      id="editTags"
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-700/50 dark:text-white backdrop-blur-sm transition-all duration-300"
                      placeholder="Enter tags (comma separated)"
                    />
                  </div>
                  
                  <div className="flex gap-4 pt-4">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={closeEditModal}
                      className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-2xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={confirmEdit}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden group"
                    >
                      <span className="relative z-10">Update Book</span>
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Updated Book Card Component with actions
interface BookProps {
  book: Book;
  onDelete: (e: React.MouseEvent) => void;
  onEdit: (e: React.MouseEvent) => void;
}

const BookCard = ({ book, onDelete, onEdit }: BookProps) => {
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ 
        y: -8, 
        scale: 1.02,
        transition: { duration: 0.3, ease: "easeOut" } 
      }}
      className="group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-lg hover:shadow-2xl overflow-hidden border border-white/20 dark:border-gray-700/30 transition-all duration-300"
    >
      {/* Action buttons with improved design */}
      <div className="absolute top-3 right-3 z-20 flex space-x-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onEdit}
          className="p-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl shadow-lg backdrop-blur-sm transition-all duration-200"
          aria-label="Edit book"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onDelete}
          className="p-2.5 bg-red-500 hover:bg-red-600 text-white rounded-2xl shadow-lg backdrop-blur-sm transition-all duration-200"
          aria-label="Delete book"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </motion.button>
      </div>
      
      <Link to={`/books/${book.id}`} className="block">
        {/* Book Cover Section */}
        <div className="relative pb-[140%] overflow-hidden rounded-t-3xl">
          {book.coverUrl ? (
            <motion.img 
              src={book.coverUrl} 
              alt={`Cover of ${book.title}`}
              className="absolute inset-0 w-full h-full object-cover"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              onError={(e) => {
                console.error(`[BookCard] Image failed to load for ${book.title}`);
              }}
            />
          ) : (
            <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
              <div className="text-center p-4">
                <svg className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{book.title}</p>
              </div>
            </div>
          )}
          
          {/* File type badge */}
          <motion.span 
            initial={{ scale: 0.9, opacity: 0.8 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute top-3 left-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl uppercase shadow-lg backdrop-blur-sm"
          >
            {book.fileType}
          </motion.span>
          
          {/* Quick view overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              whileHover={{ scale: 1, opacity: 1 }}
              className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl px-4 py-2 shadow-xl"
            >
              <span className="text-gray-800 dark:text-gray-200 text-sm font-semibold">View Book</span>
            </motion.div>
          </div>
        </div>
        
        {/* Book Information Section */}
        <div className="p-5 space-y-3">
          <div>
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
              {book.title}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
              by {book.author || 'Unknown Author'}
            </p>
          </div>
          
          {/* Upload date with icon */}
          <div className="flex items-center text-gray-500 dark:text-gray-500 text-xs">
            <svg className="w-3 h-3 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Added {book.uploadDate ? new Date(book.uploadDate).toLocaleDateString() : ''}</span>
          </div>
          
          {/* Tags */}
          {book.tags && book.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {book.tags.slice(0, 3).map((tag, index) => (
                <motion.span 
                  key={index}
                  initial={{ scale: 0.9, opacity: 0.8 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="text-xs bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-lg font-medium border border-blue-200/50 dark:border-blue-700/50"
                >
                  {tag}
                </motion.span>
              ))}
              {book.tags.length > 3 && (
                <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1">
                  +{book.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
        
        {/* Bottom gradient for depth */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </Link>
    </motion.div>
  );
};

export default DashboardPage; 
