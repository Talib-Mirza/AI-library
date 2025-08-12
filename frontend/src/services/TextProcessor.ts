import { PDFDocumentData, PDFPageData } from './OptimizedPDFService';

export interface TextChunk {
  text: string;
  pageNumber: number;
  startIndex: number;
  endIndex: number;
  boundingRect?: DOMRect;
  textElements: HTMLElement[];
}

export interface ProcessedText {
  chunks: TextChunk[];
  fullText: string;
  pageRange: { start: number; end: number };
}

class TextProcessor {
  /**
   * Extract text from a PDF page's text layer
   */
  extractPageText(pageContainer: HTMLElement, pageNumber: number): TextChunk[] {
    const textLayer = pageContainer.querySelector('.textLayer') as HTMLElement;
    if (!textLayer) {
      console.warn(`No text layer found for page ${pageNumber}`);
      return [];
    }

    const textElements = Array.from(textLayer.querySelectorAll('span, div')) as HTMLElement[];
    if (textElements.length === 0) {
      return [];
    }

    // Sort text elements by position (top to bottom, left to right)
    const sortedElements = this.sortElementsByPosition(textElements);

    // Combine all text elements into a single text string
    const fullText = sortedElements
      .map((el: HTMLElement) => el.textContent || '')
      .join(' ')
      .trim();

    if (!fullText) {
      return [];
    }

    // Split into sentences
    const sentences = this.splitIntoSentences(fullText);
    const chunks: TextChunk[] = [];

    let currentIndex = 0;
    for (const sentence of sentences) {
      if (sentence.trim().length === 0) continue;

      const startIndex = currentIndex;
      const endIndex = currentIndex + sentence.length;

      // Find text elements that correspond to this sentence
      const sentenceElements = this.findElementsForTextRange(
        sortedElements, // Use sorted elements for consistency
        fullText,
        startIndex,
        endIndex
      );

      // Calculate bounding rectangle for the sentence
      const boundingRect = this.calculateBoundingRect(sentenceElements);

      // NEW: Clean and validate sentence for TTS before creating a chunk
      const cleanedText = this.cleanTextForTTS(sentence);
      if (!this.isValidTTSText(cleanedText)) {
        currentIndex = endIndex;
        continue; // Skip non-speech-worthy content (page numbers, short/garbled tokens, etc.)
      }

      chunks.push({
        text: cleanedText,
        pageNumber,
        startIndex,
        endIndex,
        boundingRect,
        textElements: sentenceElements
      });

      currentIndex = endIndex;
    }

    return chunks;
  }

  /**
   * Extract text from multiple pages
   */
  extractMultiPageText(
    pageContainers: HTMLElement[],
    startPage: number,
    endPage?: number
  ): ProcessedText {
    const actualEndPage = endPage || startPage;
    const chunks: TextChunk[] = [];
    let fullText = '';

    for (let i = 0; i < pageContainers.length; i++) {
      const pageNumber = startPage + i;
      if (pageNumber > actualEndPage) break;

      const pageChunks = this.extractPageText(pageContainers[i], pageNumber);
      chunks.push(...pageChunks);

      const pageText = pageChunks.map(chunk => chunk.text).join(' ');
      if (pageText) {
        fullText += (fullText ? ' ' : '') + pageText;
      }
    }

    return {
      chunks,
      fullText,
      pageRange: { start: startPage, end: actualEndPage }
    };
  }

  /**
   * Extract text from current viewport (visible pages)
   */
  extractVisibleText(viewerContainer: HTMLElement): ProcessedText {
    const pageElements = Array.from(
      viewerContainer.querySelectorAll('[data-page-number]')
    ) as HTMLElement[];

    const visiblePages = pageElements.filter(page => {
      const rect = page.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      // Check if page is at least partially visible
      return rect.bottom > 0 && rect.top < viewportHeight;
    });

    if (visiblePages.length === 0) {
      return {
        chunks: [],
        fullText: '',
        pageRange: { start: 1, end: 1 }
      };
    }

    const startPage = parseInt(visiblePages[0].dataset.pageNumber || '1');
    const endPage = parseInt(visiblePages[visiblePages.length - 1].dataset.pageNumber || '1');

    return this.extractMultiPageText(visiblePages, startPage, endPage);
  }

  /**
   * Sort text elements by their position (top to bottom, left to right)
   */
  private sortElementsByPosition(elements: HTMLElement[]): HTMLElement[] {
    return elements.sort((a, b) => {
      const rectA = a.getBoundingClientRect();
      const rectB = b.getBoundingClientRect();
      
      // Sort by top position first (top to bottom)
      const topDiff = rectA.top - rectB.top;
      if (Math.abs(topDiff) > 5) { // 5px tolerance for same line
        return topDiff;
      }
      
      // If on same line, sort by left position (left to right)
      return rectA.left - rectB.left;
    });
  }

  /**
   * Split text into sentences using natural language processing
   */
  private splitIntoSentences(text: string): string[] {
    // Clean up text
    text = text.replace(/\s+/g, ' ').trim();

    // Split on sentence boundaries while preserving the delimiter
    const sentencePattern = /([.!?]+(?:\s+|$))/g;
    const parts = text.split(sentencePattern);

    const sentences: string[] = [];
    let currentSentence = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      
      if (sentencePattern.test(part)) {
        // This is a sentence ending
        currentSentence += part;
        if (currentSentence.trim()) {
          sentences.push(currentSentence.trim());
        }
        currentSentence = '';
      } else {
        // This is sentence content
        currentSentence += part;
      }
    }

    // Add any remaining content as a sentence
    if (currentSentence.trim()) {
      sentences.push(currentSentence.trim());
    }

    // Filter out very short sentences (likely artifacts)
    return sentences.filter(sentence => {
      const words = sentence.split(/\s+/).length;
      return words >= 3 || sentence.length >= 10;
    });
  }

  /**
   * Find text elements that correspond to a text range
   */
  private findElementsForTextRange(
    textElements: HTMLElement[],
    fullText: string,
    startIndex: number,
    endIndex: number
  ): HTMLElement[] {
    const targetText = fullText.substring(startIndex, endIndex);
    const elements: HTMLElement[] = [];
    
    let currentIndex = 0;
    let searchStart = 0;

    for (const element of textElements) {
      const elementText = element.textContent || '';
      const elementStart = currentIndex;
      const elementEnd = currentIndex + elementText.length;

      // Check if this element overlaps with our target range
      const hasOverlap = !(elementEnd <= startIndex || elementStart >= endIndex);
      
      if (hasOverlap) {
        elements.push(element);
      }

      currentIndex = elementEnd + 1; // +1 for the space we added when joining
    }

    return elements;
  }

  /**
   * Calculate bounding rectangle for a group of text elements
   */
  private calculateBoundingRect(elements: HTMLElement[]): DOMRect | undefined {
    if (elements.length === 0) return undefined;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const element of elements) {
      const rect = element.getBoundingClientRect();
      minX = Math.min(minX, rect.left);
      minY = Math.min(minY, rect.top);
      maxX = Math.max(maxX, rect.right);
      maxY = Math.max(maxY, rect.bottom);
    }

    return new DOMRect(minX, minY, maxX - minX, maxY - minY);
  }

  /**
   * Clean text for TTS (remove extra spaces and common PDF artifacts)
   */
  cleanTextForTTS(text: string): string {
    return text
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      // Remove soft hyphens and zero-width chars
      .replace(/[\u00AD\u200B\u200C\u200D\uFEFF]/g, '')
      // Normalize quotes and dashes
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/[–—]/g, '-')
      // Remove spaces before punctuation
      .replace(/\s+([,.;:!?])/g, '$1')
      // Remove stray non-printable characters
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
      // Trim
      .trim();
  }

  /**
   * Validate that text is suitable for TTS
   */
  isValidTTSText(text: string): boolean {
    const cleaned = this.cleanTextForTTS(text);

    // Reject if it looks like a page header/footer or page number
    if (this.looksLikePageHeaderOrFooter(cleaned)) return false;

    // Must have minimum length
    if (cleaned.length < 12) return false;

    // Must contain letters
    if (!/[a-zA-Z]/.test(cleaned)) return false;

    // Shouldn't be mostly numbers or symbols
    const letters = (cleaned.match(/[a-zA-Z]/g) || []).length;
    const digits = (cleaned.match(/[0-9]/g) || []).length;
    const symbols = (cleaned.match(/[^a-zA-Z0-9\s]/g) || []).length;
    const total = cleaned.length;

    const letterRatio = letters / total;
    const symbolRatio = symbols / total;

    if (letterRatio < 0.4) return false;
    if (symbolRatio > 0.35 && letters < 10) return false;

    // Avoid very short all-caps tokens (likely headings or artifacts)
    const words = cleaned.split(/\s+/);
    const isMostlyUpper = cleaned.replace(/[^A-Za-z]/g, '').split('').filter(c => c === c.toUpperCase()).length >= Math.floor(0.7 * letters);
    if (words.length <= 4 && isMostlyUpper) return false;

    return true;
  }

  /**
   * Heuristic detection for page headers/footers and page numbers
   */
  private looksLikePageHeaderOrFooter(text: string): boolean {
    const normalized = text.trim().toLowerCase();

    // Pure number (e.g., "12"), or surrounded by dashes "— 12 —"
    if (/^(?:[-–—]\s*)?\d{1,4}(?:\s*[-–—])?$/.test(normalized)) return true;

    // "page 12", "pg. 12", "p. 12"
    if (/^(?:page|pg\.?|p\.)\s*\d{1,4}\.?$/.test(normalized)) return true;

    // Common non-content headers
    if (/^(contents|table of contents|index|bibliography)$/.test(normalized)) return true;

    // Chapter headers like "Chapter 3" or "CHAPTER 3"
    if (/^chapter\s+\d{1,3}(?:\s|$)/.test(normalized)) return true;

    return false;
  }

  /**
   * Get reading time estimate for text
   */
  estimateReadingTime(text: string): number {
    const wordsPerMinute = 150; // Average reading speed
    const words = text.split(/\s+/).length;
    return (words / wordsPerMinute) * 60; // Convert to seconds
  }
}

// Export singleton instance
export const textProcessor = new TextProcessor();
export default TextProcessor; 