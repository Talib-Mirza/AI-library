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
  server: {
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
