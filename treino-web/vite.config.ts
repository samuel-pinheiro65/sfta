import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      workbox: { globPatterns: ['**/*.{js,css,html,svg,woff2}'] },
      manifest: {
        id: '/',
        name: "Samuel's Fabulous Training App",
        short_name: 'SFTA',
        lang: 'pt-BR',
        start_url: '/',
        display: 'standalone',
        theme_color: '#101114',
        background_color: '#101114',
        icons: [{ src: '/treino.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
    }),
  ],
});
