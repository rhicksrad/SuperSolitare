import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/pixelify-sans/400.css'
import '@fontsource/pixelify-sans/500.css'
import '@fontsource/pixelify-sans/700.css'
import silkscreen400 from '@fontsource/silkscreen/files/silkscreen-latin-400-normal.woff2?url'
import silkscreen700 from '@fontsource/silkscreen/files/silkscreen-latin-700-normal.woff2?url'
import './index.css'

// Pixelify Sans has ambiguous digits (3/8, 5/S), so numerals everywhere come
// from Silkscreen instead via unicode-range — letters stay Pixelify.
const digitFont = document.createElement('style')
digitFont.textContent = `
@font-face {
  font-family: 'Pixel Digits';
  src: url(${silkscreen400}) format('woff2');
  font-weight: 400;
  font-display: swap;
  unicode-range: U+0030-0039, U+0024;
}
@font-face {
  font-family: 'Pixel Digits';
  src: url(${silkscreen700}) format('woff2');
  font-weight: 500 900;
  font-display: swap;
  unicode-range: U+0030-0039, U+0024;
}`
document.head.appendChild(digitFont)
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
