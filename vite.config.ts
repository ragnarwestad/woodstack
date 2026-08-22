/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
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
        // Icons are added once there is a source image to generate them from:
        // `pnpm dlx @vite-pwa/assets-generator`. See pnpm-workspace.yaml.
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
