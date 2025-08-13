import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Temporary: build-time env inspection
// Note: This is safe; import.meta.env only exposes VITE_* vars at build time
console.log('[ENV]', {
	MODE: import.meta.env.MODE,
	BASE_URL: import.meta.env.BASE_URL,
	DEV: import.meta.env.DEV,
	PROD: import.meta.env.PROD,
	VITE_API_URL: import.meta.env.VITE_API_URL,
	VITE_GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
