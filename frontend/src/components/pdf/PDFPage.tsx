import React from 'react';
import PDFBlock from './PDFBlock';

interface PageProps {
  page: {
    page_number: number;
    width: number;
    height: number;
    blocks: Array<{
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
    }>;
  };
  isVisible: boolean;
}

const PDFPage: React.FC<PageProps> = ({ page, isVisible }) => {
  // Debug logging
  console.log(`PDFPage: page=${page.page_number}, isVisible=${isVisible}, blocks=${page.blocks.length}`);
  
  // Only render if page is visible in viewport
  if (!isVisible) {
    return (
      <div 
        className="relative bg-gray-100 dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden mb-8"
        style={{
          aspectRatio: `${page.width}/${page.height}`,
          minHeight: '500px',
          width: '100%'
        }}
      >
        <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
          Loading page {page.page_number}...
        </div>
      </div>
    );
  }

  return (
    <div 
      className="relative bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-visible mb-8 border border-gray-200 dark:border-gray-700"
      style={{
        aspectRatio: `${page.width}/${page.height}`,
        minHeight: '600px', // Increased min height
        width: '100%',
        maxWidth: '900px', // Increased max width
        margin: '0 auto'
      }}
    >
      {/* Content container with preserved spacing */}
      <div 
        className="absolute inset-0" 
        style={{
          padding: '20px',
          fontSize: '14px',
          lineHeight: '1.4',
          position: 'relative', // Changed from absolute positioning
          overflow: 'visible', // Ensure content isn't clipped
        }}
      >
        {/* Render blocks/lines */}
        {page.blocks.map((block, index) => {
          // console.log(`Rendering block ${index}:`, block); // Debug log removed for production
          return (
            <PDFBlock
              key={`${page.page_number}-${index}`}
              block={block}
              pageWidth={page.width}
              pageHeight={page.height}
            />
          );
        })}
        
        {/* Show message if no blocks */}
        {page.blocks.length === 0 && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-gray-400 text-lg">
            No content found on this page
          </div>
        )}
      </div>
      
      {/* Page shadow for depth */}
      <div className="absolute inset-0 pointer-events-none rounded-lg shadow-inner opacity-10"></div>
    </div>
  );
};

export default PDFPage; 
