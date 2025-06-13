import React, { useState } from 'react';
import { pdfService } from '../services/PDFService';
import type { PDFMetadata, PDFImage } from '../services/PDFService';
import styles from './PDFUpload.module.css';

export const PDFUpload: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [metadata, setMetadata] = useState<PDFMetadata | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setError(null);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setError('Please select a PDF file');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await pdfService.uploadPDF(file);
            setMetadata(response.metadata);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error uploading PDF');
        } finally {
            setLoading(false);
        }
    };

    const renderImages = (images: PDFImage[]) => {
        return (
            <div className={styles.imageGrid}>
                {images.map((image) => (
                    <div key={`${image.page}-${image.index}`} className={styles.imageContainer}>
                        <img
                            src={pdfService.getImageUrl(image.path)}
                            alt={`Page ${image.page} Image ${image.index}`}
                            className={styles.image}
                        />
                        <div className={styles.imageInfo}>
                            Page {image.page}, Image {image.index}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className={styles.container}>
            <div className={styles.uploadSection}>
                <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className={styles.fileInput}
                />
                <button
                    onClick={handleUpload}
                    disabled={!file || loading}
                    className={styles.uploadButton}
                >
                    {loading ? 'Uploading...' : 'Upload PDF'}
                </button>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            {metadata && (
                <div className={styles.results}>
                    <h2>PDF Analysis Results</h2>
                    <div className={styles.metadata}>
                        <p>Total Pages: {metadata.total_pages}</p>
                        <p>Total Images: {metadata.total_images}</p>
                        <p>Parsed At: {new Date(metadata.parsed_at).toLocaleString()}</p>
                    </div>

                    {metadata.images.length > 0 && (
                        <div className={styles.imagesSection}>
                            <h3>Extracted Images</h3>
                            {renderImages(metadata.images)}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}; 