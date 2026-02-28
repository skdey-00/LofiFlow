import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  build: {
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate React libraries
          'react-vendor': ['react', 'react-dom'],
          // Separate animation library
          'motion-vendor': ['framer-motion'],
        },
      },
    },
    // Enable source maps for debugging
    sourcemap: true,
    // Optimize chunk size warnings
    chunkSizeWarningLimit: 1000,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['framer-motion'],
  },
})
