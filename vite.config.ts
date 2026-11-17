import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest', // our own service worker (src/sw.ts) so we can receive notifications
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt', // never switch versions silently; the app shows an "Update" pop-up
      injectRegister: false,
      includeAssets: ['icon.svg'],
      manifest: {
        id: '/',
        name: 'Cars Uganda',
        short_name: 'Cars Uganda',
        description: 'Quality cars for sale in Uganda',
        theme_color: '#b91c1c',
        background_color: '#0b0b0f',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      injectManifest: { globPatterns: ['**/*.{js,css,html,svg,webmanifest}'] },
    }),
  ],
})
