/**
 * The PWA manifest's icon set, kept in one place so `vite.config.ts` and the
 * test that checks the files exist read the same list.
 *
 * The filenames come from `@vite-pwa/assets-generator`'s `minimal` preset,
 * run against `src/assets/icon-source.svg` (see README.md § How it is built).
 * Regenerating with the same preset overwrites the same files; if a preset
 * ever changes, this list changes with it.
 */
export type PwaIcon = {
  src: string
  sizes: string
  type: string
  purpose?: string
}

export const pwaIcons: PwaIcon[] = [
  { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
  { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
  { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
  {
    src: 'maskable-icon-512x512.png',
    sizes: '512x512',
    type: 'image/png',
    // Android crops the icon to a launcher-chosen shape; a maskable icon
    // keeps its own padding so nothing important is cut off.
    purpose: 'maskable',
  },
]
