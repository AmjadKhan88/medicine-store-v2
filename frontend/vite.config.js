import { defineConfig } from 'vite';
import react  from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType:  'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name:             'MediStore — Pharmacy Management',
        short_name:       'MediStore',
        description:      'Professional Medicine Store Management System',
        theme_color:      '#0ea5e9',
        background_color: '#0f172a',
        display:          'standalone',
        orientation:      'portrait-primary',
        scope:            '/',
        start_url:        '/app',
        icons: [
          { src: '/icons/icon-72.png',   sizes: '72x72',   type: 'image/png' },
          { src: '/icons/icon-96.png',   sizes: '96x96',   type: 'image/png' },
          { src: '/icons/icon-128.png',  sizes: '128x128', type: 'image/png' },
          { src: '/icons/icon-144.png',  sizes: '144x144', type: 'image/png' },
          { src: '/icons/icon-152.png',  sizes: '152x152', type: 'image/png' },
          { src: '/icons/icon-192.png',  sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/icon-384.png',  sizes: '384x384', type: 'image/png' },
          { src: '/icons/icon-512.png',  sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
        shortcuts: [
          { name: 'New Invoice', short_name: 'Invoice', url: '/app/billing/create',  icons: [{ src: '/icons/icon-96.png', sizes: '96x96' }] },
          { name: 'Medicines',   short_name: 'Meds',    url: '/app/medicines',        icons: [{ src: '/icons/icon-96.png', sizes: '96x96' }] },
          { name: 'Patients',    short_name: 'Patients',url: '/app/patients',         icons: [{ src: '/icons/icon-96.png', sizes: '96x96' }] },
        ],
        categories: ['medical', 'business', 'productivity'],
      },
      workbox: {
        // Cache strategies
        runtimeCaching: [
          // API calls — network first, fallback to cache
          {
            urlPattern: /^https?:\/\/.*\/api\/(?!auth).*/i,
            handler:    'NetworkFirst',
            options: {
              cacheName:          'api-cache',
              expiration:         { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
              networkTimeoutSeconds: 10,
            },
          },
          // Static assets — cache first
          {
            urlPattern: /\.(?:js|css|woff2?|png|jpg|jpeg|svg|ico)$/,
            handler:    'CacheFirst',
            options: {
              cacheName:  'static-cache',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          // Cloudinary images
          {
            urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
            handler:    'CacheFirst',
            options: {
              cacheName:  'cloudinary-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
        // Pre-cache the shell
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        skipWaiting:           true,
        clientsClaim:          true,
      },
      devOptions: {
        enabled: true,   // enable PWA in dev for testing
        type:    'module',
      },
    }),
  ],
  server: {
    proxy: { '/api': { target: 'http://localhost:5000', changeOrigin: true } },
  },
});
