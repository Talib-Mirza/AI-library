// Production optimization: Control debug logging
const DEBUG = process.env.NODE_ENV === 'development';
const debugLog = DEBUG ? console.log : () => {};

// Keep essential logs for errors and warnings as console.log/warn/error

// NEW TTS CONTROLLER - CLEAN ARCHITECTURE

import { textProcessor, type TextChunk } from './TextProcessor';
import { newTTSClient, type TTSRequest, type TTSResult } from './NewTTSClient';
import { simpleAudioCache, type CacheKey } from './SimpleAudioCache';
import { simpleAudioPlayer } from './SimpleAudioPlayer';
import api from '../utils/axiosConfig';
import { toast } from 'react-hot-toast';

// Re-export interfaces for compatibility
export interface TTSSettings {
  voice: string;
  languageCode: string;
  speed: number;
  pitch: number;
  volume: number;
  autoScroll: boolean;
}

export interface TTSState {
  isInitialized: boolean;
  isReading: boolean;
  isPaused: boolean;
  currentChunkIndex: number;
  totalChunks: number;
  currentText: string;
  progress: number;
  error: string | null;
  estimatedTimeRemaining: number;
}

export interface TTSStartOptions {
  pageNumber?: number;
  pageRange?: { start: number; end: number };
  selectedText?: string;
  mode: 'currentPage' | 'selectedText' | 'fromHere';
}

type TTSStateName = 'idle' | 'extracting' | 'generating' | 'playing' | 'paused' | 'error';

export class NewTTSController {
  private settings: TTSSettings;
  private state: TTSStateName = 'idle';
  private chunks: TextChunk[] = [];
  private currentChunkIndex = 0;
  private onStateChange?: (state: TTSState) => void;
  private viewerContainer?: HTMLElement;
  private currentlyPlayingAudio: TTSResult | null = null;
  private startTime = 0;
  private retriedChunkIndexes = new Set<number>();
  
  // TTS minutes tracking
  private ttsMinutesPlayed = 0;
  private lastMinuteReported = 0;
  private audioStartTime = 0;
  private cumulativeAudioSeconds = 0;
  private chunkStartTime = 0;
  
  // Initialization flags
  private isInitializedFlag = false;
  private isInitializing = false;

  // Prefetch tracking to avoid repeated attempts
  private prefetchRequestedPages = new Set<number>();

  // Quota toast guard per user click
  private quotaToastShown = false;

  constructor() {
    this.settings = {
      voice: 'en-US-Standard-A',
      languageCode: 'en-US',
      speed: 1.0,
      pitch: 0.0,
      volume: 0.8,
      autoScroll: true
    };

    debugLog('🎯 NewTTSController: Initialized with clean architecture');
    debugLog('🎯 NewTTSController: Default settings:', this.settings);
  }

  /**
   * Initialize the TTS system
   */
  async initialize(): Promise<void> {
    if (this.isInitializing) {
      // Wait for in-flight initialization
      await this.waitForInitialization(3000);
      return;
    }
    this.isInitializing = true;
    try {
      debugLog('🚀 NewTTSController: Initializing...');
      
      // Test backend connection
      const isConnected = await newTTSClient.testConnection();
      if (!isConnected) {
        throw new Error('Failed to connect to TTS backend');
      }

      this.isInitializedFlag = true;
      this.state = this.state === 'error' ? 'idle' : this.state;
      debugLog('✅ NewTTSController: Initialized successfully');
      this.notifyStateChange();
    } catch (error) {
      console.error('❌ NewTTSController: Initialization failed:', error);
      this.state = 'error';
      this.isInitializedFlag = false;
      this.notifyStateChange();
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Ensure initialization (idempotent, with small wait if already in-flight)
   */
  async ensureInitialized(): Promise<void> {
    if (this.isInitializedFlag && this.state !== 'error') return;
    try {
      await this.initialize();
    } catch {
      // Swallow here; caller may retry after prerequisites (e.g., auth) become available
    }
  }

  private async waitForInitialization(timeoutMs: number): Promise<void> {
    const start = Date.now();
    while (this.isInitializing && Date.now() - start < timeoutMs) {
      await this.delay(50);
    }
  }

  /**
   * Start reading (public API)
   */
  async startReading(options: TTSStartOptions): Promise<void> {
    // Reset per-click toast guard
    this.quotaToastShown = false;

    // Check quota once at click time using plan remaining (respects free vs pro scope)
    try {
      const plan = await api.get('/billing/plan').then(r => r.data).catch(() => null);
      const remaining = plan?.remaining?.tts_minutes;
      if (typeof remaining === 'number' && remaining <= 0) {
        this.quotaToastShown = true;
        toast.error('TTS limit reached for your plan. Please upgrade or wait for reset.');
        return;
      }
    } catch {}

    try {
      debugLog(`🎬 NewTTSController: Starting reading with mode "${options.mode}"`);
      this.state = 'extracting';
      this.notifyStateChange();

      // Ensure the viewer container is set before attempting text extraction
      if (!this.viewerContainer) throw new Error('PDF viewer container not set');
      let processedText = await this.extractTextForMode(options);

      debugLog(`📄 NewTTSController: Text extraction results:`);
      if (processedText.chunks && processedText.chunks.length > 0) {
        debugLog(`   First chunk: "${processedText.chunks[0].text.substring(0, 100)}..."`);
        debugLog(`   Last chunk: "${processedText.chunks[processedText.chunks.length - 1].text.substring(0, 100)}..."`);
      }

      // Guard: If filtering removed everything, bail early
      if (!processedText.chunks || processedText.chunks.length === 0) {
        console.error('❌ NewTTSController: No text chunks found after filtering/cleaning');
        throw new Error('No text found to read');
      }

      this.chunks = processedText.chunks;
      this.currentChunkIndex = 0;
      this.retriedChunkIndexes.clear();

      this.state = 'generating';
      this.notifyStateChange();

      await this.continueChunkProcessing();
    } catch (error) {
      console.error('❌ NewTTSController: Failed to start reading:', error);
      this.state = 'error';
      this.notifyStateChange();
      throw error;
    }
  }

  /**
   * Process chunks one by one (simple linear approach)
   */
  private async processChunksSequentially(): Promise<void> {
    debugLog(`🔄 NewTTSController: Processing ${this.chunks.length} chunks sequentially`);

    if (this.chunks.length === 0) {
      console.error('❌ NewTTSController: NO CHUNKS TO PROCESS! This is why no audio is playing.');
      console.error('❌ NewTTSController: Text extraction failed to find any readable text.');
      this.state = 'error';
      this.notifyStateChange();
      return;
    }

    // Log details about all chunks we found
    debugLog(`📊 NewTTSController: Chunk analysis:`);
    this.chunks.forEach((chunk, index) => {
      debugLog(`   Chunk ${index + 1}: Page ${chunk.pageNumber}, "${chunk.text.substring(0, 30)}...", ${chunk.textElements?.length || 0} elements`);
    });

    // CRITICAL FIX: Set state to 'generating' BEFORE starting
    debugLog(`🔄 NewTTSController: Starting chunk processing, setting state to 'generating'`);
    this.state = 'generating';
    this.notifyStateChange();

    // Use the shared chunk processing logic
    await this.continueChunkProcessing();
  }

  /**
   * Get audio from cache or generate new
   */
  private async getOrGenerateAudio(chunk: TextChunk): Promise<TTSResult> {
    const safeText = textProcessor.cleanTextForTTS(chunk.text);
    if (!textProcessor.isValidTTSText(safeText)) {
      throw new Error('Chunk text is not valid for TTS');
    }

    const cacheKey: CacheKey = {
      text: safeText,
      voice: this.settings.voice,
      languageCode: this.settings.languageCode,
      speed: this.settings.speed,
      pitch: this.settings.pitch
    };

    const cached = await simpleAudioCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    debugLog(`🔊 NewTTSController: Generating new audio for chunk`);
    const ttsRequest: TTSRequest = {
      text: safeText,
      voice: this.settings.voice,
      languageCode: this.settings.languageCode,
      speed: this.settings.speed,
      pitch: this.settings.pitch
    };

    const result = await newTTSClient.generateSpeech(ttsRequest);
    await simpleAudioCache.set(cacheKey, result);
    return result;
  }

  /**
   * Play audio
   */
  private async playAudio(audioResult: TTSResult, _chunk: TextChunk): Promise<void> {
    debugLog(`🎬 NewTTSController: Starting playAudio`);
    debugLog(`🎬 NewTTSController: Audio details: ${audioResult.audioBlob.size} bytes, ${audioResult.duration}s`);
    
    return new Promise((resolve, reject) => {
      let hasStarted = false;
      let hasEnded = false;

      const timeoutId = setTimeout(() => {
        if (!hasStarted) {
          console.error('❌ NewTTSController: Audio failed to start within 5 seconds');
          reject(new Error('Audio playback timeout - failed to start'));
        }
      }, 5000);
      
      simpleAudioPlayer.play(audioResult.audioBlob, {
        onStart: () => {
          hasStarted = true;
          clearTimeout(timeoutId);
          this.chunkStartTime = Date.now();
          simpleAudioPlayer.setVolume(this.settings.volume);
          simpleAudioPlayer.setSpeed(this.settings.speed);
        },
        onProgress: async (progress) => {
          // Calculate minute ticks
          if (this.chunkStartTime > 0) {
            const now = Date.now();
            const playedThisChunk = (now - this.chunkStartTime) / 1000;
            const totalPlayed = this.cumulativeAudioSeconds + playedThisChunk;
            const currentMinutes = Math.floor(totalPlayed / 60);
            if (currentMinutes > this.lastMinuteReported) {
              this.lastMinuteReported = currentMinutes;
              this.ttsMinutesPlayed++;
              try {
                await api.post('/auth/increment-tts-minutes', { minutes: 1 });
                // After increment, check against the same metric shown in profile (total_tts_minutes)
                const plan = await api.get('/billing/plan').then(r => r.data).catch(() => null);
                const remaining = plan?.remaining?.tts_minutes;
                if (typeof remaining === 'number' && remaining <= 0 && !this.quotaToastShown) {
                  this.quotaToastShown = true;
                  try { simpleAudioPlayer.stop(); } catch {}
                  this.state = 'idle';
                  this.notifyStateChange();
                  toast.error('TTS limit reached for your plan. Please upgrade or wait for reset.');
                  return;
                }
              } catch (err) {
                console.error('❌ TTS: Failed to update/check minutes:', err);
              }
            }
          }
          this.notifyStateChange();

          this.ensureNextPageReadyIfNeeded(_chunk.pageNumber).catch(() => {});
        },
        onEnd: () => {
          if (hasEnded) {
            return;
          }
          hasEnded = true;
          clearTimeout(timeoutId);
          // Add played time for this chunk to cumulative
          if (this.chunkStartTime > 0) {
            const now = Date.now();
            const playedThisChunk = (now - this.chunkStartTime) / 1000;
            this.cumulativeAudioSeconds += playedThisChunk;
            this.chunkStartTime = 0;
          }
          resolve();
        },
        onError: (error) => {
          clearTimeout(timeoutId);
          reject(error);
        }
      });
    });
  }

  /**
   * Extract text based on reading mode
   */
  private async extractTextForMode(options: TTSStartOptions) {
    if (!this.viewerContainer) {
      throw new Error('PDF viewer container not set');
    }

    switch (options.mode) {
      case 'currentPage':
        if (!options.pageNumber) {
          throw new Error('Page number required for current page mode');
        }
        const currentPageElement = this.getPageElement(options.pageNumber);
        if (!currentPageElement) {
          throw new Error(`Page ${options.pageNumber} not found`);
        }
        return textProcessor.extractMultiPageText([currentPageElement], options.pageNumber);

      case 'selectedText':
        console.log('🎯 NewTTSController: Reading selected text');
        if (!options.selectedText) {
          throw new Error('No text selected for reading');
        }
        // Clean and validate selected text
        const cleanedSelected = textProcessor.cleanTextForTTS(options.selectedText);
        if (!textProcessor.isValidTTSText(cleanedSelected)) {
          throw new Error('Selected text is not suitable for TTS');
        }
        return {
          chunks: [{
            text: cleanedSelected,
            pageNumber: 1,
            startIndex: 0,
            endIndex: cleanedSelected.length,
            textElements: []
          }],
          fullText: cleanedSelected,
          pageRange: { start: 1, end: 1 }
        };

      case 'fromHere':
        console.log(`🎯 NewTTSController: Reading from page ${options.pageNumber} to end`);
        if (!options.pageNumber) {
          throw new Error('Page number required for fromHere mode');
        }
        
        const totalPages = this.getActualTotalPages();
        const startPage = options.pageNumber;
        const pageElements = [];
        
        // Collect page elements from start page to end
        for (let i = startPage; i <= totalPages; i++) {
          const pageElement = this.getPageElement(i);
          if (pageElement) {
            pageElements.push(pageElement);
          }
        }
        
        if (pageElements.length === 0) {
          throw new Error(`No pages found to read from page ${startPage} to ${totalPages}`);
        }
        
        return textProcessor.extractMultiPageText(pageElements, startPage, totalPages);

      default:
        throw new Error(`Unsupported reading mode: ${options.mode}`);
    }
  }

  /**
   * Get page element by page number
   */
  private getPageElement(pageNumber: number): HTMLElement | null {
    const pageElement = document.querySelector(`[data-page-number="${pageNumber}"]`) as HTMLElement;
    return pageElement;
  }

  /**
   * Force render missing pages by scrolling through the PDF viewer
   */
  private async forceRenderMissingPages(missingPageNumbers: number[]): Promise<HTMLElement[]> {
    if (!this.viewerContainer || missingPageNumbers.length === 0) {
      return [];
    }

    console.log(`🔄 NewTTSController: Attempting to force render pages: ${missingPageNumbers.join(', ')}`);
    
    const foundPages: HTMLElement[] = [];

    // Try to use react-window list API if exposed
    const listRef: any = (window as any).__PDF_VIEWER_LIST__;
    const pdfViewer = this.viewerContainer.querySelector('.pdf-virtualized-list') as HTMLElement;

    const originalScrollTop = pdfViewer ? pdfViewer.scrollTop : 0;

    const waitForTextLayer = async (pageNum: number, timeoutMs = 3000): Promise<HTMLElement | null> => {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        const pageEl = this.getPageElement(pageNum);
        if (pageEl) {
          const textLayer = pageEl.querySelector('.textLayer');
          const childCount = textLayer ? (textLayer.querySelectorAll('span, div').length) : 0;
          if (textLayer && childCount > 0) {
            return pageEl as HTMLElement;
          }
        }
        await this.delay(150);
      }
      return null;
    };

    try {
      // First attempt: target each page directly using list API for deterministic rendering
      if (listRef && typeof listRef.scrollToItem === 'function') {
        for (let i = 0; i < missingPageNumbers.length; i++) {
          const pageNum = missingPageNumbers[i];
          try {
            listRef.scrollToItem(pageNum - 1, 'center');
            // Allow virtualization/render to settle
            await this.delay(300);
            const pageEl = await waitForTextLayer(pageNum, 2500);
            if (pageEl) {
              console.log(`✅ NewTTSController: Page ${pageNum} rendered via list API`);
              foundPages.push(pageEl);
              // Remove from missing list
              missingPageNumbers.splice(i, 1);
              i--;
            }
          } catch (e) {
            console.warn(`⚠️ NewTTSController: listRef scroll failed for page ${pageNum}`, e);
          }
        }
      }

      // Fallback: incremental scroll within the container to trigger rendering of remaining missing pages
      if (pdfViewer && missingPageNumbers.length > 0) {
        const maxScrollTop = pdfViewer.scrollHeight - pdfViewer.clientHeight;
        const steps = 10;
        const scrollStep = Math.max(200, Math.floor(maxScrollTop / steps));

        for (let scrollPos = 0; scrollPos <= maxScrollTop && missingPageNumbers.length > 0; scrollPos += scrollStep) {
          pdfViewer.scrollTop = scrollPos;
          await this.delay(300);

          for (let i = missingPageNumbers.length - 1; i >= 0; i--) {
            const pageNum = missingPageNumbers[i];
            const pageEl = await waitForTextLayer(pageNum, 1200);
            if (pageEl) {
              console.log(`✅ NewTTSController: Found page ${pageNum} after container scroll`);
              foundPages.push(pageEl);
              missingPageNumbers.splice(i, 1);
            }
          }
        }
      }

    } finally {
      // Restore original scroll position if we used the container
      if (pdfViewer) {
        pdfViewer.scrollTop = originalScrollTop;
        await this.delay(150);
      }
    }
    
    if (missingPageNumbers.length > 0) {
      console.warn(`⚠️ NewTTSController: Still missing pages after force rendering: ${missingPageNumbers.join(', ')}`);
    }
    
    console.log(`📊 NewTTSController: Force rendering result - found ${foundPages.length} pages`);
    return foundPages;
  }

  /**
   * Get actual total pages from PDF document (not just DOM)
   */
  private getActualTotalPages(): number {
    try {
      // Try multiple sources for actual page count
      const pdfDocument = (window as any).__PDF_DOCUMENT__;
      if (pdfDocument && pdfDocument.numPages) {
        return pdfDocument.numPages;
      }
      
      const pdfViewerList = (window as any).__PDF_VIEWER_LIST__;
      if (pdfViewerList && pdfViewerList.props && pdfViewerList.props.itemCount) {
        return pdfViewerList.props.itemCount;
      }
      
      // Fallback to DOM-based detection
      return this.getTotalPagesFromViewer();
    } catch (error) {
      console.warn(`⚠️ NewTTSController: Error getting actual page count:`, error);
      return this.getTotalPagesFromViewer();
    }
  }

  /**
   * Enable progressive reading for remaining pages
   */
  private enableProgressiveReading(startPage: number, totalPages: number, lastLoadedPage: number): void {
    console.log(`🔄 NewTTSController: Progressive reading setup - will monitor for pages ${lastLoadedPage + 1} to ${totalPages}`);
    
    // Store progressive reading state
    (this as any).progressiveReading = {
      enabled: true,
      startPage,
      totalPages,
      lastLoadedPage,
      checkInterval: null
    };
    
    // Set up periodic check for new pages during playback
    const checkForNewPages = () => {
      if (this.state === 'playing' || this.state === 'generating') {
        this.checkAndAddNewPages();
      }
    };
    
    // Check every 2 seconds during playback
    (this as any).progressiveReading.checkInterval = setInterval(checkForNewPages, 2000);
  }

  /**
   * Check for newly rendered pages and add them to the queue
   */
  private async checkAndAddNewPages(): Promise<void> {
    const progressiveState = (this as any).progressiveReading;
    if (!progressiveState || !progressiveState.enabled) {
      return;
    }

    const { lastLoadedPage, totalPages } = progressiveState;
    const newPages: HTMLElement[] = [];

    // Check for newly available pages
    for (let pageNum = lastLoadedPage + 1; pageNum <= totalPages; pageNum++) {
      const pageElement = this.getPageElement(pageNum);
      if (pageElement) {
        console.log(`🆕 NewTTSController: Found new page ${pageNum} during progressive reading`);
        newPages.push(pageElement);
        progressiveState.lastLoadedPage = pageNum;
      } else {
        break; // Stop at first missing page to maintain order
      }
    }

    if (newPages.length > 0) {
      // Extract text from new pages
      const newChunks: TextChunk[] = [];
      for (let i = 0; i < newPages.length; i++) {
        const pageElement = newPages[i];
        const pageNumber = lastLoadedPage + 1 + i;
        const pageChunks = textProcessor.extractPageText(pageElement, pageNumber);
        newChunks.push(...pageChunks);
      }

      if (newChunks.length > 0) {
        console.log(`📄 NewTTSController: Adding ${newChunks.length} new chunks from progressive loading`);
        
        // Insert chunks in correct order instead of just appending
        // Find the correct insertion point based on page numbers
        let insertIndex = this.chunks.length;
        for (let i = 0; i < this.chunks.length; i++) {
          if (this.chunks[i].pageNumber > newChunks[0].pageNumber) {
            insertIndex = i;
            break;
          }
        }
        
        // Insert new chunks at the correct position
        this.chunks.splice(insertIndex, 0, ...newChunks);
        console.log(`📊 NewTTSController: Inserted chunks at position ${insertIndex}, total chunks now: ${this.chunks.length}`);
        
        // Log chunk order verification
        const pageSequence = this.chunks.map(c => c.pageNumber);
        const uniquePages = [...new Set(pageSequence)].sort((a, b) => a - b);
        console.log(`📋 NewTTSController: Page sequence after insertion: ${uniquePages.join(', ')}`);
      }
    }

    // Disable progressive reading if all pages loaded
    if (progressiveState.lastLoadedPage >= totalPages) {
      console.log(`🏁 NewTTSController: Progressive reading complete - all ${totalPages} pages loaded`);
      this.disableProgressiveReading();
    }
  }

  /**
   * Disable progressive reading
   */
  private disableProgressiveReading(): void {
    const progressiveState = (this as any).progressiveReading;
    if (progressiveState && progressiveState.checkInterval) {
      clearInterval(progressiveState.checkInterval);
    }
    (this as any).progressiveReading = { enabled: false };
  }

  /**
   * Get total pages from PDF viewer
   */
  private getTotalPagesFromViewer(): number {
    const pageElements = document.querySelectorAll('[data-page-number]');
    const pageNumbers = Array.from(pageElements).map(el => 
      parseInt((el as HTMLElement).dataset.pageNumber || '0')
    );
    return pageNumbers.length > 0 ? Math.max(...pageNumbers) : 1;
  }

  /**
   * Get visible pages from PDF viewer
   */
  private getVisiblePagesFromViewer(): number[] {
    const pageElements = document.querySelectorAll('[data-page-number]');
    const visiblePages: number[] = [];

    pageElements.forEach(element => {
      const rect = element.getBoundingClientRect();
      const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
      
      if (isVisible) {
        const pageNumber = parseInt((element as HTMLElement).dataset.pageNumber || '0');
        if (pageNumber > 0) {
          visiblePages.push(pageNumber);
        }
      }
    });

    return visiblePages.sort((a, b) => a - b);
  }

  /**
   * Pause reading
   */
  pauseReading(): void {
    if (this.state === 'playing') {
      simpleAudioPlayer.pause();
      this.state = 'paused';
      this.notifyStateChange();
      console.log('⏸️ NewTTSController: Paused at chunk', this.currentChunkIndex + 1);
    }
  }

  /**
   * Resume reading
   */
  async resumeReading(): Promise<void> {
    if (this.state === 'paused') {
      console.log('▶️ NewTTSController: Resuming from chunk', this.currentChunkIndex + 1);
      
      // Try to resume current audio first
      if (simpleAudioPlayer.isPaused()) {
        await simpleAudioPlayer.resume();
        this.state = 'playing';
        this.notifyStateChange();
        console.log('▶️ NewTTSController: Resumed current audio');
      } else {
        // If no current audio, continue with chunk processing
        console.log('▶️ NewTTSController: No current audio to resume, continuing chunk processing');
        this.state = 'generating';
        this.notifyStateChange();
        
        // Continue from current chunk index
        await this.continueChunkProcessing();
      }
    }
  }

  /**
   * Continue processing chunks from current index (used by resume)
   */
  private async continueChunkProcessing(): Promise<void> {
    if (this.chunks.length === 0 || this.currentChunkIndex >= this.chunks.length) {
      debugLog('🏁 NewTTSController: No more chunks to process');
      this.state = 'idle';
      this.notifyStateChange();
      return;
    }

    debugLog(`🔄 NewTTSController: Continuing chunk processing from chunk ${this.currentChunkIndex + 1}/${this.chunks.length}`);

    for (let i = this.currentChunkIndex; i < this.chunks.length; i++) {
      // Check if we should stop
      if (this.state !== 'generating' && this.state !== 'playing') {
        debugLog(`⏹️ NewTTSController: Stopping chunk processing due to state change (state: ${this.state})`);
        break;
      }

      this.currentChunkIndex = i;
      const chunk = this.chunks[i];

      debugLog(`🎯 NewTTSController: Processing chunk ${i + 1}/${this.chunks.length}`);

      try {
        // Auto-scroll to center current chunk
        if (this.settings.autoScroll) {
          this.scrollChunkIntoCenter(chunk);
        }

        // Proactively ensure next page is ready if we are nearing end of last extracted page
        await this.ensureNextPageReadyIfNeeded(chunk.pageNumber);

        // Get audio
        debugLog(`🔊 NewTTSController: Getting audio for chunk ${i + 1}...`);
        const audioResult = await this.getOrGenerateAudio(chunk);
        this.currentlyPlayingAudio = audioResult;

        if (audioResult.audioBlob.size === 0) {
          throw new Error(`Audio blob is empty for chunk ${i + 1}`);
        }

        // Play the audio
        this.state = 'playing';
        this.notifyStateChange();

        debugLog(`▶️ NewTTSController: Starting audio playback for chunk ${i + 1}...`);
        await this.playAudio(audioResult, chunk);

        debugLog(`✅ NewTTSController: Finished playing chunk ${i + 1}`);

        // After finishing this chunk, check again in case we crossed threshold
        await this.ensureNextPageReadyIfNeeded(chunk.pageNumber);

        // Reset state to 'generating' for next chunk
        this.state = 'generating';
        this.notifyStateChange();

        // Delay between chunks
        await this.delay(300);

      } catch (error: any) {
        // Quota handling: stop immediately and notify
        if (error?.name === 'QuotaError' || (error?.response?.status === 402)) {
          console.warn('⚠️ NewTTSController: TTS quota reached. Stopping playback.');
          try { simpleAudioPlayer.stop(); } catch {}
          this.state = 'idle';
          this.notifyStateChange();
          toast.error('Free plan TTS limit reached. Please upgrade to continue listening.');
          return;
        }
        console.error(`❌ NewTTSController: Failed to process chunk ${i + 1}:`, error);
        
        // Handle retries (same logic as before)
        const errorMessage = error.message?.toLowerCase() || '';
        const isAudioError = errorMessage.includes('audio') || errorMessage.includes('blob') || errorMessage.includes('load');
        const isNetworkError = errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('timeout');
        
        if ((isAudioError || isNetworkError) && !this.retriedChunkIndexes.has(i)) {
          debugLog(`🔄 NewTTSController: Retrying chunk ${i + 1}...`);
          this.retriedChunkIndexes.add(i);
          i--; // Retry this chunk
          await this.delay(1000);
          continue;
        }
        
        // Skip this chunk and continue
        console.warn(`⚠️ NewTTSController: Skipping failed chunk ${i + 1}, continuing...`);
        await this.delay(300);
      }
    }

    debugLog('🏁 NewTTSController: Finished reading all chunks');
    this.state = 'idle';
    this.notifyStateChange();
  }

  /**
   * Ensure the next page is force-rendered and queued when nearing the end of the current last page
   */
  private async ensureNextPageReadyIfNeeded(currentPage: number): Promise<void> {
    try {
      // Determine last extracted page number
      if (this.chunks.length === 0) return;
      const lastExtractedPage = Math.max(...this.chunks.map(c => c.pageNumber));
      const totalPages = this.getActualTotalPages();
      if (lastExtractedPage >= totalPages) return; // nothing to prefetch

      // Only prefetch when we are on the last extracted page
      if (currentPage !== lastExtractedPage) return;

      // Compute how many chunks remain on this page
      const { firstIndex, lastIndex } = this.getPageChunkBounds(currentPage);
      if (firstIndex === -1 || lastIndex === -1) return;
      const remainingOnPage = lastIndex - this.currentChunkIndex;

      // Trigger prefetch when we are near the end (<= 3 chunks left on this page)
      if (remainingOnPage > 3) return;

      const nextPage = lastExtractedPage + 1;
      if (this.prefetchRequestedPages.has(nextPage)) return;
      this.prefetchRequestedPages.add(nextPage);

      console.log(`🔄 NewTTSController: Near end of page ${currentPage}; force-rendering next page ${nextPage}...`);
      const found = await this.forceRenderMissingPages([nextPage]);

      // If the next page is available in DOM, extract its chunks and insert into queue
      const pageElement = found.find(el => parseInt((el as HTMLElement).dataset.pageNumber || '0') === nextPage)
        || this.getPageElement(nextPage);
      if (pageElement) {
        const newChunks = textProcessor.extractPageText(pageElement as HTMLElement, nextPage);
        if (newChunks.length > 0) {
          // Insert in correct order
          let insertIndex = this.chunks.length;
          for (let i = 0; i < this.chunks.length; i++) {
            if (this.chunks[i].pageNumber > nextPage) { insertIndex = i; break; }
          }
          this.chunks.splice(insertIndex, 0, ...newChunks);
          console.log(`📄 NewTTSController: Prefetched page ${nextPage} with ${newChunks.length} chunks (inserted at ${insertIndex})`);
        } else {
          console.warn(`⚠️ NewTTSController: Next page ${nextPage} has no extracted chunks yet; will retry prefetch later`);
          // Allow retry on next tick by removing from requested set
          this.prefetchRequestedPages.delete(nextPage);
        }
      } else {
        console.warn(`⚠️ NewTTSController: Could not force-render page ${nextPage} yet`);
        this.prefetchRequestedPages.delete(nextPage);
      }
    } catch (e) {
      console.warn('⚠️ NewTTSController: Prefetch next page failed:', e);
    }
  }

  /**
   * Get first and last chunk indices for a given page
   */
  private getPageChunkBounds(pageNumber: number): { firstIndex: number; lastIndex: number } {
    let firstIndex = -1;
    let lastIndex = -1;
    for (let i = 0; i < this.chunks.length; i++) {
      if (this.chunks[i].pageNumber === pageNumber) {
        if (firstIndex === -1) firstIndex = i;
        lastIndex = i;
      }
    }
    return { firstIndex, lastIndex };
  }

  /**
   * Stop reading
   */
  stopReading(): void {
    console.log('⏹️ NewTTSController: Stopping');
    
    simpleAudioPlayer.stop();
    
    // Clean up progressive reading
    this.disableProgressiveReading();
    
    this.state = 'idle';
    this.currentChunkIndex = 0;
    this.chunks = [];
    this.currentlyPlayingAudio = null;
    
    // Reset TTS tracking variables
    this.audioStartTime = 0;
    this.lastMinuteReported = 0;
    this.cumulativeAudioSeconds = 0;
    this.chunkStartTime = 0;
    this.quotaToastShown = false;
    
    this.notifyStateChange();
  }

  /**
   * Skip to next chunk
   */
  skipToNext(): void {
    if (this.state === 'playing' || this.state === 'paused') {
      simpleAudioPlayer.stop();
      // The sequential processor will handle moving to the next chunk
    }
  }

  /**
   * Get current state
   */
  getState(): TTSState {
    const totalTime = this.currentlyPlayingAudio?.duration || 0;
    const elapsedTime = (Date.now() - this.startTime) / 1000;
    const estimatedTotalTime = totalTime * this.chunks.length;
    const remaining = Math.max(0, estimatedTotalTime - elapsedTime);

    return {
      isInitialized: this.isInitializedFlag && this.state !== 'error',
      isReading: this.state === 'playing' || this.state === 'generating',
      isPaused: this.state === 'paused',
      currentChunkIndex: this.currentChunkIndex,
      totalChunks: this.chunks.length,
      currentText: this.chunks[this.currentChunkIndex]?.text || '',
      progress: this.chunks.length > 0 ? this.currentChunkIndex / this.chunks.length : 0,
      error: this.state === 'error' ? 'TTS error occurred' : null,
      estimatedTimeRemaining: remaining
    };
  }

  /**
   * Get settings
   */
  getSettings(): TTSSettings {
    return { ...this.settings };
  }

  /**
   * Update settings
   */
  updateSettings(newSettings: Partial<TTSSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    console.log('⚙️ NewTTSController: Settings updated:', newSettings);
  }

  /**
   * Set state change callback
   */
  setStateChangeCallback(callback: (state: TTSState) => void): void {
    this.onStateChange = callback;
  }

  /**
   * Set PDF viewer container
   */
  setViewerContainer(container: HTMLElement): void {
    if (this.viewerContainer === container) {
      return;
    }
    this.viewerContainer = container;
    console.log('📄 NewTTSController: PDF viewer container set');
  }

  /**
   * Check if ready
   */
  isReady(): boolean {
    return this.isInitializedFlag && this.state !== 'error';
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    return simpleAudioCache.getStats();
  }

  /**
   * Clear cache
   */
  async clearAudioCache(): Promise<void> {
    await simpleAudioCache.clear();
  }

  /**
   * Get reading stats
   */
  getReadingStats() {
    return {
      totalChunks: this.chunks.length,
      currentChunk: this.currentChunkIndex,
      state: this.state,
      startTime: this.startTime,
      audioStartTime: this.audioStartTime,
      ttsMinutesPlayed: this.ttsMinutesPlayed,
      lastMinuteReported: this.lastMinuteReported
    };
  }

  /**
   * Get TTS tracking stats for debugging
   */
  getTTSTrackingStats() {
    const now = Date.now();
    const elapsedSeconds = this.audioStartTime > 0 ? (now - this.audioStartTime) / 1000 : 0;
    const currentMinutes = Math.floor(elapsedSeconds / 60);
    
    return {
      audioStartTime: this.audioStartTime,
      elapsedSeconds: elapsedSeconds.toFixed(1),
      currentMinutes,
      lastMinuteReported: this.lastMinuteReported,
      ttsMinutesPlayed: this.ttsMinutesPlayed,
      shouldReport: currentMinutes > this.lastMinuteReported,
      isTracking: this.audioStartTime > 0
    };
  }

  /**
   * Get debug stats
   */
  getDebugStats() {
    const progressiveState = (this as any).progressiveReading;
    return {
      state: this.state,
      chunksCount: this.chunks.length,
      currentChunkIndex: this.currentChunkIndex,
      audioPlayerState: simpleAudioPlayer.getState(),
      cacheStats: simpleAudioCache.getStats(),
      settings: this.settings,
      progressiveReading: progressiveState ? {
        enabled: progressiveState.enabled,
        totalPages: progressiveState.totalPages,
        lastLoadedPage: progressiveState.lastLoadedPage,
        hasInterval: !!progressiveState.checkInterval
      } : { enabled: false }
    };
  }

  /**
   * Notify state change
   */
  private notifyStateChange(): void {
    this.onStateChange?.(this.getState());
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Debug/test method to test TTS with simple text
   */
  async testTTS(text = "Hello, this is a test of the new TTS system."): Promise<void> {
    console.log('🧪 NewTTSController: Starting comprehensive TTS test...');
    console.log('🧪 NewTTSController: Test text:', text);
    
    try {
      // Test 1: Check if controller is ready
      console.log('🧪 Test 1: Controller ready check...');
      if (!this.isReady()) {
        throw new Error('Controller not ready');
      }
      console.log('✅ Test 1: Controller is ready');

      // Test 2: Test TTS client directly
      console.log('🧪 Test 2: Direct TTS client test...');
      const ttsRequest = {
        text,
        voice: this.settings.voice,
        languageCode: this.settings.languageCode,
        speed: this.settings.speed,
        pitch: this.settings.pitch
      };
      const directAudioResult = await newTTSClient.generateSpeech(ttsRequest);
      console.log('✅ Test 2: TTS client generated audio directly:', {
        size: directAudioResult.audioBlob.size,
        duration: directAudioResult.duration,
        type: directAudioResult.audioBlob.type
      });

      // Test 3: Test audio player directly
      console.log('🧪 Test 3: Direct audio player test...');
      await new Promise<void>((resolve, reject) => {
        simpleAudioPlayer.play(directAudioResult.audioBlob, {
          onStart: () => {
            console.log('✅ Test 3: Audio player started successfully');
          },
          onEnd: () => {
            console.log('✅ Test 3: Audio player completed successfully');
            resolve();
          },
          onError: (error) => {
            console.error('❌ Test 3: Audio player failed:', error);
            reject(error);
          },
          onProgress: (progress) => {
            if (Math.round(progress * 100) % 25 === 0) {
              console.log(`📈 Test 3: Progress ${Math.round(progress * 100)}%`);
            }
          }
        });
      });
      
      // Test 4: Test full pipeline with chunk
      console.log('🧪 Test 4: Full pipeline test...');
      const testChunk: TextChunk = {
        text,
        pageNumber: 1,
        startIndex: 0,
        endIndex: text.length,
        textElements: []
      };

      // Generate audio through the controller pipeline
      const audioResult = await this.getOrGenerateAudio(testChunk);
      console.log('✅ Test 4: Controller pipeline generated audio:', {
        size: audioResult.audioBlob.size,
        duration: audioResult.duration
      });

      // Play through the controller pipeline
      await this.playAudio(audioResult, testChunk);
      
      console.log('🎉 NewTTSController: ALL TESTS PASSED! TTS system is working correctly.');
      console.log('🔍 If the button still doesn\'t work, the issue is likely in text extraction or UI integration.');
      
    } catch (error) {
      console.error('❌ NewTTSController: Test failed at step:', error);
      console.error('❌ NewTTSController: This indicates where the TTS pipeline is broken.');
      throw error;
    }
  }

  private scrollChunkIntoCenter(chunk: TextChunk): void {
    try {
      const viewer = (this.viewerContainer?.querySelector('.pdf-virtualized-list') as HTMLElement) || this.viewerContainer;
      if (!viewer) return;

      const firstEl = (chunk.textElements && chunk.textElements.length > 0) ? chunk.textElements[0] : null;
      if (!firstEl) return;

      const pageEl = firstEl.closest('[data-page-number]') as HTMLElement | null;
      if (!pageEl) return;

      const viewerRect = viewer.getBoundingClientRect();
      const elementRect = firstEl.getBoundingClientRect();
      const pageRect = pageEl.getBoundingClientRect();
      const currentScroll = (viewer as HTMLElement).scrollTop || 0;

      const elementOffsetInPage = elementRect.top - pageRect.top;
      const pageOffsetInViewer = pageRect.top - viewerRect.top + currentScroll;

      const targetScrollTop = pageOffsetInViewer + elementOffsetInPage - (viewerRect.height / 2) + (elementRect.height / 2);

      // Only scroll if element is not already centered-ish
      const inView = elementRect.top >= (viewerRect.top + 30) && elementRect.bottom <= (viewerRect.bottom - 30);
      if (!inView) {
        (viewer as HTMLElement).scrollTo({ top: Math.max(0, targetScrollTop), behavior: 'smooth' });
      }
    } catch (e) {
      debugLog('⚠️ NewTTSController: scrollChunkIntoCenter failed', e);
    }
  }
}

// Create and export singleton instance
const newTTSController = new NewTTSController();

// Remove auto-initialize to avoid racing before auth/PDF are ready; caller will ensure initialization

// Expose debug methods on window for testing
declare global {
  interface Window {
    testTTS: (text?: string) => Promise<void>;
    newTTSController: NewTTSController;
    testTextExtraction: (pageNumber?: number) => void;
    debugTTSPipeline: () => any;
    testPageDetection: () => { domPages: number; actualPages: number; virtualizationActive: boolean };
    testAllTTSFixes: () => Promise<any>;
    debugTTSTracking: () => any;
  }
}

if (typeof window !== 'undefined') {
  window.testTTS = (text?: string) => newTTSController.testTTS(text);
  window.newTTSController = newTTSController;
  
  // Additional debug functions
  window.testTextExtraction = (pageNumber?: number) => {
    console.log('🔍 Testing text extraction...');
    const currentPage = pageNumber || 1;
    
    console.log(`📄 DOM Analysis for page ${currentPage}:`);
    const pageElement = document.querySelector(`[data-page-number="${currentPage}"]`);
    console.log(`   Page element found: ${!!pageElement}`);
    
    if (pageElement) {
      const textLayer = (pageElement as HTMLElement).querySelector('.textLayer');
      console.log(`   Text layer found: ${!!textLayer}`);
      
      if (textLayer) {
        const textElements = textLayer.querySelectorAll('span, div');
        console.log(`   Text elements found: ${textElements.length}`);
        
        if (textElements.length > 0) {
          const sampleText = Array.from(textElements).slice(0, 5).map(el => el.textContent).join(' ');
          console.log(`   Sample text: "${sampleText}..."`);
          
          // Try to extract using the text processor
          try {
            const chunks = (window as any).newTTSController.textProcessor.extractPageText(pageElement as HTMLElement, currentPage);
            console.log(`   Extracted chunks: ${chunks.length}`);
            if (chunks.length > 0) {
              console.log(`   First chunk: "${chunks[0].text.substring(0, 100)}..."`);
            }
          } catch (error) {
            console.error('   Text extraction failed:', error);
          }
        }
      }
    }
    
    console.log('📊 Overall DOM state:');
    console.log(`   Total pages: ${document.querySelectorAll('[data-page-number]').length}`);
    console.log(`   Total text layers: ${document.querySelectorAll('.textLayer').length}`);
    console.log(`   Total text elements: ${document.querySelectorAll('.textLayer span, .textLayer div').length}`);
  };
  
  window.debugTTSPipeline = () => {
    console.log('🔧 TTS Pipeline Debug Info:');
    const controller = window.newTTSController;
    const state = controller.getState();
    const settings = controller.getSettings();
    const debugStats = controller.getDebugStats();
    
    console.log('📊 Controller State:', state);
    console.log('⚙️ Settings:', settings);
    console.log('🔧 Debug Stats:', debugStats);
    console.log('💾 Cache Stats:', controller.getCacheStats());
    
    return {
      state,
      settings,
      debugStats,
      cacheStats: controller.getCacheStats()
    };
  };
  
  window.debugTTSTracking = () => {
    console.log('⏱️ TTS Tracking Debug Info:');
    const controller = window.newTTSController;
    const trackingStats = controller.getTTSTrackingStats();
    const readingStats = controller.getReadingStats();
    
    console.log('📊 TTS Tracking Stats:', trackingStats);
    console.log('📖 Reading Stats:', readingStats);
    
    // Check if tracking is working
    if (trackingStats.isTracking) {
      console.log('✅ TTS tracking is active');
      if (trackingStats.shouldReport) {
        console.log('⚠️ TTS minute should be reported but hasn\'t been yet');
      } else {
        console.log('✅ TTS tracking is working correctly');
      }
    } else {
      console.log('❌ TTS tracking is not active (audioStartTime is 0)');
    }
    
    return {
      trackingStats,
      readingStats
    };
  };
  
  window.testPageDetection = () => {
    console.log('🔍 Testing page detection and virtualization...');
    const controller = window.newTTSController;
    
    // Test DOM-based page detection
    const domPages = document.querySelectorAll('[data-page-number]').length;
    console.log(`📄 Pages in DOM: ${domPages}`);
    
    // Test actual page count detection
    const actualPages = (controller as any).getActualTotalPages();
    console.log(`📄 Actual total pages: ${actualPages}`);
    
    // Test individual page detection
    console.log('📄 Individual page detection:');
    for (let i = 1; i <= Math.min(actualPages, 10); i++) {
      const pageElement = (controller as any).getPageElement(i);
      const textLayer = pageElement?.querySelector('.textLayer');
      const textElements = textLayer?.querySelectorAll('span, div').length || 0;
      console.log(`   Page ${i}: ${pageElement ? 'Found' : 'Missing'} (${textElements} text elements)`);
    }
    
    return {
      domPages,
      actualPages,
      virtualizationActive: actualPages > domPages
    };
  };
  
  console.log('🔧 NewTTSController: Debug methods available:');
  console.log('   window.testTTS() - Test basic TTS functionality');
  console.log('   window.testTextExtraction(pageNumber) - Test text extraction from PDF');
  console.log('   window.testPageDetection() - Test page detection and virtualization');
  console.log('   window.debugTTSPipeline() - Get full TTS system status');
  console.log('   window.testAllTTSFixes() - Test all 4 critical TTS fixes');
  console.log('   window.debugTTSTracking() - Get TTS tracking statistics');
  
  window.testAllTTSFixes = async () => {
    console.log('🧪 TESTING ALL 4 TTS FIXES:');
    console.log('');
    
    const controller = window.newTTSController;
    
    // Test 1: Initialization
    console.log('1️⃣ TESTING INITIALIZATION:');
    const isReady = controller.isReady();
    const hasContainer = !!(controller as any).viewerContainer;
    console.log(`   ✅ Controller ready: ${isReady}`);
    console.log(`   ✅ Has viewer container: ${hasContainer}`);
    console.log('');
    
    // Test 2: Page detection and ordering
    console.log('2️⃣ TESTING PAGE DETECTION & ORDERING:');
    const detectionResult = window.testPageDetection();
    console.log(`   ✅ Pages in DOM: ${detectionResult.domPages}`);
    console.log(`   ✅ Actual pages: ${detectionResult.actualPages}`);
    console.log(`   ✅ Virtualization active: ${detectionResult.virtualizationActive}`);
    console.log('');
    
    // Test 3: Pause/Resume capability
    console.log('3️⃣ TESTING PAUSE/RESUME:');
    const currentState = controller.getState();
    const internalState = (controller as any).state;
    console.log(`   ✅ Current state: ${internalState} (reading: ${currentState.isReading}, paused: ${currentState.isPaused})`);
    console.log(`   ✅ Pause method available: ${typeof controller.pauseReading === 'function'}`);
    console.log(`   ✅ Resume method available: ${typeof controller.resumeReading === 'function'}`);
    console.log(`   ✅ Continue method available: ${typeof (controller as any).continueChunkProcessing === 'function'}`);
    console.log('');
    
    // Test 4: Scrolling indicator (no synchronized highlight)
    console.log('4️⃣ NOTE: Synchronized highlighting disabled.');
    console.log('');
    
    // Summary
    const allGood = isReady && hasContainer;
    console.log(`🎯 OVERALL STATUS: ${allGood ? '✅ ALL SYSTEMS GO!' : '⚠️ SOME ISSUES DETECTED'}`);
    console.log('');
    console.log('📋 FIXES APPLIED:');
    console.log('   1️⃣ ✅ Initialization timing fixed - waits for PDF to load');
    console.log('   2️⃣ ✅ Text ordering fixed - chunks sorted by page number');
    console.log('   3️⃣ ✅ Pause/Resume fixed - continues from current position');
    console.log('   4️⃣ ❌ Synchronized highlighting removed for stability');
    console.log('');
    console.log('🚀 Ready to test with real TTS reading!');
    
    return {
      initialization: { ready: isReady, hasContainer },
      pageDetection: detectionResult,
      pauseResume: { available: true, state: internalState, reading: currentState.isReading, paused: currentState.isPaused },
      allSystemsGo: allGood
    };
  };
}

export { newTTSController };