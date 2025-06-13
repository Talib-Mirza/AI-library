import fitz
import json
from typing import Dict, List, Optional, Union
from pathlib import Path

class PDFProcessor:
    """Service for processing PDF files and extracting structured content."""
    
    def __init__(self):
        self.supported_image_types = {'jpeg', 'png'}
    
    def process_pdf(self, file_path: str) -> Dict:
        """
        Process a PDF file and extract structured content.
        
        Args:
            file_path: Path to the PDF file
            
        Returns:
            Dict containing structured content with pages and blocks
            
        Raises:
            Exception if file is not found or is invalid
        """
        print(f"Starting PDF processing for file: {file_path}")
        
        if not Path(file_path).exists():
            print(f"PDF file not found: {file_path}")
            raise FileNotFoundError(f"PDF file not found: {file_path}")
        
        try:
            print("Opening PDF document...")
            doc = fitz.open(file_path)
            print(f"PDF opened successfully. Total pages: {len(doc)}")
            
            content = {
                "total_pages": len(doc),
                "pages": []
            }
            
            # Extract text content for database storage
            full_text = []
            
            for page_num in range(len(doc)):
                print(f"Processing page {page_num + 1}/{len(doc)}")
                page = doc[page_num]
                
                # Use dict format for better compatibility
                text_dict = page.get_text("dict", flags=fitz.TEXT_PRESERVE_LIGATURES | 
                                                      fitz.TEXT_PRESERVE_WHITESPACE |
                                                      fitz.TEXT_PRESERVE_SPANS |
                                                      fitz.TEXT_MEDIABOX_CLIP)
                
                print(f"Page {page_num + 1} text_dict keys: {text_dict.keys()}")
                print(f"Page {page_num + 1} has {len(text_dict.get('blocks', []))} blocks")
                
                # Process structured content for display
                page_dict = self._process_page(page, page_num + 1, text_dict)
                content["pages"].append(page_dict)
                
                # Extract text for database
                full_text.append(page.get_text())
                
                print(f"Page {page_num + 1} processed with {len(page_dict['blocks'])} elements")
            
            # Add full text content to the result
            content["text_content"] = "\n".join(full_text)
            
            print("PDF processing completed successfully")
            return content
            
        except Exception as e:
            print(f"Error during PDF processing: {str(e)}")
            raise Exception(f"Error processing PDF: {str(e)}")
        finally:
            if 'doc' in locals():
                doc.close()
                print("PDF document closed")
    
    def _process_page(self, page: fitz.Page, page_num: int, text_dict: Dict) -> Dict:
        """
        Process a single page and extract its content blocks.
        
        Args:
            page: PyMuPDF page object
            page_num: Page number
            text_dict: Text dictionary from get_text("dict")
            
        Returns:
            Dict containing page content with blocks
        """
        print(f"Processing page {page_num} content...")
        blocks = []
        page_width = page.rect.width
        page_height = page.rect.height
        
        try:
            # Process text blocks
            text_blocks = text_dict.get("blocks", [])
            print(f"Found {len(text_blocks)} raw text blocks")
            
            for block_idx, block in enumerate(text_blocks):
                print(f"Block {block_idx}: type={block.get('type')}, keys={block.keys()}")
                
                if block.get("type") == 0:  # Text block
                    # Try the detailed line processing first
                    detailed_lines = self._process_text_block_detailed(block, page_width, page_height)
                    if detailed_lines:
                        blocks.extend(detailed_lines)
                        print(f"Block {block_idx} produced {len(detailed_lines)} detailed lines")
                    else:
                        # Fallback to simple block processing
                        simple_block = self._process_text_block_simple(block, page_width, page_height)
                        if simple_block:
                            blocks.append(simple_block)
                            print(f"Block {block_idx} created as simple text block")
                        
                elif block.get("type") == 1:  # Image block  
                    image_block = self._process_image_block(block)
                    if image_block:
                        blocks.append(image_block)
                        print(f"Block {block_idx} is an image block")
            
            print(f"Processed {len(blocks)} text lines and image blocks")
            
            # Sort blocks by vertical position for proper reading order
            blocks.sort(key=lambda x: (x["bbox"][1], x["bbox"][0]))
            
            result = {
                "page_number": page_num,
                "width": page_width,
                "height": page_height,
                "blocks": blocks
            }
            
            print(f"Page {page_num} processing completed with {len(blocks)} total elements")
            return result
            
        except Exception as e:
            print(f"Error processing page {page_num}: {str(e)}")
            raise
    
    def _process_text_block_detailed(self, block: Dict, page_width: float, page_height: float) -> List[Dict]:
        """
        Process a text block into individual lines with preserved formatting.
        
        Args:
            block: Raw text block from PyMuPDF
            page_width: Page width
            page_height: Page height
            
        Returns:
            List of processed line dictionaries
        """
        processed_lines = []
        
        try:
            lines = block.get("lines", [])
            print(f"Processing text block with {len(lines)} raw lines")
            
            if not lines:
                return processed_lines
                
            # Group lines by their Y coordinate (lines on same horizontal level)
            grouped_lines = self._group_lines_by_y_coordinate(lines)
            print(f"Grouped into {len(grouped_lines)} visual lines")
            
            for line_idx, line_group in enumerate(grouped_lines):
                # Combine all lines in this group into a single visual line
                combined_text = ""
                combined_bbox = None
                font_sizes = []
                is_bold = False
                is_italic = False
                
                # Sort lines in this group by X coordinate (left to right)
                line_group.sort(key=lambda x: x.get("bbox", [0, 0, 0, 0])[0])
                
                for line in line_group:
                    spans = line.get("spans", [])
                    line_bbox = line.get("bbox", [0, 0, 0, 0])
                    
                    # Combine bounding box
                    if combined_bbox is None:
                        combined_bbox = list(line_bbox)
                    else:
                        # Expand to include this line
                        combined_bbox[0] = min(combined_bbox[0], line_bbox[0])  # left
                        combined_bbox[1] = min(combined_bbox[1], line_bbox[1])  # top
                        combined_bbox[2] = max(combined_bbox[2], line_bbox[2])  # right
                        combined_bbox[3] = max(combined_bbox[3], line_bbox[3])  # bottom
                    
                    # Process spans in this line
                    for span in spans:
                        span_text = span.get("text", "")
                        combined_text += span_text
                        
                        font_sizes.append(span.get("size", 12))
                        flags = span.get("flags", 0)
                        is_bold = is_bold or bool(flags & 2**4)
                        is_italic = is_italic or bool(flags & 2**0)
                
                # Skip empty lines
                if not combined_text.strip():
                    print(f"Combined line {line_idx} is empty, skipping")
                    continue
                
                # Determine alignment based on line position
                alignment = self._determine_alignment(combined_bbox, page_width)
                
                # Calculate indentation
                left_margin = combined_bbox[0]
                indent = max(0, left_margin - 72)  # Assuming 72pt (1 inch) as base margin
                
                # Determine if this is a paragraph break
                is_paragraph_start = False
                if line_idx == 0:  # First line of block
                    is_paragraph_start = True
                elif line_idx > 0:
                    prev_combined_bbox = processed_lines[-1]["bbox"] if processed_lines else [0, 0, 0, 0]
                    # Check for significant vertical gap (indicates paragraph break)
                    vertical_gap = combined_bbox[1] - prev_combined_bbox[3]
                    avg_font_size = sum(font_sizes) / len(font_sizes) if font_sizes else 12
                    if vertical_gap > avg_font_size * 0.5:  # More than half a line height
                        is_paragraph_start = True
                
                processed_line = {
                    "type": "line",
                    "text": combined_text,
                    "bbox": combined_bbox,
                    "font_size": max(font_sizes) if font_sizes else 12,
                    "is_bold": is_bold,
                    "is_italic": is_italic,
                    "alignment": alignment,
                    "indent": indent if indent > 5 else None,  # Only count significant indentation
                    "is_paragraph_start": is_paragraph_start,
                    "line_height": combined_bbox[3] - combined_bbox[1]
                }
                
                processed_lines.append(processed_line)
                print(f"Processed combined line {line_idx}: '{combined_text[:50]}...' at {combined_bbox}")
                
        except Exception as e:
            print(f"Error processing detailed text block: {str(e)}")
        
        return processed_lines
    
    def _group_lines_by_y_coordinate(self, lines: List[Dict]) -> List[List[Dict]]:
        """
        Group lines that are on the same horizontal level (same Y coordinate).
        
        Args:
            lines: List of line dictionaries from PyMuPDF
            
        Returns:
            List of line groups, where each group contains lines on the same horizontal level
        """
        if not lines:
            return []
        
        grouped = []
        current_group = [lines[0]]
        current_y = lines[0].get("bbox", [0, 0, 0, 0])[1]  # Top Y coordinate
        
        for line in lines[1:]:
            line_y = line.get("bbox", [0, 0, 0, 0])[1]
            
            # If Y coordinates are very close (within 2 points), consider them on the same line
            if abs(line_y - current_y) <= 2:
                current_group.append(line)
            else:
                # Start a new group
                grouped.append(current_group)
                current_group = [line]
                current_y = line_y
        
        # Add the last group
        if current_group:
            grouped.append(current_group)
        
        return grouped
    
    def _process_text_block_simple(self, block: Dict, page_width: float, page_height: float) -> Optional[Dict]:
        """
        Process a text block as a single simple block (fallback method).
        
        Args:
            block: Raw text block from PyMuPDF
            page_width: Page width
            page_height: Page height
            
        Returns:
            Processed text block dict or None
        """
        try:
            bbox = block.get("bbox", [0, 0, 0, 0])
            lines = block.get("lines", [])
            
            # Extract all text from lines
            all_text = ""
            font_sizes = []
            is_bold = False
            is_italic = False
            
            for line in lines:
                spans = line.get("spans", [])
                for span in spans:
                    span_text = span.get("text", "")
                    all_text += span_text
                    
                    font_sizes.append(span.get("size", 12))
                    flags = span.get("flags", 0)
                    is_bold = is_bold or bool(flags & 2**4)
                    is_italic = is_italic or bool(flags & 2**0)
                
                all_text += "\n"  # Add line break between lines
            
            if not all_text.strip():
                return None
            
            # Determine alignment based on block position
            alignment = self._determine_alignment(bbox, page_width)
            
            return {
                "type": "text",
                "text": all_text.strip(),
                "bbox": bbox,
                "font_size": max(font_sizes) if font_sizes else 12,
                "is_bold": is_bold,
                "is_italic": is_italic,
                "alignment": alignment,
                "indent": None,
                "is_paragraph_start": True,
                "line_height": bbox[3] - bbox[1]
            }
            
        except Exception as e:
            print(f"Error processing simple text block: {str(e)}")
            return None
    
    def _process_image_block(self, block: Dict) -> Optional[Dict]:
        """
        Process an image block.
        
        Args:
            block: Raw image block from PyMuPDF
            
        Returns:
            Processed image block dict or None
        """
        try:
            bbox = block.get("bbox", [0, 0, 0, 0])
            # For dict format, images are stored differently
            if "image" in block:
                image_info = block["image"]
            else:
                # Fallback - create a placeholder image block
                image_info = {"ext": "png", "width": 100, "height": 100, "xref": 0}
            
            return {
                "type": "image",
                "bbox": bbox,
                "image_data": {
                    "ext": image_info.get("ext", ""),
                    "width": image_info.get("width", 0),
                    "height": image_info.get("height", 0),
                    "xref": image_info.get("xref", 0)
                }
            }
        except Exception as e:
            print(f"Error processing image block: {str(e)}")
            return None
    
    def _determine_alignment(self, bbox: List[float], page_width: float) -> str:
        """
        Determine text alignment based on line position.
        
        Args:
            bbox: Line bounding box [x0, y0, x1, y1]
            page_width: Page width
            
        Returns:
            Alignment string: 'left', 'center', 'right', or 'justify'
        """
        left_margin = bbox[0]
        right_margin = page_width - bbox[2]
        line_width = bbox[2] - bbox[0]
        center_pos = (bbox[0] + bbox[2]) / 2
        page_center = page_width / 2
        
        # Define typical page margins (assuming 1 inch = 72 points)
        typical_left_margin = 72  # 1 inch
        typical_right_margin = 72  # 1 inch
        
        # Check for center alignment - text center is close to page center
        center_tolerance = page_width * 0.05  # 5% of page width tolerance
        if abs(center_pos - page_center) < center_tolerance:
            return "center"
        
        # Check for right alignment - left margin is significantly larger than right margin
        # and right margin is small (text is pushed to the right)
        if left_margin > (page_width * 0.5) and right_margin < (page_width * 0.15):
            return "right"
        
        # Check for justified text - line spans most of the page width with similar margins
        content_width = page_width - typical_left_margin - typical_right_margin
        if (line_width > content_width * 0.85 and 
            abs(left_margin - typical_left_margin) < 20 and 
            abs(right_margin - typical_right_margin) < 20):
            return "justify"
        
        # Check for significant indentation (but not center or right aligned)
        if left_margin > typical_left_margin + 20:  # More than normal left margin + some extra
            return "left"  # Still left-aligned but indented
            
        # Default to left alignment
        return "left"
    
    def _extract_images(self, page: fitz.Page) -> List[Dict]:
        """
        Extract images from a page.
        
        Args:
            page: PyMuPDF page object
            
        Returns:
            List of image block dicts
        """
        image_blocks = []
        
        try:
            for img_index, img in enumerate(page.get_images(full=True)):
                xref = img[0]
                base_image = page.parent.extract_image(xref)
                
                if base_image and base_image["ext"] in self.supported_image_types:
                    # Get image rectangle (if available)
                    bbox = page.get_image_bbox(img)
                    if not bbox:
                        continue
                    
                    image_blocks.append({
                        "type": "image",
                        "bbox": [bbox.x0, bbox.y0, bbox.x1, bbox.y1],
                        "image_data": {
                            "ext": base_image["ext"],
                            "width": base_image.get("width", 0),
                            "height": base_image.get("height", 0),
                            "xref": xref
                        }
                    })
        except Exception as e:
            print(f"Error extracting images: {str(e)}")
        
        return image_blocks 