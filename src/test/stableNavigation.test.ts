import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')

describe('stable navigation between pages', () => {
  it('hides both forms of the viewport scrollbar without disabling scrolling', () => {
    const html = css.match(/html\s*\{([^}]*)\}/)?.[1] ?? ''
    const webkitScrollbar = css.match(/html::-webkit-scrollbar\s*\{([^}]*)\}/)?.[1] ?? ''

    expect(html).toMatch(/scrollbar-width:\s*none\s*;/)
    expect(webkitScrollbar).toMatch(/display:\s*none\s*;/)
    expect(`${html}\n${webkitScrollbar}`).not.toMatch(/overflow(?:-[xy])?\s*:/)
  })
})
