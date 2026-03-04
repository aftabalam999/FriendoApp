import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['util', 'events', 'buffer', 'process'],
      globals: { process: true, global: true, Buffer: true }
    })
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  },
  build: {
    sourcemap: false,           // no source maps in production (smaller bundle)
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-socket': ['socket.io-client'],
          'vendor-peer': ['simple-peer'],
          'vendor-icons': ['lucide-react'],
        }
      }
    },
    assetsInlineLimit: 4096,    // inline assets < 4kb as base64
  }
})
