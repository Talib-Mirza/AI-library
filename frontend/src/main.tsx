import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { inject } from '@vercel/analytics'

// Only inject in production
if (import.meta.env?.MODE === 'production' || process.env.NODE_ENV === 'production') {
	inject()
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
