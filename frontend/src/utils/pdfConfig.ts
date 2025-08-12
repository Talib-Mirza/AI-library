import * as pdfjsLib from 'pdfjs-dist';
import { setupPDFWorker } from './pdfWorker';

// Initialize worker setup
let workerInitialized = false;
let initializationPromise: Promise<void> | null = null;

export const initializePDFWorker = async (): Promise<void> => {
  if (workerInitialized) {
    return;
  }
  
  if (initializationPromise) {
    return initializationPromise;
  }
  
  const DEBUG = import.meta.env?.MODE === 'development';
  
  initializationPromise = (async () => {
    try {
      await setupPDFWorker();
      workerInitialized = true;
      if (DEBUG) console.debug('[PDFConfig] Worker initialization successful');
    } catch (error) {
      console.warn('[PDFConfig] Worker initialization failed, continuing without worker:', error);
      workerInitialized = true; // Mark as initialized even if worker failed
      // PDF.js will fall back to main thread processing
    }
  })();
  
  return initializationPromise;
};

// PDF.js configuration options
export const PDF_CONFIG = {
  // Use local static files that Vite copies
  cMapUrl: '/pdfjs/cmaps/',
  cMapPacked: true,
  standardFontDataUrl: '/pdfjs/standard_fonts/',
  
  // Performance settings
  maxImageSize: 16777216, // 16MB max image size
  isEvalSupported: false,
  isOffscreenCanvasSupported: false, // Disable for compatibility
  
  // Rendering quality
  devicePixelRatio: window.devicePixelRatio || 1,
  defaultScale: 1.0,
  maxScale: 5.0,
  minScale: 0.25,
  
  // Page rendering
  enableXfa: false, // Disable XFA forms for better performance
  fontExtraProperties: true, // Enable font properties for text extraction
  
  // Worker configuration
  disableWorker: false, // Try worker first, fallback if needed
  verbosity: 1, // Reduce console noise (0=errors only, 1=warnings, 5=everything)
};

// PDF.js configuration with worker disabled (fallback)
export const PDF_CONFIG_NO_WORKER = {
  ...PDF_CONFIG,
  disableWorker: true, // Force main thread processing
  verbosity: 0, // Reduce console noise for fallback mode
};

// Text layer configuration
export const TEXT_LAYER_CONFIG = {
  enhanceTextSelection: true,
  renderInteractiveForms: false,
};

// Viewport configuration
export const VIEWPORT_CONFIG = {
  scale: 1.0,
  rotation: 0,
  offsetX: 0,
  offsetY: 0,
  dontFlip: false,
};

export default pdfjsLib; 