import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Analytics } from '@vercel/analytics/next';

// Silence console in production
if (import.meta.env?.MODE === 'production' || process.env.NODE_ENV === 'production') {
	const noop = () => {};
	// eslint-disable-next-line no-console
	console.log = noop;
	// eslint-disable-next-line no-console
	console.debug = noop;
	// eslint-disable-next-line no-console
	console.warn = noop;
	// eslint-disable-next-line no-console
	console.error = noop;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Analytics />
  </StrictMode>,
)
