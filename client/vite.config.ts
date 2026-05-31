import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Dev server proxies /api → NestJS (4000) so the client can use same-origin
// relative URLs (/api/v1/...) in both dev and the static-served prod build.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
