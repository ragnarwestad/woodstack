import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Vitest runs from the project root, so paths are resolved against it.
const repoFile = (name: string) => readFileSync(resolve(process.cwd(), name), 'utf8')

describe('the favicon is the project’s own mark', () => {
  // The Vite template logo fills every path with this purple.
  it('no longer carries the Vite template’s fill colour', () => {
    expect(repoFile('public/favicon.svg')).not.toContain('#863bff')
  })

  // Woodstack '26: the tile is plum, and the browns it replaced are gone.
  it('carries the Woodstack ’26 palette, not the brown it replaced', () => {
    const mark = repoFile('src/assets/icon-source.svg')
    expect(mark).toContain('#3A1A38')
    expect(mark).not.toContain('#8B4513')
  })

  it('is the same mark the icon set is generated from', () => {
    expect(repoFile('public/favicon.svg')).toBe(repoFile('src/assets/icon-source.svg'))
  })
})

describe('vite.config.ts', () => {
  const viteConfig = repoFile('vite.config.ts')

  it('takes the manifest icons from src/pwaIcons.ts', () => {
    expect(viteConfig).toMatch(/import \{ pwaIcons \} from '\.\/src\/pwaIcons(\.ts)?'/)
    expect(viteConfig).toMatch(/icons:\s*pwaIcons/)
  })

  // The install chrome is the first thing a visitor sees of the app, before a
  // line of its CSS has loaded, so it is the mark's own plum and not a brown
  // left over from the icon that came before it.
  it('paints the install chrome in the mark’s plum', () => {
    expect(viteConfig).toMatch(/theme_color: '#3A1A38'/)
    expect(viteConfig).toMatch(/background_color: '#3A1A38'/)
    expect(viteConfig).not.toContain('#8B4513')
    expect(viteConfig).not.toContain('#1A1512')
  })

  // Two hand-kept copies of the same list is exactly what pwaIcons.ts exists
  // to prevent, so a second literal here is a failure, not a style question.
  it('keeps no second icons array of its own', () => {
    expect(viteConfig).not.toMatch(/icons:\s*\[/)
  })

  // No host is chosen yet, so nothing has asked for a base of its own.
  // A host that serves from a subpath would force one — that is a decision
  // for the spec that picks the host, not an assumption to bake in here.
  it('leaves base at the Vite default', () => {
    const base = viteConfig.match(/^\s*base:\s*(.+)$/m)
    if (base) expect(base[1]).toMatch(/^'\/',?$/)
  })
})

describe('README.md', () => {
  const readme = repoFile('README.md')

  it('no longer calls the icon undecided', () => {
    expect(readme).not.toContain(
      "An icon of its own. `public/favicon.svg` is still the Vite template's, and\n  the manifest has no icons.",
    )
  })
})
