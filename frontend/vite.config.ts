import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: path.resolve(__dirname, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs'),
          dest: 'pdfjs',
          rename: 'pdf.worker.min.js' // Rename to .js for easier URL handling
        },
        {
          src: path.resolve(__dirname, 'node_modules/pdfjs-dist/build/pdf.worker.mjs'),
          dest: 'pdfjs',
          rename: 'pdf.worker.js' // Rename to .js for easier URL handling
        },
        {
          src: path.resolve(__dirname, 'node_modules/pdfjs-dist/cmaps'),
          dest: 'pdfjs'
        },
        {
          src: path.resolve(__dirname, 'node_modules/pdfjs-dist/standard_fonts'),
          dest: 'pdfjs'
        }
      ]
    })
  ],
  assetsInclude: ['**/*.worker.js', '**/*.worker.min.js'],
  server: {
    // Google OAuth requires specific headers for security
    headers: {
      // Content Security Policy for Google Identity Services
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com/gsi/client",
        "style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style",
        "frame-src 'self' https://accounts.google.com/gsi/",
        "connect-src 'self' blob: data: http://localhost:8000 https://accounts.google.com/gsi/",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        "media-src 'self' blob: data:",
        "worker-src 'self' blob:"
      ].join('; '),
      
      // Cross-Origin-Opener-Policy for Google OAuth popups
      'Cross-Origin-Opener-Policy': 'unsafe-none',
      
      // Cross-Origin-Embedder-Policy for additional security
      'Cross-Origin-Embedder-Policy': 'unsafe-none',
      
      // Additional headers for Google OAuth compatibility
      'X-Frame-Options': 'SAMEORIGIN'
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})
