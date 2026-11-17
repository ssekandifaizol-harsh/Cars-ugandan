import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Cars Uganda',
        short_name: 'Cars Uganda',
        description: 'Quality cars for sale in Uganda',
        theme_color: '#b91c1c',
        background_color: '#0b0b0f',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // Car photos from Supabase Storage: show cached copy instantly, refresh in background
            urlPattern: /\/storage\/v1\/object\/public\//,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'car-photos', expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 14 } },
          },
        ],
      },
    }),
  ],
})
