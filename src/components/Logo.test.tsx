import { describe, expect, it } from 'vitest'
import { renderWithMantine } from '../test/render'
import { Logo } from './Logo'

/** The mark's five logs, in the order `logo.svg` drew them: the group's
 *  `transform`, then the three concentric fills from the outside in. The
 *  drawing moved from a static asset into this component, and the only thing
 *  that was allowed to change is the fifth log's outer ring gaining an edge —
 *  so the numbers live here, spelled out, and a nudged radius or a swapped
 *  fill turns this file red instead of quietly redrawing the header. */
const LOGS = [
  { transform: 'translate(180 180)', fills: ['#E1512A', '#E8A32A', '#3A1A38'] },
  { transform: 'translate(332 180)', fills: ['#157F76', '#F7EBD3', '#157F76'] },
  { transform: 'translate(104 332)', fills: ['#E8A32A', '#B8336A', '#F7EBD3'] },
  { transform: 'translate(256 332)', fills: ['#B8336A', '#E8A32A', '#3A1A38'] },
  { transform: 'translate(408 332)', fills: ['#F7EBD3', '#E1512A', '#E8A32A'] },
]

function renderLogo() {
  const { container } = renderWithMantine(<Logo />)
  return container
}

describe('Logo', () => {
  /** The bug: the fifth log's outer ring is painted the same cream the light
   *  theme paints the page, so in light there are four rings and a floating
   *  ember. The edge is what makes the fifth one countable — and it is keyed
   *  to the app's own colour scheme, not the browser's, which is why the mark
   *  is drawn here rather than loaded as an `<img>`.
   *
   *  Dark gets the ring's own cream rather than `transparent`: an unpainted
   *  stroke would draw no edge, which is right, but it would also stop the log
   *  short of the radius the other four have. Cream on cream is invisible and
   *  keeps the disc whole. */
  it('outlines the fifth log in bark, and only in the light theme', () => {
    const ring = renderLogo().querySelector('[data-testid="fifth-log-ring"]')

    expect(ring?.getAttribute('stroke')).toBe('light-dark(#2E1A0F, #F7EBD3)')
    expect(ring?.getAttribute('stroke-width')).toBe('8')
    expect(ring?.getAttribute('fill')).toBe('#F7EBD3')
  })

  /** The fourth log sits exactly tangent to the fifth (dx 152 = 76 + 76). A
   *  stroke centred on the original r 76 would have painted half its width
   *  outwards, taking a bite out of the neighbour — so the ring insets and the
   *  painted edge lands back on the boundary the drawing always had. */
  it('keeps the outlined ring inside the boundary the drawing had', () => {
    const ring = renderLogo().querySelector('[data-testid="fifth-log-ring"]')
    const r = Number(ring?.getAttribute('r'))
    const strokeWidth = Number(ring?.getAttribute('stroke-width'))

    expect(strokeWidth).toBeGreaterThan(0)
    expect(r + strokeWidth / 2).toBe(76)
  })

  /** One ring gains an edge. Four do not: an outline on all five would be a
   *  restyle of the mark, not a fix for the one that cannot be seen. */
  it('leaves the other four outer rings unbordered', () => {
    const others = Array.from(renderLogo().querySelectorAll('circle[r="76"]'))

    expect(others).toHaveLength(4)
    for (const circle of others) {
      expect(circle.getAttribute('stroke')).toBeNull()
    }
  })

  it('draws the same five logs, in the same places, in the same colours', () => {
    const groups = Array.from(renderLogo().querySelectorAll('svg > g > g'))

    expect(groups.map((g) => g.getAttribute('transform'))).toEqual(LOGS.map((log) => log.transform))
    expect(
      groups.map((g) => Array.from(g.querySelectorAll('circle')).map((c) => c.getAttribute('fill'))),
    ).toEqual(LOGS.map((log) => log.fills))
  })

  /** The header spells the app's name out in a `<Title>` right beside the
   *  mark, so the mark is decoration — the same thing the `alt=""` on the
   *  `<img>` it replaces was saying. */
  it('keeps the original frame and stays decorative', () => {
    const svg = renderLogo().querySelector('svg')

    expect(svg?.getAttribute('viewBox')).toBe('28 104 456 304')
    expect(svg?.getAttribute('aria-hidden')).toBe('true')
  })
})
