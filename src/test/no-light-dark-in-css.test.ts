import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/** `light-dark()` works in JSX and in a JS string — `Logo.tsx` uses it for the
 *  fifth log's ring and `PLUM_PANEL` for the panel fill, and both reach the DOM
 *  untouched. In a **stylesheet** it does not survive the build: Lightning CSS
 *  rewrites it into `var(--lightningcss-light,…)var(--lightningcss-dark,…)`,
 *  never defines either variable, and the declaration is dropped as invalid.
 *  That is what left the header panel's ring pattern invisible on the deployed
 *  site while every test passed.
 *
 *  A value that differs between the schemes belongs in `cssVariablesResolver`
 *  in `theme.ts`, which has a `light` and a `dark` block for exactly this. */
describe('index.css', () => {
  it('does not use light-dark(), which the build silently breaks', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')
    expect(css).not.toContain('light-dark(')
  })
})
