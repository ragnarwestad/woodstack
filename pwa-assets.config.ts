/**
 * Configuration for @vite-pwa/assets-generator, which is run by hand when the
 * mark changes (see README.md § The icon).
 *
 * It exists for one reason: the generator's `minimal` preset pads the source
 * image onto a WHITE canvas for the maskable and apple icons. Android masks
 * the whole canvas to the launcher's shape, so a white canvas puts the mark in
 * a white circle instead of the plum tile it was drawn as — the icon looked
 * like a small square floating on nothing. The padding is the point of those
 * two icons and stays; only what fills it changes.
 *
 * The preset is written out here rather than imported from
 * '@vite-pwa/assets-generator/config'. The generator is deliberately not a
 * dependency (pnpm-workspace.yaml says why), so it runs via `pnpm dlx` and its
 * own modules cannot be imported from this repo. These three entries ARE the
 * `minimal` preset, copied from it; the only change is `background`.
 */

// The manifest's theme_color and background_color, and the tile colour in
// src/assets/icon-source.svg. All four are the same plum on purpose — a test
// in src/test/iconConfig.test.ts holds them together.
const TILE = '#3A1A38'

export default {
  images: ['public/favicon.svg'],
  preset: {
    // Unchanged from the preset: `purpose: "any"` icons keep their
    // transparency, which is what everything outside the launcher wants.
    transparent: {
      sizes: [64, 192, 512],
      favicons: [[64, 'favicon.ico']],
    },
    maskable: {
      sizes: [512],
      resizeOptions: { fit: 'contain', background: TILE },
    },
    apple: {
      sizes: [180],
      resizeOptions: { fit: 'contain', background: TILE },
    },
  },
}
