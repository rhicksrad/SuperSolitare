import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Use subpath in production for GitHub Pages
  base: command === 'build' ? '/SuperSolitare/' : '/',
  plugins: [react()],
  build: {
    // Default output folder for Actions deploy; for /docs builds use: vite build --outDir docs
    outDir: 'dist',
    emptyOutDir: true,
  },
}))
