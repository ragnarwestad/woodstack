# Woodstack

## Table of contents

- [What it is](#what-it-is)
- [Running it](#running-it)
- [How it is built](#how-it-is-built)
- [Not decided yet](#not-decided-yet)

---

## What it is

Enter your firewood stacks — species, when they were stacked, whether they
stand under cover — and Woodstack estimates the window when the wood is dry
enough to burn. Everything is stored in the browser: no account, no server,
no sync between devices. Installable as a PWA and usable offline.

## Running it

```bash
pnpm install
pnpm dev            # development server
pnpm check          # typecheck + lint + tests + build
pnpm test           # unit tests, single run
```

## How it is built

- **Vite + React + TypeScript.** The app ships a browser bundle, which is why
  it has a bundler at all — unlike aide-dashboard, which needs none.
- **vite-plugin-pwa** for the service worker and manifest. The PWA side is the
  point of the project, and that is where the mature tooling is.
- **Mantine** for components.
- **Vitest + happy-dom** for unit tests; components are tested against a DOM.
- **oxlint** for linting (the Vite template's default).

## Not decided yet

- Where it is deployed, and therefore the `base` path in `vite.config.ts`,
  which is still `/`.
- An icon of its own. `public/favicon.svg` is still the Vite template's, and
  the manifest has no icons. Generate them with
  `pnpm dlx @vite-pwa/assets-generator` once there is a source image.
