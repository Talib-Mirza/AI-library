import * as pdfjsLib from 'pdfjs-dist';

let workerReady = false;

// Custom worker setup function
export const setupPDFWorker = async (): Promise<void> => {
  const DEBUG = import.meta.env?.MODE === 'development';
  try {
    if (DEBUG) console.debug('[PDFWorker] Setting up PDF.js worker...');

    // Use local worker file that Vite copies (most reliable)
    const localWorkerPath = '/pdfjs/pdf.worker.min.js';

    // Set worker src unconditionally; the file is served from public/
    pdfjsLib.GlobalWorkerOptions.workerSrc = localWorkerPath;
    workerReady = true;
    if (DEBUG) console.debug(`[PDFWorker] Using local worker at: ${localWorkerPath}`);
    return;
  } catch (error) {
    console.error('[PDFWorker] Worker setup failed:', error);
  }
  
  // Final fallback: disable worker entirely (use main thread)
  if (DEBUG) console.debug('[PDFWorker] Using main thread processing (no worker)');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '';
  workerReady = false;
};

export const isWorkerReady = (): boolean => workerReady;

export default setupPDFWorker; 