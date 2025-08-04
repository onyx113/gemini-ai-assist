import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
  preview: {
    port: parseInt(process.env.PORT) || 3000,
    host: true,
    allowedHosts: ['gemini-ai-assist.onrender.com']
  },
  server: {
    port: parseInt(process.env.PORT) || 3000,
    host: true
  }
})
