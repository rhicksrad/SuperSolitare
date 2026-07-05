import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './ui/App'
import { useGame } from './state/store'

// Test hook: lets Playwright drive the store directly in dev builds
if (import.meta.env.DEV) {
  ;(window as unknown as { __game: typeof useGame }).__game = useGame
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
