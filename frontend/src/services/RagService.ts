import api from '../utils/axiosConfig';

export class QuotaError extends Error { constructor(message: string){ super(message); this.name='QuotaError'; } }

interface EmbedDocumentRequest {
  document_text: string;
  document_id: string;
  metadata?: Record<string, any>;
}

interface EmbedDocumentResponse {
  success: boolean;
  document_id: string;
  message: string;
  chunk_count?: number;
}

interface AskQuestionRequest {
  question: string;
  document_id: string;
  conversation_history?: Array<{ role: string; content: string }>;
}

interface AskQuestionResponse {
  answer: string;
  sources: Array<{
    content: string;
    metadata: Record<string, any>;
  }>;
  document_id: string;
  question: string;
  book?: {
    id: number;
    title: string;
    author: string;
  };
  error?: string;
}

interface DocumentStats {
  document_id: string;
  chunk_count: number;
  metadata: Record<string, any>;
  error?: string;
}

class RagService {
  private async makeRequest<T>(
    endpoint: string,
    data?: any,
    method: 'GET' | 'POST' = 'GET'
  ): Promise<T> {
    try {
      const response = method === 'POST' 
        ? await api.post(`/rag${endpoint}`, data)
        : await api.get(`/rag${endpoint}`);
      
      return response.data;
    } catch (error: any) {
      const status = error.response?.status;
      const errorMessage = error.response?.data?.detail || error.message || 'Unknown error';
      if (status === 402) throw new QuotaError(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Embed a document's text for later querying
   */
  async embedDocument(request: EmbedDocumentRequest): Promise<EmbedDocumentResponse> {
    return this.makeRequest<EmbedDocumentResponse>('/embed', request, 'POST');
  }

  /**
   * Ask a question about a document using RAG
   */
  async askQuestion(request: AskQuestionRequest): Promise<AskQuestionResponse> {
    return this.makeRequest<AskQuestionResponse>('/ask', request, 'POST');
  }

  /**
   * List all documents that have embeddings
   */
  async listEmbeddedDocuments(): Promise<string[]> {
    return this.makeRequest<string[]>('/documents');
  }

  /**
   * Get statistics about a document's embeddings
   */
  async getDocumentStats(documentId: string): Promise<DocumentStats> {
    return this.makeRequest<DocumentStats>(`/documents/${documentId}/stats`);
  }

  /**
   * Delete embeddings for a document
   */
  async deleteDocumentEmbeddings(documentId: string): Promise<{ message: string }> {
    try {
      const response = await api.delete(`/rag/documents/${documentId}`);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Unknown error';
      throw new Error(errorMessage);
    }
  }

  /**
   * Embed a book from the database
   */
  async embedBook(bookId: number): Promise<{
    success: boolean;
    book_id: number;
    document_id: string;
    message: string;
    chunk_count: number;
  }> {
    return this.makeRequest(`/books/${bookId}/embed`, {}, 'POST');
  }

  /**
   * Ask a question about a specific book
   */
  async askQuestionAboutBook(
    bookId: number,
    question: string,
    conversationHistory?: Array<{ role: string; content: string }>
  ): Promise<AskQuestionResponse> {
    return this.makeRequest(`/books/${bookId}/ask`, {
      question,
      conversation_history: conversationHistory,
    }, 'POST');
  }

  /**
   * Get statistics about a book's embeddings
   */
  async getBookStats(bookId: number): Promise<{
    book_id: number;
    chunk_count: number;
    metadata: Record<string, any>;
    error?: string;
    is_embedded: boolean;
  }> {
    return this.makeRequest(`/books/${bookId}/stats`);
  }

  /**
   * Check if a book has been embedded
   */
  async isBookEmbedded(bookId: number): Promise<boolean> {
    try {
      const stats = await this.getBookStats(bookId);
      return stats.is_embedded && stats.chunk_count > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Auto-embed a book if it hasn't been embedded yet
   */
  async autoEmbedBook(bookId: number): Promise<boolean> {
    try {
      const isEmbedded = await this.isBookEmbedded(bookId);
      if (isEmbedded) {
        return true;
      }

      await this.embedBook(bookId);
      return true;
    } catch (error) {
      console.error('Failed to auto-embed book:', error);
      return false;
    }
  }
}

// Create and export a singleton instance
const ragService = new RagService();
export default ragService;

// Export types for use in components
export type {
  EmbedDocumentRequest,
  EmbedDocumentResponse,
  AskQuestionRequest,
  AskQuestionResponse,
  DocumentStats,
}; 