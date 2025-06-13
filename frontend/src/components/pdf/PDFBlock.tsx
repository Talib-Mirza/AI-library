import React from 'react';

interface BlockProps {
  block: {
    type: string;
    text?: string;
    bbox: number[];
    font_size?: number;
    is_bold?: boolean;
    is_italic?: boolean;
    alignment?: 'left' | 'center' | 'right' | 'justify';
    indent?: number;
    is_paragraph_start?: boolean;
    line_height?: number;
    image_data?: {
      ext: string;
      width: number;
      height: number;
      xref: number;
    };
  };
  pageWidth: number;
  pageHeight: number;
}

const PDFBlock: React.FC<BlockProps> = ({ block, pageWidth, pageHeight }) => {
  // Calculate position and dimensions based on bbox
  const [x1, y1, x2, y2] = block.bbox;
  
  switch (block.type) {
    case 'line':
      const leftPercent = (x1 / pageWidth) * 100;
      const topPercent = (y1 / pageHeight) * 100;
      const widthPercent = ((x2 - x1) / pageWidth) * 100;
      const heightPercent = ((y2 - y1) / pageHeight) * 100;
      
      // Calculate container width for different alignments
      let containerLeftPercent = leftPercent;
      let containerWidthPercent = widthPercent;
      let textAlign: 'left' | 'center' | 'right' | 'justify' = 'left';
      
      // Adjust positioning based on alignment
      switch (block.alignment) {
        case 'center':
          // For center alignment, expand container to full width and center the text
          containerLeftPercent = 0;
          containerWidthPercent = 100;
          textAlign = 'center';
          break;
        case 'right':
          // For right alignment, expand container to full width and right-align the text
          containerLeftPercent = 0;
          containerWidthPercent = 100;
          textAlign = 'right';
          break;
        case 'justify':
          // For justify, use the actual text width but justify the text
          textAlign = 'justify';
          break;
        default:
          // Left alignment (default)
          textAlign = 'left';
          break;
      }
      
      const lineStyle: React.CSSProperties = {
        position: 'absolute',
        left: `${containerLeftPercent}%`,
        top: `${topPercent}%`,
        width: `${Math.max(containerWidthPercent, 1)}%`,
        height: `${Math.max(heightPercent, 1.5)}%`, // Ensure minimum height
        display: 'flex',
        alignItems: 'center',
        fontSize: block.font_size ? `${Math.max(block.font_size * 0.75, 10)}px` : '12px',
        fontWeight: block.is_bold ? 'bold' : 'normal',
        fontStyle: block.is_italic ? 'italic' : 'normal',
        lineHeight: '1.2',
        marginBottom: block.is_paragraph_start ? '0.3em' : '0',
        whiteSpace: 'nowrap',
        overflow: 'visible',
        color: '#000',
        zIndex: 1,
      };

      const textStyle: React.CSSProperties = {
        color: 'inherit',
        width: '100%',
        textAlign: textAlign,
        paddingLeft: (block.alignment === 'left' && block.indent) ? `${(block.indent / pageWidth) * 100}%` : '0',
      };

      // Special handling for justified text
      if (block.alignment === 'justify') {
        textStyle.wordSpacing = '0.1em';
        textStyle.letterSpacing = '0.02em';
      }

      return (
        <div style={lineStyle} className="text-gray-900 dark:text-gray-100">
          <span style={textStyle}>
            {block.text}
          </span>
        </div>
      );

    case 'text':
      // Legacy support for block-based rendering
      const blockStyle: React.CSSProperties = {
        position: 'absolute',
        left: `${(x1 / pageWidth) * 100}%`,
        top: `${(y1 / pageHeight) * 100}%`,
        width: `${((x2 - x1) / pageWidth) * 100}%`,
        minHeight: `${((y2 - y1) / pageHeight) * 100}%`,
        fontSize: block.font_size ? `${Math.max(block.font_size * 0.75, 10)}px` : '12px',
        fontWeight: block.is_bold ? 'bold' : 'normal',
        fontStyle: block.is_italic ? 'italic' : 'normal',
        textAlign: block.alignment || 'left',
        paddingLeft: block.indent ? `${(block.indent / pageWidth) * 100}%` : '0',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        color: '#000',
        lineHeight: '1.4',
      };

      return (
        <div style={blockStyle} className="text-gray-900 dark:text-gray-100">
          {block.text}
        </div>
      );

    case 'image':
      if (!block.image_data) return null;
      
      const imageStyle: React.CSSProperties = {
        position: 'absolute',
        left: `${(x1 / pageWidth) * 100}%`,
        top: `${(y1 / pageHeight) * 100}%`,
        width: `${((x2 - x1) / pageWidth) * 100}%`,
        height: `${((y2 - y1) / pageHeight) * 100}%`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      };

      return (
        <div style={imageStyle}>
          <img
            src={`/api/books/images/${block.image_data.xref}`}
            alt="PDF content"
            className="max-w-full max-h-full object-contain rounded-lg shadow-md"
            style={{
              aspectRatio: `${block.image_data.width}/${block.image_data.height}`
            }}
          />
        </div>
      );

    default:
      console.warn(`Unknown block type: ${block.type}`);
      return null;
  }
};

export default PDFBlock; 
