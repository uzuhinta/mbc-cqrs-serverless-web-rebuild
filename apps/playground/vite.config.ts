import { resolve } from 'node:path'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // Tailwind runs only for the layered fixture's host stylesheet.
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        v3: resolve(import.meta.dirname, 'v3-preflight.html'),
        layered: resolve(import.meta.dirname, 'layered.html'),
      },
    },
  },
})
