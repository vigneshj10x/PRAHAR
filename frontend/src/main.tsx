import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app/App.tsx'
import { startKeepAlive } from './lib/keepAlive'

// Initialize keep-alive ping for Render free tier backend
startKeepAlive()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

