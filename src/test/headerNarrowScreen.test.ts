import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const repoFile = (name: string) => readFileSync(resolve(process.cwd(), name), 'utf8')

const css = repoFile('src/index.css')
const header = repoFile('src/components/AppHeader.tsx')

/** The declarations inside one `{ ... }` block, as a name → value map. */
function customProperties(block: string) {
  return Object.fromEntries(
    [...block.matchAll(/(--ws-header-[a-z-]+):\s*([^;]+);/g)].map(([, name, value]) => [
      name,
      value.trim(),
    ]),
  )
}

const base = customProperties(css.match(/\.ws-header \{([^}]*)\}/)?.[1] ?? '')
const narrow = customProperties(
  css.match(/@media \(max-width: (\d+)px\) \{\s*\.ws-header \{([^}]*)\}/)?.[2] ?? '',
)

/**
 * The header puts a 78px mark, a 34px Bungee title and a slogan tracked at
 * 0.26em on the same line. Measured against the real fonts that line wants
 * 413px of screen, and a Galaxy S23+ gives 384 or 393 — so "Woodstack '26"
 * broke after "Woodstack" and the slogan dropped "ved" to a line of its own.
 * index.css restates all of it under one breakpoint.
 *
 * happy-dom has no layout engine, so none of this can be caught by rendering
 * the header and measuring it — the wrap itself is only visible in a real
 * browser. What CAN be caught is the way this arrangement fails silently: a
 * custom property that is referenced but never declared, or declared for the
 * wide case and forgotten for the narrow one, changes nothing and says nothing.
 */
describe('the header on a phone', () => {
  const referenced = [...header.matchAll(/var\((--ws-header-[a-z-]+)\)/g)].map(([, name]) => name)

  it('references at least the mark, the gap, the padding and the type', () => {
    expect(new Set(referenced).size).toBeGreaterThanOrEqual(5)
  })

  it('declares every property the header asks for', () => {
    for (const name of referenced) expect(base, `${name} is used but never declared`).toHaveProperty(name)
  })

  it('restates every one of them for the narrow screen', () => {
    for (const name of Object.keys(base)) {
      expect(narrow, `${name} has no narrow-screen value`).toHaveProperty(name)
    }
  })

  // Every one of these is a length, and the point of the breakpoint is that
  // the header takes less room below it. A value that grew is a typo.
  it('makes every one of them smaller, not larger', () => {
    for (const [name, wide] of Object.entries(base)) {
      const unit = (v: string) => v.replace(/[\d.]/g, '')
      expect(unit(narrow[name]), `${name} changes unit between the two`).toBe(unit(wide))
      expect(parseFloat(narrow[name]), `${name} is not smaller on a phone`).toBeLessThan(
        parseFloat(wide),
      )
    }
  })

  // A phone held in one hand, not Mantine's xs at 576px, where the header has
  // room to spare and shrinking it would be a change nobody asked for.
  it('breaks at a phone width', () => {
    const width = Number(css.match(/@media \(max-width: (\d+)px\) \{\s*\.ws-header/)?.[1])
    expect(width).toBeGreaterThan(400)
    expect(width).toBeLessThan(480)
  })
})
