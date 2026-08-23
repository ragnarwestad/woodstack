import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Tabs } from '@mantine/core'
import { screen } from '@testing-library/react'
import { renderWithMantine } from './render'

// Vitest runs from the project root, so paths are resolved against it.
const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')

/** The body of one top-level rule, found by its exact selector. Rules are
 *  written at column 0 in this stylesheet, which is what keeps `.ws-tab` from
 *  matching `.ws-tab[data-active]`. */
function ruleBody(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = new RegExp(`^[ \\t]*${escaped}\\s*\\{([^{}]*)\\}`, 'm').exec(css)
  expect(match, `no \`${selector}\` rule in src/index.css`).not.toBeNull()
  return match![1]
}

/** The tabs are underlined, not filled: Mantine's own underline is 1 px, which
 *  vanishes on a screen whose every other edge is 2 px. So the rule under the
 *  whole row is 2 px and the active tab's own underline is 3 px. */
describe('the tab underline', () => {
  it('rules off the whole row at the weight the rest of the screen uses', () => {
    expect(ruleBody('.mantine-Tabs-list::before')).toContain('border-width: 2px 0 0 0')
  })

  it('gives the active tab the heavier underline', () => {
    expect(ruleBody('.ws-tab')).toContain('border-bottom-width: 3px')
  })

  /** Mantine colours the active tab with `.m_539e827b:where([data-active])`,
   *  and `:where()` adds no specificity — so that rule weighs exactly as much
   *  as a bare `.ws-tab`, and `index.css` is loaded second. A border colour
   *  set here would therefore win over it and paint the active tab's underline
   *  transparent along with the rest, leaving the row with nothing marking
   *  where you are standing. */
  it('sets no colour on the underline, so the active tab keeps the one Mantine gives it', () => {
    expect(ruleBody('.ws-tab')).not.toMatch(/border(-bottom)?-color:/)
  })

  /** The pill was the thing the person the app is being built for looked at
   *  and called a chip rather than a tab. A whole-box `border` is what drew
   *  it, so its absence is the change. */
  it('draws no box around a tab', () => {
    expect(ruleBody('.ws-tab')).not.toMatch(/(?:^|[;\s])border:/)
  })

  /** The pill gave the active tab the page's own background colour for its
   *  text, so it read as a chip cut out of the background. With no fill left
   *  behind it, that same rule would paint the label onto the background it
   *  matches and the active tab would go blank. */
  it('leaves the active label a colour that is not the background', () => {
    expect(css).not.toMatch(/\.ws-tab\[data-active\][^{]*\{[^}]*color:\s*var\(--mantine-color-body\)/)
  })

  /** `.mantine-Tabs-list` is Mantine's own generated class, not one this app
   *  sets — a version bump could rename it and drop the row rule silently.
   *  This is the test that would go red if it did. */
  it('hangs the row rule on a class Mantine actually renders', () => {
    renderWithMantine(
      <Tabs defaultValue="one">
        <Tabs.List>
          <Tabs.Tab value="one">En</Tabs.Tab>
        </Tabs.List>
      </Tabs>,
    )
    expect(screen.getByRole('tablist')).toHaveClass('mantine-Tabs-list')
  })
})
