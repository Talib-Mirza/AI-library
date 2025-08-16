// SIMPLE AUDIO PLAYER - ONE AUDIO AT A TIME

export interface AudioPlayerState {
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  progress: number; // 0-1
}

export interface AudioPlayerEvents {
  onStart?: () => void;
  onEnd?: () => void;
  onProgress?: (progress: number) => void;
  onError?: (error: Error) => void;
}

export class SimpleAudioPlayer {
  private audio: HTMLAudioElement | null = null;
  private blobUrl: string | null = null;
  private progressTimer: number | null = null;
  private events: AudioPlayerEvents = {};
  private readonly DEBUG = import.meta.env?.MODE === 'development';
  
  // Playback state guards to avoid noisy errors on teardown/startup
  private hasStartedPlayback: boolean = false;
  private suppressErrors: boolean = false;
  
  /**
   * Load and play audio blob
   */
  async play(audioBlob: Blob, events?: AudioPlayerEvents): Promise<void> {
    try {
      if (this.DEBUG) console.debug(`🎵 AudioPlayer: play()`);
      if (this.DEBUG) console.debug(`🎵 AudioPlayer: Blob`, { size: audioBlob.size, type: audioBlob.type });
      
      // Validate audio blob before proceeding
      if (!audioBlob || audioBlob.size === 0) {
        throw new Error('Invalid or empty audio blob');
      }
      
      // Reset guards for a fresh playback
      this.suppressErrors = false;
      this.hasStartedPlayback = false;
      
      // Clean up previous audio with proper timing
      if (this.DEBUG) console.debug(`🧹 AudioPlayer: cleanup previous audio`);
      this.stop();
      
      // Add small delay to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Store events
      this.events = events || {};
      
      // Create new audio element
      this.audio = new Audio();
      
      // Set up event listeners BEFORE setting src to catch all events
      this.setupAudioEvents();
      
      // Create blob URL
      this.blobUrl = URL.createObjectURL(audioBlob);
      
      // Configure audio element
      this.audio.preload = 'auto';
      this.audio.volume = 0.8;
      
      // Wait for audio to be ready with timeout
      await new Promise<void>((resolve, reject) => {
        if (!this.audio) {
          console.error('❌ AudioPlayer: Audio element is null after creation!');
          reject(new Error('Audio element not available'));
          return;
        }
        
        let resolved = false;
        
        // Set up timeout for loading
        const loadTimeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            console.error('❌ AudioPlayer: Audio loading timeout (10 seconds)');
            this.cleanup();
            reject(new Error('Audio loading timeout'));
          }
        }, 10000);
        
        const onLoadedData = () => {
          if (resolved) return;
          resolved = true;
          clearTimeout(loadTimeout);
          this.audio?.removeEventListener('loadeddata', onLoadedData);
          this.audio?.removeEventListener('error', onError);
          this.audio?.removeEventListener('abort', onAbort);
          resolve();
        };
        
        const onError = (e: Event) => {
          if (resolved) return;
          resolved = true;
          clearTimeout(loadTimeout);
          console.error('❌ AudioPlayer: Audio loading error:', e);
          this.audio?.removeEventListener('loadeddata', onLoadedData);
          this.audio?.removeEventListener('error', onError);
          this.audio?.removeEventListener('abort', onAbort);
          this.cleanup();
          reject(new Error('Failed to load audio'));
        };
        
        const onAbort = (e: Event) => {
          if (resolved) return;
          resolved = true;
          clearTimeout(loadTimeout);
          console.warn('⚠️ AudioPlayer: Audio loading aborted:', e);
          this.audio?.removeEventListener('loadeddata', onLoadedData);
          this.audio?.removeEventListener('error', onError);
          this.audio?.removeEventListener('abort', onAbort);
          this.cleanup();
          reject(new Error('Audio loading was aborted'));
        };
        
        this.audio.addEventListener('loadeddata', onLoadedData);
        this.audio.addEventListener('error', onError);
        this.audio.addEventListener('abort', onAbort);
        
        // Set source and start loading
        if (!this.blobUrl) {
          throw new Error('Blob URL is null');
        }
        this.audio.src = this.blobUrl;
        this.audio.load();
      });
      
      // Start playback with retry
      let playbackAttempts = 0;
      const maxAttempts = 3;
      
      while (playbackAttempts < maxAttempts) {
        try {
          await this.audio.play();
          // Mark playback as started to allow real error reporting
          this.hasStartedPlayback = true;
          break; // Success
        } catch (playError) {
          playbackAttempts++;
          console.warn(`⚠️ AudioPlayer: Playback attempt ${playbackAttempts} failed`);
          if (playbackAttempts >= maxAttempts) {
            throw playError;
          }
          await new Promise(resolve => setTimeout(resolve, 150));
        }
      }
      
      // Start progress tracking
      this.startProgressTracking();
      
      // Call onStart callback
      this.events.onStart?.();
      
    } catch (error) {
      console.error('❌ AudioPlayer: Failed to play audio:', error);
      this.cleanup();
      this.events.onError?.(error instanceof Error ? error : new Error('Unknown audio error'));
      throw error;
    }
  }
  
  /**
   * Pause playback
   */
  pause(): void {
    if (this.audio && !this.audio.paused) {
      this.audio.pause();
      this.stopProgressTracking();
      if (this.DEBUG) console.debug(`⏸️ AudioPlayer: Paused`);
    }
  }
  
  /**
   * Resume playback
   */
  async resume(): Promise<void> {
    if (this.audio && this.audio.paused) {
      try {
        await this.audio.play();
        // Playback is active again
        this.hasStartedPlayback = true;
        this.startProgressTracking();
        if (this.DEBUG) console.debug(`▶️ AudioPlayer: Resumed`);
      } catch (error) {
        console.error('❌ AudioPlayer: Failed to resume:', error);
        this.events.onError?.(error instanceof Error ? error : new Error('Resume failed'));
      }
    }
  }
  
  /**
   * Stop playback and cleanup
   */
  stop(): void {
    if (this.DEBUG) console.debug(`⏹️ AudioPlayer: Stopping`);
    
    // Suppress error events that may fire due to teardown
    this.suppressErrors = true;
    this.hasStartedPlayback = false;
    
    this.stopProgressTracking();
    
    if (this.audio) {
      this.audio.pause();
      // Reset src to release the resource, may trigger an error event we suppress
      this.audio.src = '';
      this.audio = null;
    }
    
    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl);
      this.blobUrl = null;
    }
    
    this.events = {};
  }
  
  /**
   * Get current playback state
   */
  getState(): AudioPlayerState {
    if (!this.audio) {
      return {
        isPlaying: false,
        isPaused: false,
        currentTime: 0,
        duration: 0,
        progress: 0
      };
    }
    
    return {
      isPlaying: !this.audio.paused && !this.audio.ended,
      isPaused: this.audio.paused && this.audio.currentTime > 0,
      currentTime: this.audio.currentTime,
      duration: this.audio.duration || 0,
      progress: this.audio.duration > 0 ? this.audio.currentTime / this.audio.duration : 0
    };
  }
  
  /**
   * Set volume (0-1)
   */
  setVolume(volume: number): void {
    if (this.audio) {
      this.audio.volume = Math.max(0, Math.min(1, volume));
    }
  }
  
  /**
   * Set playback speed
   */
  setSpeed(speed: number): void {
    if (this.audio) {
      this.audio.playbackRate = Math.max(0.25, Math.min(4, speed));
    }
  }
  
  /**
   * Set up audio event listeners
   */
  private setupAudioEvents(): void {
    if (!this.audio) return;
    
    this.audio.addEventListener('ended', () => {
      if (this.DEBUG) console.debug(`🏁 AudioPlayer: Playback ended`);
      this.stopProgressTracking();
      this.events.onEnd?.();
    });
    
    this.audio.addEventListener('error', (e) => {
      // Ignore benign errors when we're tearing down or before playback has started
      if (this.suppressErrors || !this.hasStartedPlayback) {
        if (this.DEBUG) console.debug('ℹ️ AudioPlayer: Suppressed audio error event', e);
        return;
      }
      console.error('❌ AudioPlayer: Audio error:', e);
      this.cleanup();
      this.events.onError?.(new Error('Audio playback error'));
    });
    
    this.audio.addEventListener('stalled', () => {
      console.warn('⚠️ AudioPlayer: Audio stalled');
    });
    
    this.audio.addEventListener('waiting', () => {
      console.warn('⚠️ AudioPlayer: Audio waiting (buffering)');
    });
  }
  
  /**
   * Start progress tracking
   */
  private startProgressTracking(): void {
    this.stopProgressTracking();
    
    this.progressTimer = window.setInterval(() => {
      if (this.audio && !this.audio.paused) {
        const progress = this.audio.duration > 0 ? 
          this.audio.currentTime / this.audio.duration : 0;
        this.events.onProgress?.(progress);
      }
    }, 100);
  }
  
  /**
   * Stop progress tracking
   */
  private stopProgressTracking(): void {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
  }
  
  /**
   * Clean up resources
   */
  private cleanup(): void {
    this.stopProgressTracking();
    
    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl);
      this.blobUrl = null;
    }
  }
  
  /**
   * Check if audio is currently playing
   */
  isPlaying(): boolean {
    return this.audio ? !this.audio.paused && !this.audio.ended : false;
  }
  
  /**
   * Check if audio is paused
   */
  isPaused(): boolean {
    return this.audio ? this.audio.paused && this.audio.currentTime > 0 : false;
  }
}

// Export singleton instance
export const simpleAudioPlayer = new SimpleAudioPlayer(); 