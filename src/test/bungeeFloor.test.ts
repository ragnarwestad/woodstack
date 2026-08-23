import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { theme } from '../theme'
import { BUNGEE_FLOOR_PX, bungeeSitesBelow16 } from './fontRules'

// Vitest runs from the project root, so paths are resolved against it.
const COMPONENTS = resolve(process.cwd(), 'src/components')

const componentFiles = readdirSync(COMPONENTS)
  .filter((name) => name.endsWith('.tsx') && !name.endsWith('.test.tsx'))
  .sort()

/** The whole rule, in one sentence: Bungee is never set below 16 px. Above it
 *  the face keeps everything it was drawn for; below it the poster feeling
 *  comes from Outfit 700 in capitals with tracking instead.
 *
 *  Checked against the source rather than the rendered tree because Mantine's
 *  `fz` prop compiles to a `calc()` happy-dom will not accept — see the note
 *  in `fontRules.ts`. The four call sites that write their size into a
 *  `styles={{ ... }}` object DO reach the DOM, and their own component tests
 *  walk the rendered tree for them as well. */
describe('the 16 px floor under Bungee', () => {
  it.each(componentFiles)('holds in %s', (name) => {
    const sites = bungeeSitesBelow16(readFileSync(resolve(COMPONENTS, name), 'utf8'), name)
    expect(
      sites,
      sites.map((site) => `${name}:${site.line} asks for Bungee at ${site.sizePx ?? 'no stated size'}`).join('\n'),
    ).toEqual([])
  })

  /** `headings.fontFamily` is Bungee, so every size in `headings.sizes` is a
   *  Bungee size — the one place a new heading could drop under the floor
   *  without any call site mentioning the face at all. */
  it('holds for every heading the theme sizes', () => {
    const sizes = Object.entries(theme.headings?.sizes ?? {})
    expect(theme.headings?.fontFamily).toContain('Bungee')
    expect(sizes.length).toBeGreaterThan(0)
    for (const [heading, size] of sizes) {
      const rem = Number(/^([\d.]+)rem$/.exec(String(size.fontSize))?.[1])
      expect(rem * 16, `${heading} is set at ${size.fontSize}`).toBeGreaterThanOrEqual(BUNGEE_FLOOR_PX)
    }
  })
})
