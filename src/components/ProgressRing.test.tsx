import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { ProgressRing } from './ProgressRing'
import { renderWithMantine } from '../test/render'

describe('ProgressRing', () => {
  it('shows the percent it was given', () => {
    renderWithMantine(<ProgressRing value={42} />)
    expect(screen.getByText('42 %')).toBeInTheDocument()
  })

  it('clamps a negative value to 0', () => {
    renderWithMantine(<ProgressRing value={-15} />)
    expect(screen.getByText('0 %')).toBeInTheDocument()
  })

  it('clamps a value over 100 to 100', () => {
    renderWithMantine(<ProgressRing value={150} />)
    expect(screen.getByText('100 %')).toBeInTheDocument()
  })

  /** The label and the arc are two different numbers, and only one of them is
   *  read out loud. A ring whose text says 50 % while the arc is drawn full is
   *  the failure this pins down: the dash offset IS the drawing. */
  it('draws the arc as far round as the percentage says', () => {
    const circumference = 2 * Math.PI * 27

    for (const [value, expected] of [
      [0, circumference],
      [50, circumference / 2],
      [100, 0],
    ] as const) {
      const { container, unmount } = renderWithMantine(<ProgressRing value={value} />)
      const arc = container.querySelector('[data-testid="ring-arc"]') as SVGCircleElement
      expect(Number(arc.getAttribute('stroke-dashoffset'))).toBeCloseTo(expected, 3)
      unmount()
    }
  })

  /** Dry enough is the one thing the ring says across a room, and it says it
   *  in colour. 99 % is not dry enough. */
  it('turns teal only once the wood is all the way dry', () => {
    const { container, unmount } = renderWithMantine(<ProgressRing value={99} />)
    expect(container.querySelector('[data-testid="ring-arc"]')?.getAttribute('stroke')).toContain('orange')
    unmount()

    const ready = renderWithMantine(<ProgressRing value={100} />)
    expect(ready.container.querySelector('[data-testid="ring-arc"]')?.getAttribute('stroke')).toContain('teal')
  })
})
