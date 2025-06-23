import axios from 'axios';
import { getAuthToken } from '../utils/auth';
import api from '../utils/axiosConfig';

export interface Book {
  id: number;
  title: string;
  author: string;
  description?: string;
  coverUrl?: string;
  cover_image_url?: string;  // Backend field name
  fileType?: string;
  file_type?: string;  // snake_case version
  uploadDate?: string;
  upload_date?: string;  // snake_case version
  pageCount?: number;
  page_count?: number;  // snake_case version
  tags?: string[];
  filePath?: string;
  file_path?: string;  // snake_case version
  originalFilename?: string;
  original_filename?: string;  // snake_case version
  isProcessed?: boolean;
  is_processed?: boolean;  // snake_case version
  processingError?: string;
  processing_error?: string;  // snake_case version
  fileSize?: number;
  file_size?: number;  // snake_case version
  bookmarks?: { id: number; page: number; title: string }[];
  highlights?: { id: number; page: number; content: string; position_data?: string }[];
  annotations?: { id: number; page: number; content: string; position_data?: string }[];
}

class BookService {
  // Get all books for the current user
  async getBooks() {
    try {
      console.log('[BookService] Fetching all books');
      const response = await api.get('/books/');
      console.log('[BookService] Books response:', response.data);
      
      // Map backend fields to frontend fields
      const books = response.data.items.map((book: any) => ({
        ...book,
        coverUrl: book.cover_image_url || book.coverUrl,
        fileType: book.file_type || book.fileType,
        uploadDate: book.created_at || book.upload_date || book.uploadDate,
        pageCount: book.page_count || book.pageCount,
        filePath: book.file_path || book.filePath,
        isProcessed: book.is_processed !== undefined ? book.is_processed : book.isProcessed,
        processingError: book.processing_error || book.processingError,
        fileSize: book.file_size || book.fileSize,
      }));
      
      return books;
    } catch (error: any) {
      console.error('[BookService] Error in getBooks:', error);
      if (error.response?.status === 401) {
        throw new Error('Unauthorized: Please log in again');
      }
      if (error.response?.status === 307) {
        // Handle redirect by retrying with the correct URL
        try {
          const response = await api.get('/books/');
          const books = response.data.items.map((book: any) => ({
            ...book,
            coverUrl: book.cover_image_url || book.coverUrl,
            fileType: book.file_type || book.fileType,
            uploadDate: book.created_at || book.upload_date || book.uploadDate,
            pageCount: book.page_count || book.pageCount,
            filePath: book.file_path || book.filePath,
            isProcessed: book.is_processed !== undefined ? book.is_processed : book.isProcessed,
            processingError: book.processing_error || book.processingError,
            fileSize: book.file_size || book.fileSize,
          }));
          return books;
        } catch (retryError: any) {
          console.error('[BookService] Error after redirect:', retryError);
          throw retryError;
        }
      }
      throw error;
    }
  }

  // Get a specific book by ID
  async getBook(bookId: number): Promise<Book> {
    try {
      console.log('[BookService] Fetching book with ID:', bookId);
      const response = await api.get(`/books/${bookId}`);
      const bookData = response.data;
      
      console.log('[BookService] Book response:', {
        data: bookData,
        fileType: bookData?.fileType,
        hasFileType: 'fileType' in (bookData || {})
      });
      
      // Ensure required fields are present
      if (!bookData) {
        throw new Error('No book data received');
      }
      
      if (!bookData.fileType) {
        console.warn('[BookService] Book missing fileType, defaulting to PDF');
        bookData.fileType = 'pdf';
      }
      
      // Map backend fields to frontend fields
      const mappedBook = {
        ...bookData,
        coverUrl: bookData.cover_image_url || bookData.coverUrl,
        fileType: bookData.file_type || bookData.fileType,
        uploadDate: bookData.created_at || bookData.upload_date || bookData.uploadDate,
        pageCount: bookData.page_count || bookData.pageCount,
        filePath: bookData.file_path || bookData.filePath,
        isProcessed: bookData.is_processed !== undefined ? bookData.is_processed : bookData.isProcessed,
        processingError: bookData.processing_error || bookData.processingError,
        fileSize: bookData.file_size || bookData.fileSize,
      };
      
      return mappedBook;
    } catch (error: any) {
      console.error('[BookService] Error in getBook:', {
        error,
        message: error.message,
        response: error.response?.data,
        stack: error.stack
      });
      
      if (error.response?.status === 401) {
        throw new Error('Please log in to access this book');
      } else if (error.response?.status === 403) {
        throw new Error('You do not have permission to access this book');
      } else if (error.response?.status === 404) {
        throw new Error('Book not found');
      } else {
        throw new Error(error.response?.data?.detail || 'Failed to load book');
      }
    }
  }

  // Alias for getBook to maintain compatibility
  async getBookById(bookId: number): Promise<Book> {
    return this.getBook(bookId);
  }

  // Get book content by ID
  async getBookContent(bookId: number) {
    try {
      console.log('[BookService] Fetching book content:', { 
        bookId,
        url: `/books/${bookId}/content`,
        params: { processed: true }
      });
      
      const response = await api.get(`/books/${bookId}/content`, {
        params: {
          processed: true
        },
        validateStatus: function (status) {
          return status >= 200 && status < 300; // Only accept success status codes
        }
      });
      
      console.log('[BookService] Content response:', {
        status: response.status,
        hasData: !!response.data,
        contentType: typeof response.data,
        headers: response.headers,
        dataPreview: JSON.stringify(response.data).slice(0, 200) + '...'
      });
      
      // Validate response structure
      if (!response.data || typeof response.data !== 'object') {
        console.error('[BookService] Invalid response data:', {
          data: response.data,
          type: typeof response.data
        });
        throw new Error('Invalid response data structure');
      }
      
      return response.data;
    } catch (error: any) {
      console.error('[BookService] Error fetching content:', {
        error,
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack,
        config: error.config
      });
      
      if (error.response?.status === 401) {
        throw new Error('Please log in to access this book');
      } else if (error.response?.status === 403) {
        throw new Error('You do not have permission to access this book');
      } else if (error.response?.status === 404) {
        throw new Error('Book not found or file is missing');
      } else if (error.response?.status === 400) {
        throw new Error(error.response.data.detail || 'This file type is not supported for preview');
      } else if (!error.response) {
        throw new Error('Network error: Please check your connection');
      } else {
        throw new Error(error.response?.data?.detail || error.message || 'Failed to load book content');
      }
    }
  }

  // Add a bookmark
  async addBookmark(bookId: number, bookmark: { page: number; title: string }) {
    try {
      const response = await api.post(`/books/${bookId}/bookmarks`, bookmark);
      return response.data;
    } catch (error) {
      console.error('Error adding bookmark:', error);
      throw error;
    }
  }

  // Add a highlight
  async addHighlight(bookId: number, highlight: { page: number; content: string; position_data?: string }) {
    try {
      const response = await api.post(`/books/${bookId}/highlights`, highlight);
      return response.data;
    } catch (error) {
      console.error('Error adding highlight:', error);
      throw error;
    }
  }

  // Add an annotation
  async addAnnotation(bookId: number, annotation: { page: number; content: string; position_data?: string }) {
    try {
      const response = await api.post(`/books/${bookId}/annotations`, annotation);
      return response.data;
    } catch (error) {
      console.error('Error adding annotation:', error);
      throw error;
    }
  }

  // Create a new book with file upload
  async createBook(formData: FormData) {
    try {
      // Use the configured api instance which already handles auth headers
      const response = await api.post('/books/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const bookData = response.data;
      
      console.log('[BookService] Create book response:', {
        data: bookData,
        coverImageUrl: bookData?.cover_image_url,
        fileType: bookData?.file_type
      });
      
      // Map backend fields to frontend fields (same as getBook)
      const mappedBook = {
        ...bookData,
        coverUrl: bookData.cover_image_url || bookData.coverUrl,
        fileType: bookData.file_type || bookData.fileType,
        uploadDate: bookData.created_at || bookData.upload_date || bookData.uploadDate,
        pageCount: bookData.page_count || bookData.pageCount,
        filePath: bookData.file_path || bookData.filePath,
        isProcessed: bookData.is_processed !== undefined ? bookData.is_processed : bookData.isProcessed,
        processingError: bookData.processing_error || bookData.processingError,
        fileSize: bookData.file_size || bookData.fileSize,
      };
      
      console.log('[BookService] Mapped book data:', {
        original: bookData,
        mapped: mappedBook,
        coverUrl: mappedBook.coverUrl
      });
      
      return mappedBook;
    } catch (error) {
      console.error('Error creating book:', error);
      throw error;
    }
  }

  // Delete a book
  async deleteBook(bookId: number) {
    try {
      console.log('[BookService] Deleting book:', { bookId });
      const response = await api.delete(`/books/${bookId}`);
      console.log('[BookService] Delete response:', {
        status: response.status,
        data: response.data
      });
      return response.data;
    } catch (error: any) {
      console.error('[BookService] Error deleting book:', {
        error,
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      if (error.response?.status === 401) {
        throw new Error('Session expired. Please log in again.');
      } else if (error.response?.status === 403) {
        throw new Error('You do not have permission to delete this book.');
      } else if (error.response?.status === 404) {
        throw new Error('Book not found. It may have been already deleted.');
      } else {
        throw new Error(error.response?.data?.detail || 'Failed to delete book');
      }
    }
  }
}

export default new BookService(); 