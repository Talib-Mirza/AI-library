import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TTSState, TTSSettings, TTSStartOptions } from '../../services/NewTTSController';
import { newTTSController } from '../../services/NewTTSController';
import { newTTSClient } from '../../services/NewTTSClient';
import { QuotaError } from '../../services/NewTTSClient';

interface TTSControlsProps {
  currentPage: number;
  totalPages: number;
  selectedText?: string;
  viewerContainer?: HTMLElement;
  className?: string;
}

const TTSControls: React.FC<TTSControlsProps> = ({
  currentPage,
  totalPages,
  selectedText,
  viewerContainer,
  className = ''
}) => {
  const [ttsState, setTtsState] = useState<TTSState>(newTTSController.getState());
  const [settings, setSettings] = useState<TTSSettings>(newTTSController.getSettings());
  const [showSettings, setShowSettings] = useState(false);
  const [readingMode, setReadingMode] = useState<'currentPage' | 'selectedText' | 'fromHere'>('fromHere');
  const [availableVoices, setAvailableVoices] = useState<Array<{ name: string; gender: string; description: string }>>([
    { name: 'en-US-Standard-D', gender: 'Male', description: 'Standard Male' },
    { name: 'en-US-Standard-C', gender: 'Female', description: 'Standard Female' }
  ]);
  const [currentProvider, setCurrentProvider] = useState<string>('google');
  const [cacheStats, setCacheStats] = useState({ entries: 0, totalSizeMB: 0, hitRate: 0 });
  const [initializationFailed, setInitializationFailed] = useState(false);

  // Define settings change handler first (needed in useEffect)
  const handleSettingsChange = useCallback((newSettings: Partial<TTSSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    newTTSController.updateSettings(newSettings);
  }, [settings]);

  // Manual retry function for TTS initialization
  const handleRetryInitialization = useCallback(async () => {
    setInitializationFailed(false);
    window.location.reload();
  }, []);

  // Initialize TTS controller with proper timing
  useEffect(() => {
    const initializeTTS = async () => {
      try {
        let pdfRetries = 0;
        const maxPdfRetries = 40; // wait a bit longer on first load
        while (pdfRetries < maxPdfRetries) {
          let container = viewerContainer;
          if (!container) {
            container = document.querySelector('.pdf-viewer-container') as HTMLElement ||
                       document.querySelector('[data-testid="pdf-viewer"]') as HTMLElement ||
                       document.querySelector('.modern-pdf-viewer') as HTMLElement;
          }
          const hasPages = document.querySelectorAll('[data-page-number]').length > 0;
          if (container && hasPages) {
            newTTSController.setViewerContainer(container);
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 100));
          pdfRetries++;
        }

        // Set up state change listener
        newTTSController.setStateChangeCallback(setTtsState);
        setTtsState(newTTSController.getState());

        // Ensure controller initialization (after container & pages exist)
        await newTTSController.ensureInitialized();

        // Set default Google TTS voice ONCE
        if (!defaultVoiceSetRef.current) {
          defaultVoiceSetRef.current = true;
          const def = { voice: 'en-US-Standard-D', languageCode: 'en-US' };
          newTTSController.updateSettings(def);
          setSettings(prev => ({ ...prev, ...def }));
        }

        let retries = 0;
        const maxRetries = 40; // give it more time on first load
        while (!newTTSController.isReady() && retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 100));
          setTtsState(newTTSController.getState());
          retries++;
        }
        if (newTTSController.isReady()) {
          setInitializationFailed(false);
        } else {
          setInitializationFailed(true);
        }
      } catch (error) {
        setInitializationFailed(true);
      }
    };
    initializeTTS();
    return () => {
      newTTSController.setStateChangeCallback(() => {});
    };
  }, [viewerContainer]);

  const defaultVoiceSetRef = useRef(false);

  // Try to set container again when viewer container changes or PDF loads
  useEffect(() => {
    const retrySetContainer = () => {
      if (!ttsState.isInitialized) return;
      let container = viewerContainer;
      if (!container) {
        const selectors = [
          '.react-window',
          '.pdf-page',
          '[data-page-number]',
          '.ModernPDFViewer'
        ];
        for (const selector of selectors) {
          const element = document.querySelector(selector) as HTMLElement;
          if (element) {
            container = selector === '[data-page-number]' ? element.parentElement as HTMLElement : element;
            break;
          }
        }
      }
      if (container) {
        newTTSController.setViewerContainer(container);
      }
    };
    const timer = setTimeout(retrySetContainer, 1000);
    return () => clearTimeout(timer);
  }, [viewerContainer, currentPage, ttsState.isInitialized]);

  const handleStartReading = useCallback(async () => {
    try {
      const isReady = newTTSController.isReady();
      if (!isReady) return;
      const options: TTSStartOptions = {
        mode: readingMode,
        pageNumber: currentPage,
        selectedText: selectedText
      };
      await newTTSController.startReading(options);
      setCacheStats(newTTSController.getCacheStats());
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not initialized')) {
          // Optionally show a toast or UI message
        } else if (error.message.includes('container not set')) {
          // Optionally show a toast or UI message
        } else if (error.message.includes('No text found')) {
          // Optionally show a toast or UI message
        }
      }
    }
  }, [readingMode, currentPage, selectedText, ttsState.isInitialized]);

  const handleStopReading = useCallback(() => {
    newTTSController.stopReading();
  }, []);

  const handlePauseReading = useCallback(() => {
    if (ttsState.isPaused) {
      newTTSController.resumeReading();
    } else {
      newTTSController.pauseReading();
    }
  }, [ttsState.isPaused]);

  const handleSkipNext = useCallback(() => {
    newTTSController.skipToNext();
  }, []);


  const handleProviderSwitch = useCallback(async (provider: 'google') => {
    console.log(`🔄 TTSControls: Google TTS is the only provider`);
    try {
      const result = await newTTSClient.switchProvider(provider);
      if (result.success) {
        setCurrentProvider(provider);
        console.log(`✅ TTSControls: Provider confirmed as ${provider}`);
      } else {
        console.error(`❌ TTSControls: Provider switch failed:`, result.message);
      }
    } catch (error) {
      console.error(`❌ TTSControls: Error with provider:`, error);
    }
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getReadingModeLabel = (mode: string): string => {
    switch (mode) {
      case 'currentPage': return 'Current Page';
      case 'selectedText': return 'Selected Text';
      case 'fromHere': return 'From Here';
      default: return 'From Here';
    }
  };

  const handleClearCache = useCallback(async () => {
    try {
      await newTTSController.clearAudioCache();
      setCacheStats({ entries: 0, totalSizeMB: 0, hitRate: 0 });
      console.log('Audio cache cleared successfully');
    } catch (error) {
      console.error('Failed to clear audio cache:', error);
    }
  }, []);

  const getCacheStats = useCallback(() => {
    return cacheStats;
  }, [cacheStats]);

  // Update cache stats periodically
  useEffect(() => {
    const updateCacheStats = () => {
      setCacheStats(newTTSController.getCacheStats());
    };

    // Update immediately
    updateCacheStats();

    // Update every 5 seconds
    const interval = setInterval(updateCacheStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg ${className}`}>
      {/* Main Controls */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M8.464 15.536a5 5 0 01-7.072 0m9.9-2.828a9 9 0 01-14.142 0" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Text-to-Speech</h3>
            
            {/* Status Indicator */}
            <div className="flex items-center space-x-1">
              {!ttsState.isInitialized ? (
                <>
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-yellow-600 dark:text-yellow-400">
                    {initializationFailed ? 'Failed - Refresh needed' : 'Initializing...'}
                  </span>
                </>
              ) : ttsState.error ? (
                <>
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span className="text-xs text-red-600 dark:text-red-400">Error</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-xs text-green-600 dark:text-green-400">Ready</span>
                </>
              )}
            </div>
          </div>
          
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Settings"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
        
        {/* Error Message Display */}
        {ttsState.error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start space-x-2">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-200">TTS Error</p>
                <p className="text-sm text-red-700 dark:text-red-300">{ttsState.error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Initialization Failed Message */}
        {initializationFailed && !ttsState.isInitialized && (
          <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start space-x-2">
              <svg className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">TTS Initialization Failed</p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Text-to-Speech failed to initialize. 
                  <button 
                    onClick={() => window.location.reload()} 
                    className="ml-1 underline hover:no-underline font-medium"
                  >
                    Try refreshing the page
                  </button>
                  {' '}to fix this issue.
                </p>
                <div className="mt-2 flex space-x-2">
                  <button
                    onClick={handleRetryInitialization}
                    className="px-3 py-1 text-xs bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded hover:bg-yellow-200 dark:hover:bg-yellow-700 transition-colors"
                  >
                    Retry
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors"
                  >
                    Refresh Page
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reading Mode Selection */}
        {!ttsState.isReading && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reading Mode
            </label>
            <select
              value={readingMode}
              onChange={(e) => setReadingMode(e.target.value as 'currentPage' | 'selectedText' | 'fromHere')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
            >
              <option value="fromHere">From Current Page</option>
              <option value="currentPage">Current Page Only</option>
              <option value="selectedText">Selected Text</option>
            </select>
          </div>
        )}

        {/* Playback Controls */}
        <div className="flex items-center justify-center space-x-3 mb-4">
          {/* Previous Button */}
          <button
            onClick={handleSkipNext}
            disabled={!ttsState.isReading}
            className="p-3 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Previous Sentence"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Main Play/Pause Button */}
          {!ttsState.isReading ? (
            <div className="flex items-center space-x-2">
              <motion.button
                whileHover={{ scale: ttsState.isInitialized ? 1.05 : 1 }}
                whileTap={{ scale: ttsState.isInitialized ? 0.95 : 1 }}
                onClick={handleStartReading}
                disabled={!ttsState.isInitialized}
                className={`p-4 rounded-full text-white transition-colors shadow-lg ${
                  ttsState.isInitialized 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
                title={ttsState.isInitialized ? "Start Reading" : "Initializing TTS..."}
              >
                {ttsState.isInitialized ? (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-4-10v20m0-20a4 4 0 110 8m0-8a4 4 0 110 8" />
                  </svg>
                ) : (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                )}
              </motion.button>

              {/* Refresh Button - Show when TTS fails to initialize */}
              {initializationFailed && !ttsState.isInitialized && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => window.location.reload()}
                  className="p-3 rounded-full bg-yellow-500 text-white hover:bg-yellow-600 transition-colors shadow-lg"
                  title="Refresh page to fix TTS initialization"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </motion.button>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              {/* Pause/Resume Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handlePauseReading}
                className="p-4 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-lg"
                title={ttsState.isPaused ? "Resume" : "Pause"}
              >
                {ttsState.isPaused ? (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-4-10v20m0-20a4 4 0 110 8m0-8a4 4 0 110 8" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </motion.button>

              {/* Stop Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleStopReading}
                className="p-4 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors shadow-lg"
                title="Stop Reading"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6v4H9z" />
                </svg>
              </motion.button>
            </div>
          )}

          {/* Next Button */}
          <button
            onClick={handleSkipNext}
            disabled={!ttsState.isReading}
            className="p-3 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Next Sentence"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Progress Information */}
        {ttsState.isReading && (
          <div className="space-y-2">
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <motion.div
                className="bg-blue-600 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${ttsState.progress * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            
            {/* Progress Text */}
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>{ttsState.currentChunkIndex + 1} / {ttsState.totalChunks} sentences</span>
              <span>{formatTime(ttsState.estimatedTimeRemaining)} remaining</span>
            </div>
            
            {/* Current Text Preview */}
            {ttsState.currentText && (
              <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm text-gray-700 dark:text-gray-300">
                <div className="truncate">
                  "{ttsState.currentText.substring(0, 100)}..."
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {ttsState.error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-red-700 dark:text-red-300">{ttsState.error}</span>
            </div>
          </div>
        )}
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            <div className="p-4 space-y-4">
              <h4 className="font-medium text-gray-900 dark:text-white">Settings</h4>
              
              {/* TTS Provider Selection - Only Google */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  TTS Provider
                </label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleProviderSwitch('google')}
                    className="flex-1 px-3 py-2 rounded-md text-sm font-medium bg-blue-600 text-white"
                  >
                    Google TTS
                  </button>
                </div>
              </div>

              {/* Voice Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Voice
                </label>
                <select
                  value={settings.voice}
                  onChange={(e) => handleSettingsChange({ voice: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                >
                  {availableVoices.map(voice => (
                    <option key={voice.name} value={voice.name}>
                      {voice.description}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Pitch Control - Updated range to -10 to +10 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Pitch: {settings.pitch > 0 ? '+' : ''}{settings.pitch}
                </label>
                <input
                  type="range"
                  min="-10"
                  max="10"
                  step="1"
                  value={settings.pitch}
                  onChange={(e) => handleSettingsChange({ pitch: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>-10</span>
                  <span>+10</span>
                </div>
              </div>
              
              {/* Speed Control - Updated max to 2.5x */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Speed: {settings.speed}x
                </label>
                <input
                  type="range"
                  min="0.25"
                  max="2.5"
                  step="0.25"
                  value={settings.speed}
                  onChange={(e) => handleSettingsChange({ speed: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>0.25x</span>
                  <span>2.5x</span>
                </div>
              </div>
              
              {/* Volume Control */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Volume: {Math.round(settings.volume * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.volume}
                  onChange={(e) => handleSettingsChange({ volume: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>
              
              {/* Auto Scroll Toggle */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Auto Scroll
                </label>
                <button
                  onClick={() => handleSettingsChange({ autoScroll: !settings.autoScroll })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.autoScroll ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.autoScroll ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Cache Management */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Audio Cache</h5>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                    <span>Cached Items:</span>
                    <span>{getCacheStats().entries}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                    <span>Cache Size:</span>
                    <span>{getCacheStats().totalSizeMB} MB</span>
                  </div>
                  <button
                    onClick={handleClearCache}
                    className="w-full px-3 py-2 text-sm bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                  >
                    Clear Cache
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TTSControls; 