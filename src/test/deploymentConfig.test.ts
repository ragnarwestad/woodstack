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

  // Two hand-kept copies of the same list is exactly what pwaIcons.ts exists
  // to prevent, so a second literal here is a failure, not a style question.
  it('keeps no second icons array of its own', () => {
    expect(viteConfig).not.toMatch(/icons:\s*\[/)
  })

  // Cloudflare Pages serves the app from the root, so the Vite default holds.
  // GitHub Pages would have forced base: '/woodstack/' and relative paths
  // throughout the manifest — see 3-solution.md § Approaches.
  it('leaves base at the Vite default', () => {
    const base = viteConfig.match(/^\s*base:\s*(.+)$/m)
    if (base) expect(base[1]).toMatch(/^'\/',?$/)
  })
})

describe('.aide/project.yaml', () => {
  const manifest = repoFile('.aide/project.yaml')

  it('names Cloudflare Pages as the deployment host', () => {
    expect(manifest).toMatch(/^deployment:\n(?:\s+.*\n)*?\s+host: Cloudflare Pages$/m)
  })

  it('no longer lists deployment among the keys left out as unknown', () => {
    const leftOut = manifest.slice(manifest.indexOf('# Left out until they are real'))
    expect(leftOut).not.toContain('deployment')
  })
})

describe('README.md', () => {
  const readme = repoFile('README.md')

  it('names the chosen host', () => {
    expect(readme).toContain('Cloudflare Pages')
  })

  it.each([
    "Where it is deployed, and therefore the `base` path in `vite.config.ts`,\n  which is still `/`.",
    "An icon of its own. `public/favicon.svg` is still the Vite template's, and\n  the manifest has no icons.",
  ])('no longer states %j as undecided', (sentence) => {
    expect(readme).not.toContain(sentence)
  })
})
