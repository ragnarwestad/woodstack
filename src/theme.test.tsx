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

describe('the Woodstack ’26 theme, wired the way main.tsx wires it', () => {
  /** The accents step a shade brighter in the dark scheme: the same ember has
   *  to hold its contrast against plum night that it holds against cream. */
  it('resolves the ember accent one shade apart in the two schemes', () => {
    expect(resolvedVariable('light', '--mantine-color-orange-filled')).toBe('#E1512A')
    expect(resolvedVariable('dark', '--mantine-color-orange-filled')).toBe('#F0623A')
  })

  /** Mantine's own body colour is white and its borders are grey. Both are
   *  wrong for this palette, and both are what `cssVariablesResolver` exists
   *  to replace. */
  it('paints the page cream in light and plum in dark', () => {
    expect(resolvedVariable('light', '--mantine-color-body')).toBe('#F7EBD3')
    expect(resolvedVariable('dark', '--mantine-color-body')).toBe('#150A13')
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
