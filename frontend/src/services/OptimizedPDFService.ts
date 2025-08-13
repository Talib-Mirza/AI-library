import axios from 'axios';
import pdfjsLib, { PDF_CONFIG, PDF_CONFIG_NO_WORKER, initializePDFWorker } from '../utils/pdfConfig';
import type { PDFDocumentProxy, PDFPageProxy, TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';
import api from '../utils/axiosConfig';
import { getAuthToken } from '../utils/auth';

const API_BASE = ((import.meta as any)?.env?.VITE_API_URL || '/api').replace(/\/$/, '');

export interface PDFImage {
    filename: string;
    path: string;
    page: number;
    index: number;
    format: string;
}

export interface PDFMetadata {
    text_file: string;
    images: Array<{
        filename: string;
        path: string;
        page: number;
        index: number;
        format: string;
    }>;
    total_pages: number;
    total_images: number;
    parsed_at: string;
    original_filename: string;
}

export interface PDFUploadResponse {
    message: string;
    metadata: PDFMetadata;
}

export interface PDFTextSpan {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName: string;
  fontSize: number;
  transform: number[];
}

export interface PDFPageData {
  pageNumber: number;
  viewport: any;
  textSpans: PDFTextSpan[];
  canvas?: HTMLCanvasElement;
  textLayerDiv?: HTMLDivElement; // Text layer container for selection
  textContent?: any; // Raw text content from PDF.js
  rendered: boolean;
  timestamp: number; // For cache management
  renderPromise?: Promise<void>; // Track render state
}

export interface PDFDocumentData {
  document: PDFDocumentProxy;
  numPages: number;
  pages: Map<number, PDFPageData>;
  metadata: any;
  url: string;
  timestamp: number;
}

// Enhanced caching with LRU and memory management
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number = 50) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const item = this.cache.get(key);
    if (item) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, item);
    }
    return item;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used
      const iterator = this.cache.keys().next();
      if (!iterator.done) {
        const firstKey = iterator.value as K;
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Worker pool for managing rendering tasks
class RenderWorkerPool {
  private activeWorkers = new Set<number>();
  private maxWorkers: number;
  private queue: Array<() => Promise<any>> = [];

  constructor(maxWorkers: number = 3) {
    this.maxWorkers = maxWorkers;
  }

  async execute<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const wrappedTask = async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      if (this.activeWorkers.size < this.maxWorkers) {
        this.executeTask(wrappedTask);
      } else {
        this.queue.push(wrappedTask);
      }
    });
  }

  private async executeTask(task: () => Promise<any>): Promise<void> {
    const workerId = Date.now() + Math.random();
    this.activeWorkers.add(workerId);

    try {
      await task();
    } finally {
      this.activeWorkers.delete(workerId);
      
      // Process next task in queue
      if (this.queue.length > 0) {
        const nextTask = this.queue.shift()!;
        this.executeTask(nextTask);
      }
    }
  }
}

class OptimizedPDFService {
    private baseUrl = `${API_BASE}/pdf`;
    private documents: Map<string, PDFDocumentData> = new Map();
    private loadingPromises: Map<string, Promise<PDFDocumentData>> = new Map();
    private pdfBlobs: Map<string, string> = new Map();
    
    // Enhanced caching system
    private pageCache = new LRUCache<string, PDFPageData>(100); // Increased cache size
    private canvasCache = new LRUCache<string, HTMLCanvasElement>(50);
    private textCache = new LRUCache<string, PDFTextSpan[]>(100);
    
    // Worker pool for rendering
    private renderPool = new RenderWorkerPool(3);
    
    // Performance monitoring
    private performanceMetrics = {
      renderTimes: [] as number[],
      cachehits: 0,
      cacheMisses: 0,
    };
    
    private readonly DEBUG = import.meta.env?.MODE === 'development' || (window as any)?.__DEBUG__;

    // Utility methods
    private getCacheKey(pageNumber: number, scale: number, bookId?: number): string {
      return `${bookId || 'default'}-${pageNumber}-${scale.toFixed(2)}`;
    }

    private getCanvasCacheKey(pageNumber: number, scale: number, bookId?: number): string {
      return `canvas-${bookId || 'default'}-${pageNumber}-${scale.toFixed(2)}`;
    }

    private getTextCacheKey(pageNumber: number, bookId?: number): string {
      return `text-${bookId || 'default'}-${pageNumber}`;
    }

    async uploadPDF(file: File): Promise<PDFUploadResponse> {
        const formData = new FormData();
        formData.append('file', file);

        const response = await axios.post<PDFUploadResponse>(
            `${this.baseUrl}/upload`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );

        return response.data;
    }

    async getCachedPDF(filename: string): Promise<PDFMetadata> {
        try {
            const normalizedFilename = filename.replace(/\\/g, '/');
            const fullPath = normalizedFilename.includes('/') ? normalizedFilename : `uploads/${normalizedFilename}`;
            const encodedPath = fullPath.split('/').map(part => encodeURIComponent(part)).join('/');
            
            const response = await axios.get<PDFMetadata>(
                `${this.baseUrl}/cached/${encodedPath}`
            );
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 404) {
                throw new Error('No cached content found for this PDF');
            }
            throw error;
        }
    }

    getImageUrl(imagePath: string): string {
        const [userId, pdfDir, ...rest] = imagePath.split('/');
        const imageFilename = rest[rest.length - 1];
        return `${this.baseUrl}/parsed/${userId}/${pdfDir}/images/${imageFilename}`;
    }

    /**
     * Enhanced document loading with better error handling and worker management
     */
    async loadDocument(url: string, bookId?: number): Promise<PDFDocumentData> {
        const cacheKey = bookId ? `book-${bookId}` : url;
        
        if (this.documents.has(cacheKey)) {
            const cached = this.documents.get(cacheKey)!;
            // Check if document is still fresh (within 30 minutes)
            if (Date.now() - cached.timestamp < 30 * 60 * 1000) {
                return cached;
            }
        }

        if (this.loadingPromises.has(cacheKey)) {
            return this.loadingPromises.get(cacheKey)!;
        }

        const loadingPromise = this.loadDocumentInternal(url, cacheKey, bookId);
        this.loadingPromises.set(cacheKey, loadingPromise);

        try {
            const documentData = await loadingPromise;
            this.documents.set(cacheKey, documentData);
            return documentData;
        } finally {
            this.loadingPromises.delete(cacheKey);
        }
    }

    private async loadDocumentInternal(url: string, cacheKey: string, bookId?: number): Promise<PDFDocumentData> {
        if (this.DEBUG) console.debug(`[OptimizedPDFService] Loading PDF: ${url}`);

        try {
            await initializePDFWorker();
            
            let pdfData: ArrayBuffer | string = url;
            let authHeaders: Record<string, string> | undefined = undefined;
            
            // For authenticated PDFs, prefer streaming via PDF.js with Authorization header
            if (bookId && url.includes('/api/books/')) {
                if (this.DEBUG) console.debug(`[OptimizedPDFService] Preparing authenticated streaming for book ${bookId}`);
                const token = getAuthToken();
                if (token) {
                    authHeaders = { Authorization: `Bearer ${token}` };
                }
                // Keep pdfData as URL to enable range requests and streaming
                pdfData = url;
            }
            
            // Choose config depending on worker readiness
            const useWorker = (pdfjsLib as any).GlobalWorkerOptions?.workerSrc || '';

            let loadingTask = pdfjsLib.getDocument({
                url: typeof pdfData === 'string' ? pdfData : undefined,
                data: typeof pdfData !== 'string' ? pdfData : undefined,
                ...(useWorker ? PDF_CONFIG : PDF_CONFIG_NO_WORKER),
                // Enhanced configuration for performance
                verbosity: 0,
                maxImageSize: 16777216,
                cMapPacked: true,
                enableXfa: false,
                disableFontFace: false,
                disableRange: false,
                disableStream: false,
                httpHeaders: authHeaders,
                rangeChunkSize: 1048576,
            });

            let document: PDFDocumentProxy;
            
            try {
                document = await loadingTask.promise;
                if (this.DEBUG) console.debug(`[OptimizedPDFService] PDF loaded with ${document.numPages} pages`);
            } catch (workerError) {
                console.warn(`[OptimizedPDFService] Primary load failed, trying fallback:`, workerError);
                
                try {
                    loadingTask.destroy();
                } catch (cleanupError) {
                    console.warn('[OptimizedPDFService] Failed to cleanup loading task:', cleanupError);
                }
                
                loadingTask = pdfjsLib.getDocument({
                    url: typeof pdfData === 'string' ? pdfData : undefined,
                    data: typeof pdfData !== 'string' ? pdfData : undefined,
                    ...PDF_CONFIG_NO_WORKER,
                    httpHeaders: authHeaders,
                    rangeChunkSize: 1048576,
                    disableRange: false,
                    disableStream: false,
                });

                document = await loadingTask.promise;
                if (this.DEBUG) console.debug(`[OptimizedPDFService] PDF loaded without worker`);
            }

            const documentData: PDFDocumentData = {
                document,
                numPages: document.numPages,
                pages: new Map(),
                metadata: await document.getMetadata().catch(() => ({})),
                url: url,
                timestamp: Date.now(),
            };

            return documentData;

        } catch (error) {
            console.error(`[OptimizedPDFService] Failed to load PDF:`, error);
            throw new Error(`Failed to load PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Optimized page rendering with enhanced caching and performance monitoring
     */
    async getPage(documentData: PDFDocumentData, pageNumber: number, scale: number = 1.0): Promise<PDFPageData> {
        const cacheKey = this.getCacheKey(pageNumber, scale, this.getBookIdFromDocument(documentData));
        
        // Check cache first
        if (this.pageCache.has(cacheKey)) {
            this.performanceMetrics.cachehits++;
            return this.pageCache.get(cacheKey)!;
        }

        this.performanceMetrics.cacheMisses++;
        
        // Use worker pool for rendering
        return this.renderPool.execute(() => this.renderPageOptimized(documentData, pageNumber, scale, cacheKey));
    }

    private async renderPageOptimized(documentData: PDFDocumentData, pageNumber: number, scale: number, cacheKey: string): Promise<PDFPageData> {
        const startTime = performance.now();
        
        try {
            const page = await documentData.document.getPage(pageNumber);
            const viewport = page.getViewport({ scale });

            // Check if we have a cached canvas at this scale
            const canvasCacheKey = this.getCanvasCacheKey(pageNumber, scale, this.getBookIdFromDocument(documentData));
            let canvas = this.canvasCache.get(canvasCacheKey);

            if (!canvas) {
                // Create optimized canvas
                canvas = this.createOptimizedCanvas(viewport);
                
                const context = canvas.getContext('2d', {
                    alpha: false, // No transparency for better performance
                    desynchronized: true, // Allow async rendering
                    colorSpace: 'srgb', // Standard color space
                })!;

                // Basic render parameters for performance
                const renderContext = {
                    canvasContext: context,
                    viewport: viewport,
                    enableWebGL: false, // Disable WebGL for compatibility
                    renderInteractiveForms: false, // Disable forms for performance
                    textLayerMode: 0, // Disable text rendering mode for canvas
                    // Image optimization
                    optionalContentConfigPromise: undefined as Promise<any> | undefined, // Skip optional content
                };

                // Render with timeout to prevent hanging
                const renderPromise = page.render(renderContext).promise;
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Render timeout')), 30000); // 30s timeout
                });

                await Promise.race([renderPromise, timeoutPromise]);
                
                // Cache the rendered canvas
                this.canvasCache.set(canvasCacheKey, canvas);
            }

            // Get or extract text spans
            const textCacheKey = this.getTextCacheKey(pageNumber, this.getBookIdFromDocument(documentData));
            let textSpans = this.textCache.get(textCacheKey);
            
            if (!textSpans) {
                // Extract text in background to not block rendering
                textSpans = await this.extractTextSpansOptimized(page, viewport);
                this.textCache.set(textCacheKey, textSpans);
            }

            const pageData: PDFPageData = {
                pageNumber,
                viewport,
                textSpans,
                canvas,
                rendered: true,
                timestamp: Date.now(),
            };

            // Cache the complete page data
            this.pageCache.set(cacheKey, pageData);

            // Record performance metrics
            const renderTime = performance.now() - startTime;
            this.performanceMetrics.renderTimes.push(renderTime);
            
            // Keep only last 100 measurements
            if (this.performanceMetrics.renderTimes.length > 100) {
                this.performanceMetrics.renderTimes.shift();
            }

            if (this.DEBUG) console.debug(`[OptimizedPDFService] Page ${pageNumber} rendered in ${renderTime.toFixed(2)}ms`);

            return pageData;

        } catch (error) {
            console.error(`[OptimizedPDFService] Error rendering page ${pageNumber}:`, error);
            throw new Error(`Failed to render page ${pageNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private createOptimizedCanvas(viewport: any): HTMLCanvasElement {
        const canvas = document.createElement('canvas');
        
        // Set dimensions with device pixel ratio consideration
        const outputScale = window.devicePixelRatio || 1;
        const scaledViewport = viewport.clone({ scale: outputScale });
        
        canvas.width = Math.floor(scaledViewport.width);
        canvas.height = Math.floor(scaledViewport.height);
        canvas.style.width = Math.floor(viewport.width) + 'px';
        canvas.style.height = Math.floor(viewport.height) + 'px';

        return canvas;
    }

    /**
     * Optimized text extraction with better performance
     */
    private async extractTextSpansOptimized(page: PDFPageProxy, viewport: any): Promise<PDFTextSpan[]> {
        try {
            // Use Promise.race to timeout text extraction if it takes too long
            const textContent = await Promise.race([
                page.getTextContent({
                    // Type cast for option not present in our local types, but supported by PDF.js
                    ...( { disableCombineTextItems: false } as any ),
                } as any),
                new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Text extraction timeout')), 10000); // 10s timeout
                })
            ]);

            const spans: PDFTextSpan[] = [];

            (textContent as any).items.forEach((item: any) => {
                if ('str' in item && item.str.trim()) {
                    const textItem = item as TextItem;
                    
                    const transform = pdfjsLib.Util.transform(
                        viewport.transform,
                        (textItem as any).transform
                    );

                    spans.push({
                        text: (textItem as any).str,
                        x: transform[4],
                        y: transform[5],
                        width: (textItem as any).width,
                        height: (textItem as any).height,
                        fontName: (textItem as any).fontName,
                        fontSize: Math.abs(transform[0]),
                        transform: (textItem as any).transform,
                    });
                }
            });

            return spans;
        } catch (error) {
            console.warn('[OptimizedPDFService] Text extraction failed, continuing without text:', error);
            return [];
        }
    }

    /**
     * Batch preloading with intelligent prioritization
     */
    async preloadPages(documentData: PDFDocumentData, currentPage: number, scale: number, range: number = 3): Promise<void> {
        const startPage = Math.max(1, currentPage - range);
        const endPage = Math.min(documentData.numPages, currentPage + range);
        
        // Prioritize pages by distance from current page
        const pagesToLoad = [];
        for (let i = startPage; i <= endPage; i++) {
            const cacheKey = this.getCacheKey(i, scale, this.getBookIdFromDocument(documentData));
            if (!this.pageCache.has(cacheKey)) {
                const distance = Math.abs(i - currentPage);
                pagesToLoad.push({ pageNumber: i, distance });
            }
        }

        // Sort by distance (closest pages first)
        pagesToLoad.sort((a, b) => a.distance - b.distance);

        // Load in batches to prevent overwhelming the system
        const batchSize = 3;
        for (let i = 0; i < pagesToLoad.length; i += batchSize) {
            const batch = pagesToLoad.slice(i, i + batchSize);
            const promises = batch.map(({ pageNumber }) => 
                this.getPage(documentData, pageNumber, scale).catch(error => {
                    console.warn(`Failed to preload page ${pageNumber}:`, error);
                })
            );
            
            await Promise.allSettled(promises);
        }
    }

    /**
     * Enhanced search with better performance
     */
    async searchText(documentData: PDFDocumentData, query: string, scale: number = 1.0): Promise<Array<{
        pageNumber: number;
        spans: PDFTextSpan[];
        matches: Array<{ spanIndex: number; startOffset: number; endOffset: number }>;
    }>> {
        const results: Array<{ pageNumber: number; spans: PDFTextSpan[]; matches: Array<{ spanIndex: number; startOffset: number; endOffset: number }>; }> = [];
        const normalizedQuery = query.toLowerCase();

        // Search in batches to prevent blocking
        const batchSize = 10;
        for (let startPage = 1; startPage <= documentData.numPages; startPage += batchSize) {
            const endPage = Math.min(startPage + batchSize - 1, documentData.numPages);
            
            const batchPromises: Array<Promise<any>> = [];
            for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
                batchPromises.push(this.searchPageText(documentData, pageNum, normalizedQuery, scale));
            }

            const batchResults = await Promise.allSettled(batchPromises);
            
            batchResults.forEach((result) => {
                if (result.status === 'fulfilled' && result.value) {
                    results.push(result.value);
                }
            });
        }

        return results;
    }

    private async searchPageText(documentData: PDFDocumentData, pageNumber: number, query: string, scale: number): Promise<{ pageNumber: number; spans: PDFTextSpan[]; matches: Array<{ spanIndex: number; startOffset: number; endOffset: number }>; } | null> {
        try {
            const pageData = await this.getPage(documentData, pageNumber, scale);
            const pageText = pageData.textSpans.map(span => span.text).join(' ').toLowerCase();
            
            if (pageText.includes(query)) {
                const matches: Array<{ spanIndex: number; startOffset: number; endOffset: number }> = [];
                let searchIndex = 0;

                while (searchIndex < pageText.length) {
                    const matchIndex = pageText.indexOf(query, searchIndex);
                    if (matchIndex === -1) break;

                    // Find span containing this match
                    let currentPos = 0;
                    for (let i = 0; i < pageData.textSpans.length; i++) {
                        const spanText = pageData.textSpans[i].text;
                        if (currentPos + spanText.length > matchIndex) {
                            matches.push({
                                spanIndex: i,
                                startOffset: matchIndex - currentPos,
                                endOffset: matchIndex - currentPos + query.length,
                            });
                            break;
                        }
                        currentPos += spanText.length + 1;
                    }

                    searchIndex = matchIndex + 1;
                }

                if (matches.length > 0) {
                    return {
                        pageNumber,
                        spans: pageData.textSpans,
                        matches,
                    };
                }
            }

            return null;
        } catch (error) {
            console.warn(`Search failed for page ${pageNumber}:`, error);
            return null;
        }
    }

    /**
     * Utility methods
     */
    getPDFUrl(bookId: number): string {
        return `${API_BASE}/books/${bookId}/pdf`;
    }

    private getBookIdFromDocument(documentData: PDFDocumentData): number | undefined {
        // Extract book ID from URL if available
        const match = documentData.url.match(/\/api\/books\/(\d+)\/pdf/);
        return match ? parseInt(match[1]) : undefined;
    }

    /**
     * Performance and cache management
     */
    getPerformanceMetrics() {
        const renderTimes = this.performanceMetrics.renderTimes;
        return {
            averageRenderTime: renderTimes.length > 0 ? renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length : 0,
            cacheHitRate: this.performanceMetrics.cachehits / (this.performanceMetrics.cachehits + this.performanceMetrics.cacheMisses) || 0,
            cacheSize: this.pageCache.size(),
            canvasCacheSize: this.canvasCache.size(),
            textCacheSize: this.textCache.size(),
        };
    }

    /**
     * Enhanced cache management
     */
    clearCache(bookId?: number): void {
        if (bookId) {
            const cacheKey = `book-${bookId}`;
            this.documents.delete(cacheKey);
            this.loadingPromises.delete(cacheKey);
            
            // Clean up specific caches
            const keysToDelete = [];
            
            // Find all cache keys for this book
            for (let i = 1; i <= 1000; i++) { // Reasonable upper limit
                for (const scale of [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0]) {
                    keysToDelete.push(this.getCacheKey(i, scale, bookId));
                    keysToDelete.push(this.getCanvasCacheKey(i, scale, bookId));
                    keysToDelete.push(this.getTextCacheKey(i, bookId));
                }
            }

            keysToDelete.forEach(key => {
                this.pageCache.delete(key);
                this.canvasCache.delete(key);
                this.textCache.delete(key);
            });
            
            // Clean up blob URL
            const blobUrl = this.pdfBlobs.get(cacheKey);
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
                this.pdfBlobs.delete(cacheKey);
            }
        } else {
            // Clear all caches
            this.documents.clear();
            this.loadingPromises.clear();
            this.pageCache.clear();
            this.canvasCache.clear();
            this.textCache.clear();
            
            // Clean up all blob URLs
            this.pdfBlobs.forEach(url => URL.revokeObjectURL(url));
            this.pdfBlobs.clear();
        }

        // Reset performance metrics
        this.performanceMetrics = {
            renderTimes: [],
            cachehits: 0,
            cacheMisses: 0,
        };
    }

    /**
     * Memory management - call periodically to clean up old cache entries
     */
    performMaintenence(): void {
        const now = Date.now();
        const maxAge = 10 * 60 * 1000; // 10 minutes

        // This would require extending the LRU cache to support timestamp-based cleanup
        // For now, just log cache status
        if (this.DEBUG) console.debug('[OptimizedPDFService] Cache status:', this.getPerformanceMetrics());
    }

    getDocumentInfo(bookId: number): PDFDocumentData | null {
        const cacheKey = `book-${bookId}`;
        return this.documents.get(cacheKey) || null;
    }

    /**
     * Get page with text layer for text selection
     */
    async getPageWithTextLayer(documentData: PDFDocumentData, pageNumber: number, scale: number = 1.0): Promise<PDFPageData> {
        const cacheKey = this.getCacheKey(pageNumber, scale, this.getBookIdFromDocument(documentData));
        
        // Check cache first
        let pageData = this.pageCache.get(cacheKey);
        if (pageData && pageData.textContent) {
            this.performanceMetrics.cachehits++;
            return pageData;
        }

        this.performanceMetrics.cacheMisses++;

        // Get page without text layer first
        pageData = await this.getPage(documentData, pageNumber, scale);

        // Add text content for text layer rendering
        try {
            const page = await documentData.document.getPage(pageNumber);
            const viewport = page.getViewport({ scale });
            
            const textContent = await page.getTextContent();
            
            // Update page data with text content
            pageData = {
                ...pageData,
                textContent,
                viewport // Ensure viewport is included
            };

            // Update cache with text content
            this.pageCache.set(cacheKey, pageData);
            
        } catch (error) {
            console.warn(`[OptimizedPDFService] Failed to extract text content for page ${pageNumber}:`, error);
        }

        return pageData;
    }
}

// Export singleton instance
const OptimizedPDFServiceInstance = new OptimizedPDFService();
export default OptimizedPDFServiceInstance; 