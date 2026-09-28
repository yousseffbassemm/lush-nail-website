import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The API runs as a separate Node process (server/); in development Vite forwards /api to it.
const api = { '/api': { target: `http://localhost:${process.env.API_PORT ?? 8787}` } }

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy: api },
  preview: { proxy: api },
  build: {
    target: 'es2022',
    cssCodeSplit: true,
  },
})
