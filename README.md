# Woodstack

## Table of contents

- [What it is](#what-it-is)
- [How the estimate works](#how-the-estimate-works)
- [Running it](#running-it)
- [How it is built](#how-it-is-built)
- [Not decided yet](#not-decided-yet)

---

## What it is

Enter your firewood stacks — species, when they were stacked, whether they
stand under cover — and Woodstack estimates the window when the wood is dry
enough to burn. Everything is stored in the browser: no account, no server,
no sync between devices. Installable as a PWA and usable offline.

## How the estimate works

- **Approach-to-equilibrium model.**
  `moisture(t+1) = emc + (moisture(t) - emc) * exp(-k * dt)`. `emc`
  (equilibrium moisture content) comes from temperature and relative
  humidity via the Hailwood-Horrobin model (USDA Wood Handbook —
  established, not calibrated). `k` is a drying rate that depends on
  species, split size, cover, sun and wind; the per-species coefficients
  are literature estimates, not calibrated against real stacks.
- **Climate normals only, no live weather.** Firewood dries over 6-24
  months, so actual weather converges to normal over that span. One
  Open-Meteo call per location, ever: several years of daily temperature
  and humidity reduced to monthly means and cached. The app then works
  offline. Live weather could be layered on later as a correction.
- **A window, not a date.** The app shows "ready between mid-September
  and mid-October", never a single date. Logging a moisture reading fits
  `k` for that stack and narrows the window.
- **One moisture basis (dry basis), named everywhere in the UI.** Fresh
  birch is 45% one way and 75% the other; the two are never mixed.
- **Safari's 7-day storage eviction** is handled by prompting
  installation (installed PWAs are exempt) and by making the whole app
  state exportable/restorable via a link, since a stack is a handful of
  fields.

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
