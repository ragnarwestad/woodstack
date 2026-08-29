import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { MantineProvider } from '@mantine/core'
import { render } from '@testing-library/react'
import { cssVariablesResolver, theme } from './theme'

/** Mantine's own stylesheet holds the default value of every variable, and the
 *  provider injects only the ones this theme changes — so what the browser
 *  finally resolves is the second layered over the first. `src/test/render.tsx`
 *  deliberately renders against a bare provider, which means these are the only
 *  tests in the suite that exercise the pair `main.tsx` actually mounts. */
const MANTINE_DEFAULTS = readFileSync(
  resolve(process.cwd(), 'node_modules/@mantine/core/styles/default-css-variables.css'),
  'utf8',
)

/** Every `selector { … }` at the top level of a stylesheet, @media blocks and
 *  all. Nesting is counted rather than matched so a rule inside @media cannot
 *  be mistaken for a rule of its own. */
function* topLevelRules(css: string): Generator<[string, string]> {
  let depth = 0
  let selectorStart = 0
  let bodyStart = 0
  let selector = ''
  for (let i = 0; i < css.length; i++) {
    if (css[i] === '{') {
      if (depth === 0) {
        selector = css.slice(selectorStart, i).trim()
        bodyStart = i + 1
      }
      depth++
    } else if (css[i] === '}') {
      depth--
      if (depth === 0) {
        yield [selector, css.slice(bodyStart, i)]
        selectorStart = i + 1
      }
    }
  }
}

/** The variables that apply to the document in one colour scheme: the
 *  scheme-less rules plus that scheme's own, in source order, the way a
 *  cascade of equal specificity resolves. */
function collectVariables(css: string, scheme: 'light' | 'dark', into: Map<string, string>): void {
  const other = scheme === 'light' ? 'dark' : 'light'
  for (const [selector, body] of topLevelRules(css)) {
    if (!selector.includes(':root') && !selector.includes(':host')) continue
    if (selector.includes(`color-scheme='${other}'`) || selector.includes(`color-scheme="${other}"`)) continue
    for (const declaration of body.matchAll(/(--[\w-]+):\s*([^;]+)/g)) {
      into.set(declaration[1], declaration[2].trim())
    }
  }
}

/** What `--name` ends up being for a visitor in this colour scheme, following
 *  `var()` indirection the way the browser does. */
function resolvedVariable(scheme: 'light' | 'dark', name: string): string | undefined {
  render(
    <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver} forceColorScheme={scheme}>
      <span />
    </MantineProvider>,
  )

  const variables = new Map<string, string>()
  collectVariables(MANTINE_DEFAULTS, scheme, variables)
  for (const style of document.querySelectorAll('style')) {
    collectVariables(style.textContent ?? '', scheme, variables)
  }

  let value = variables.get(name)
  for (let hop = 0; value !== undefined && hop < 10; hop++) {
    const reference = value.match(/^var\((--[\w-]+)\)$/)
    if (!reference) return value
    value = variables.get(reference[1])
  }
  return value
}

/** The WCAG relative luminance of a `#rrggbb` colour. */
function relativeLuminance(hex: string): number {
  const [r, g, b] = [0, 2, 4].map((offset) => parseInt(hex.slice(1 + offset, 3 + offset), 16) / 255)
  const linear = (channel: number) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}

/** The WCAG contrast ratio between two `#rrggbb` colours, always 1 or more
 *  regardless of which one is passed first. Not the 4.5:1 that rule is built
 *  for text on a background — this is one dark surface against another, where
 *  even a modest ratio is the difference between "raised" and "the same
 *  colour". */
function contrastRatio(a: string, b: string): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x)
  return (lighter + 0.05) / (darker + 0.05)
}

describe('the Woodstack ’26 theme, wired the way main.tsx wires it', () => {
  /** The accents step a shade brighter in the dark scheme: the same ember has
   *  to hold its contrast against plum night that it holds against cream. */
  it('resolves the ember accent one shade apart in the two schemes', () => {
    expect(resolvedVariable('light', '--mantine-color-orange-filled')).toBe('#E1512A')
    expect(resolvedVariable('dark', '--mantine-color-orange-filled')).toBe('#F0623A')
  })

  /** The reported bug: the header panel's ring pattern did not render at all
   *  on the deployed site. It was written as `light-dark()` inside
   *  `index.css`, and Lightning CSS rewrites that function in a stylesheet
   *  into `var(--lightningcss-light,…)var(--lightningcss-dark,…)` — two
   *  colours glued together where one belongs — and then never defines either
   *  variable. The gradient stop was invalid, so the browser threw the whole
   *  declaration away.
   *
   *  The colour now comes through the resolver, like every other value that
   *  differs between the schemes. `light-dark()` in JSX and in a JS string is
   *  untouched by the build and stays fine; in a stylesheet it must not be
   *  used, and `no-light-dark-in-css.test.ts` guards that. */
  it('gives the header rings a colour in both schemes', () => {
    expect(resolvedVariable('light', '--ws-header-ring')).toBe('rgba(232, 163, 42, 0.22)')
    expect(resolvedVariable('dark', '--ws-header-ring')).toBe('rgba(242, 178, 60, 0.18)')
  })

  /** Mantine's own body colour is white and its borders are grey. Both are
   *  wrong for this palette, and both are what `cssVariablesResolver` exists
   *  to replace. */
  it('paints the page cream in light and plum in dark', () => {
    expect(resolvedVariable('light', '--mantine-color-body')).toBe('#F7EBD3')
    expect(resolvedVariable('dark', '--mantine-color-body')).toBe('#150A13')
  })

  /** The reported bug: cards and fields barely lifted off the dark page.
   *  `Paper` and `Input` take their dark-mode background from shade 6 of the
   *  `dark` tuple and their border from shade 4 — not shade 3, which an
   *  earlier version of this tuple put the intended border colour in. Shade
   *  4 was darker than shade 6 was meant to read against, so the border all
   *  but disappeared into the card it was drawn on. */
  it('gives Paper and Input a border that is actually visible against their own background', () => {
    const border = resolvedVariable('dark', '--mantine-color-dark-4')
    const surface = resolvedVariable('dark', '--mantine-color-dark-6')

    expect(border).toBe('#4A2A44')
    expect(surface).toBe('#3D2140')
    expect(contrastRatio(border!, surface!)).toBeGreaterThan(1.1)
  })

  /** The other half of the same bug: the card surface itself sat close
   *  enough to the body colour that a `Paper` with no border of its own —
   *  most of them, since `withBorder` is the exception — did not read as
   *  raised at all. */
  it('lifts the card surface clearly off the body in dark mode', () => {
    const body = resolvedVariable('dark', '--mantine-color-body')
    const surface = resolvedVariable('dark', '--mantine-color-dark-6')

    expect(contrastRatio(body!, surface!)).toBeGreaterThan(1.3)
  })

  /** The reported bug: a `NativeSelect`'s own dropdown arrow was invisible in
   *  dark mode. `Combobox` pulls shade 3 of the `dark` tuple for it, and the
   *  value fixing the border left there was nearly the same darkness as the
   *  lightened field background (shade 6) — the arrow all but disappeared
   *  into the field it sat in. */
  it('gives the dropdown chevron a colour actually visible against the field it sits in', () => {
    const chevron = resolvedVariable('dark', '--mantine-color-dark-3')
    const field = resolvedVariable('dark', '--mantine-color-dark-6')

    expect(contrastRatio(chevron!, field!)).toBeGreaterThan(3)
  })
})

describe('the theme leaves the poster decoration to a later spec', () => {
  /** The design bundle also draws pill-shaped buttons, pill tabs and rounded
   *  cards. That is a separate job, and it must not arrive as a side effect of
   *  wiring the palette in: every Button, Tabs and SegmentedControl in the app
   *  today takes the theme's default shape without overriding it. */
  it('gives buttons, tabs and segmented controls no shape of its own', () => {
    expect(theme.components?.Button).toBeUndefined()
    expect(theme.components?.Tabs).toBeUndefined()
    expect(theme.components?.Paper).toBeUndefined()
    expect(theme.components?.SegmentedControl).toBeUndefined()
    expect(theme.defaultRadius).toBeUndefined()
  })
})
