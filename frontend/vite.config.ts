import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        timeout: 300000, // 5 minutes for large file uploads
        ws: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Log proxy requests for debugging (only in dev mode)
            console.log('Proxying:', req.method, req.url, '->', proxyReq.path);
          });
          proxy.on('error', (err, _req, res) => {
            console.error('Proxy error:', err);
            if (res.writeHead) {
              res.writeHead(500, {
                'Content-Type': 'text/plain',
              });
            }
            res.end('Proxy error: ' + err.message);
          });
        },
      }
    }
  }
})









