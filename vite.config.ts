/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

import { pwaIcons } from './src/pwaIcons.ts'
import { computeAppVersion } from './src/appVersion.ts'

// https://vite.dev/config/
export default defineConfig({
  // Read once, here, where git is still around to ask — the browser bundle
  // has no way to find out which commit it was built from.
  define: {
    __APP_VERSION__: JSON.stringify(computeAppVersion()),
  },
  plugins: [
    react(),
    VitePWA({
      // An installed app should pick up a new version on its own: nobody
      // visits a firewood app often enough to notice an update prompt.
      registerType: 'autoUpdate',
      manifest: {
        name: 'Woodstack',
        short_name: 'Woodstack',
        description: 'Når er veden tørr nok til å fyre med?',
        // A manifest carries one language. Norwegian is the first market;
        // the app itself is bilingual (nb/en) regardless of this value.
        lang: 'nb',
        theme_color: '#8B4513',
        background_color: '#1A1512',
        display: 'standalone',
        icons: pwaIcons,
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
    }),
  ],
  test: {
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
})
