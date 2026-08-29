import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithMantine } from '../test/render'
import { SubpageHeader } from './SubpageHeader'

describe('SubpageHeader', () => {
  it('goes back through the callback it was given', () => {
    const onBack = vi.fn()
    renderWithMantine(<SubpageHeader onBack={onBack} title="Ny vedstabel" />)

    fireEvent.click(screen.getByRole('button', { name: /tilbake/i }))
    expect(onBack).toHaveBeenCalledOnce()
  })

  it('shows the title as a heading', () => {
    renderWithMantine(<SubpageHeader onBack={vi.fn()} title="Ny vedstabel" />)
    expect(screen.getByRole('heading', { name: 'Ny vedstabel' })).toBeInTheDocument()
  })

  it('carries no action at all when none is given', () => {
    renderWithMantine(<SubpageHeader onBack={vi.fn()} title="Ny vedstabel" />)
    expect(screen.queryByRole('button', { name: /endre/i })).not.toBeInTheDocument()
  })

  it('shows the action beside the title when one is given', () => {
    renderWithMantine(
      <SubpageHeader onBack={vi.fn()} title="Granveden i skjulet" action={<button>Endre</button>} />,
    )
    expect(screen.getByRole('button', { name: 'Endre' })).toBeInTheDocument()
  })

  /** The reported bug: the link and the title used to sit stacked on two
   *  lines, or side by side but pinned to the left — not centred on the
   *  page the way every other title reads. A three-column grid, `1fr auto
   *  1fr`, is what keeps the title on the true centre line whatever the
   *  link's or the action's own width — a `Group` with `space-between`
   *  centres a middle child only when the two ends happen to be the same
   *  width, which «Tilbake»/«Back» and «Endre»/«Edit» (or nothing at all,
   *  on the two forms) never are. */
  it('lays the row out as a three-column grid with the title centred between two equal flanks', () => {
    renderWithMantine(
      <SubpageHeader onBack={vi.fn()} title="Granveden i skjulet" action={<button>Endre</button>} />,
    )

    const title = screen.getByRole('heading', { name: 'Granveden i skjulet' })
    const row = title.parentElement as HTMLElement
    expect(row.style.display).toBe('grid')
    expect(row.style.gridTemplateColumns).toBe('1fr minmax(0, auto) 1fr')
    expect(title.style.textAlign).toBe('center')
  })

  /** The reported bug: a long stack name pushed the link column narrower
   *  than «← Tilbake» itself needs, and the link wrapped to two lines
   *  instead of the title — the one column in this row that is meant to
   *  wrap. `minmax(0, auto)` on the title's own column above is the fix;
   *  `white-space: nowrap` on the link is the belt to that fix's braces. */
  it('never lets the back link itself wrap, whatever the title needs', () => {
    renderWithMantine(<SubpageHeader onBack={vi.fn()} title="Granveden i skjulet" />)

    const link = screen.getByRole('button', { name: /tilbake/i })
    // Two `div`s up: `BackLink`'s own non-stretching wrapper, then this
    // component's grid cell, which is the one carrying `white-space`.
    const cell = link.closest('div')?.parentElement as HTMLElement
    expect(cell.style.whiteSpace).toBe('nowrap')
  })
})
