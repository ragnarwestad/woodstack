import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Vitest runs from the project root, so paths are resolved against it.
const repoFile = (name: string) => readFileSync(resolve(process.cwd(), name), 'utf8')

/** The app works offline and calls nobody but Open-Meteo. A font served from
 *  Google's CDN would break both halves of that at once, so Bungee and Outfit
 *  ship inside the build and are precached with everything else. */
describe('the display faces are self-hosted', () => {
  const css = repoFile('src/index.css')

  it('fetches no font from a CDN', () => {
    expect(css).not.toContain('fonts.googleapis.com')
    expect(css).not.toContain('fonts.gstatic.com')
  })

  it('takes both faces from the bundled packages', () => {
    expect(css).toContain('@fontsource/bungee')
    expect(css).toContain('@fontsource/outfit')
  })

  // The fonts are part of what the visitor downloads, not a tool used to build
  // it, so `dependencies` is where they belong.
  it('lists both faces as dependencies, not dev tools', () => {
    const pkg = JSON.parse(repoFile('package.json')) as {
      dependencies: Record<string, string>
      devDependencies: Record<string, string>
    }
    expect(Object.keys(pkg.dependencies)).toEqual(
      expect.arrayContaining(['@fontsource/bungee', '@fontsource/outfit']),
    )
    expect(Object.keys(pkg.devDependencies)).not.toContain('@fontsource/bungee')
    expect(Object.keys(pkg.devDependencies)).not.toContain('@fontsource/outfit')
  })
})
