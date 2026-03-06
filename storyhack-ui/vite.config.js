import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // Proxy API calls to FastAPI so we don't need CORS during dev
      '/pipeline': 'http://localhost:8000',
      '/scenes':   'http://localhost:8000',
      '/video':    'http://localhost:8000',
      '/images':   'http://localhost:8000',
    },
  },
})
