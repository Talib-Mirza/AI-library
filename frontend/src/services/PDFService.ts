import axios from 'axios';

export interface PDFImage {
    filename: string;
    path: string;
    page: number;
    index: number;
    format: string;
}

export interface PDFMetadata {
    text_file: string;
    images: Array<{
        filename: string;
        path: string;
        page: number;
        index: number;
        format: string;
    }>;
    total_pages: number;
    total_images: number;
    parsed_at: string;  // ISO string format
    original_filename: string;
}

export interface PDFUploadResponse {
    message: string;
    metadata: PDFMetadata;
}

class PDFService {
    private baseUrl = 'http://localhost:8000/api/pdf';

    async uploadPDF(file: File): Promise<PDFUploadResponse> {
        const formData = new FormData();
        formData.append('file', file);

        const response = await axios.post<PDFUploadResponse>(
            `${this.baseUrl}/upload`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );

        return response.data;
    }

    async getCachedPDF(filename: string): Promise<PDFMetadata> {
        try {
            // Convert backslashes to forward slashes and encode the filename
            const normalizedFilename = filename.replace(/\\/g, '/');
            console.log('Normalized filename:', normalizedFilename);
            
            // If the filename is just the base name, we need to construct the full path
            const fullPath = normalizedFilename.includes('/') ? normalizedFilename : `uploads/${normalizedFilename}`;
            console.log('Full path:', fullPath);
            
            // Encode the path components separately to handle special characters
            const encodedPath = fullPath.split('/').map(part => encodeURIComponent(part)).join('/');
            console.log('Encoded path:', encodedPath);
            
            const response = await axios.get<PDFMetadata>(
                `${this.baseUrl}/cached/${encodedPath}`
            );
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 404) {
                throw new Error('No cached content found for this PDF');
            }
            throw error;
        }
    }

    getImageUrl(imagePath: string): string {
        // The image path is relative to the parsed_pdfs directory
        // We need to use the /api/pdf/parsed endpoint to serve the images
        const [userId, pdfDir, ...rest] = imagePath.split('/');
        const imageFilename = rest[rest.length - 1];
        return `${this.baseUrl}/parsed/${userId}/${pdfDir}/images/${imageFilename}`;
    }
}

export const pdfService = new PDFService(); 