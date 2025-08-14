import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './ui/App.tsx'

// Ensure background image works under both dev (/) and GitHub Pages (/SuperSolitare/)
try {
  const base = (import.meta as any).env?.BASE_URL || '/'
  const bgUrl = `${base.replace(/\/$/, '')}/assets/backgrounds/ss-bg.svg`
  document.body.style.backgroundImage = `url('${bgUrl}')`
} catch {}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
