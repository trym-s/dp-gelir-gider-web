import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    svgr() 
  ],
  server: {
    port: 3000,
    // Backend API istekleri için proxy ayarı
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000', // Flask backend sunucunuzun adresi
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'build',
  },
});
