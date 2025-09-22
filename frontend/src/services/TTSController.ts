// TTS CONTROLLER - DELEGATE TO NEW IMPLEMENTATION

import { newTTSController } from './NewTTSController';
import bookService from './BookService';

// Re-export interfaces for compatibility
export interface TTSSettings {
  voice: string;
  languageCode: string;
  speed: number;
  pitch: number;
  volume: number;
  autoScroll: boolean;
  highlightStyle?: {
    backgroundColor?: string;
    animationDuration?: number;
  };
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

// DELEGATE TO NEW IMPLEMENTATION
export class TTSController {
  private ttsMinutesPlayed = 0;
  private lastMinuteReported = 0;

  getState(): TTSState {
    return newTTSController.getState();
  }

  getSettings(): TTSSettings {
    return newTTSController.getSettings();
  }

  isReady(): boolean {
    return newTTSController.isReady();
  }

  setViewerContainer(container: HTMLElement): void {
    newTTSController.setViewerContainer(container);
  }

  setStateChangeCallback(callback: (state: TTSState) => void): void {
    newTTSController.setStateChangeCallback(callback);
  }

  updateSettings(settings: Partial<TTSSettings>): void {
    newTTSController.updateSettings(settings);
  }

  async startReading(options: TTSStartOptions): Promise<void> {
    return newTTSController.startReading(options);
  }

  pauseReading(): void {
    newTTSController.pauseReading();
  }

  async resumeReading(): Promise<void> {
    return newTTSController.resumeReading();
  }

  stopReading(): void {
    newTTSController.stopReading();
  }

  skipToNext(): void {
    newTTSController.skipToNext();
  }

  skipToPrevious(): void {
    // Not implemented in new version - was causing issues
    console.log('Skip to previous not supported in new implementation');
  }

  getCacheStats(): any {
    return newTTSController.getCacheStats();
  }

  async clearAudioCache(): Promise<void> {
    return newTTSController.clearAudioCache();
  }

  getReadingStats(): any {
    return newTTSController.getReadingStats();
  }

  getDebugStats(): any {
    return newTTSController.getDebugStats();
  }

  // Call this method whenever audio playback progresses
  private handleAudioProgress(currentSeconds: number) {
    const currentMinutes = Math.floor(currentSeconds / 60);
    if (currentMinutes > this.lastMinuteReported) {
      this.lastMinuteReported = currentMinutes;
      this.ttsMinutesPlayed++;
      // Update backend/user stats
      bookService.incrementTTSMinutes(this.ttsMinutesPlayed)
        .catch((err: unknown) => console.error('Failed to update TTS minutes:', err));
    }
  }
}

const ttsController = new TTSController();
export { ttsController };
export default TTSController;