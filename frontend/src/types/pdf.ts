export interface PDFImageData {
  ext: string;
  width: number;
  height: number;
  xref: number;
}

export interface PDFBlock {
  type: 'line' | 'text' | 'image';
  text?: string;
  bbox: [number, number, number, number]; // [x0, y0, x1, y1]
  font_size?: number;
  is_bold?: boolean;
  is_italic?: boolean;
  alignment?: 'left' | 'center' | 'right' | 'justify';
  indent?: number;
  is_paragraph_start?: boolean;
  line_height?: number;
  image_data?: PDFImageData;
}

export interface PDFPage {
  page_number: number;
  width: number;
  height: number;
  blocks: PDFBlock[];
}

export interface PDFContent {
  total_pages: number;
  pages: PDFPage[];
  text_content?: string;
}

export interface PDFProcessingError {
  message: string;
  page?: number;
  details?: string;
} 