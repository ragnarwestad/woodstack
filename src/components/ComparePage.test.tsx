import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithMantine } from '../test/render'
import { nb } from '../i18n/nb'
import { ComparePage } from './ComparePage'

/** What this screen will be — two lots side by side, kroner per kWh for each
 *  and a line saying which one wins — waits on the price engine spec 18
 *  builds. Until that lands there is nothing to compute, so the tests here
 *  cover what the screen does today: it says so, and it gets out of the way.
 *  The species gating and the four per-lot figures (acceptance criteria 5 and
 *  6) have no test yet because there is no engine to assert them against. */
describe('ComparePage', () => {
  it('names itself, so the visitor knows which screen they landed on', () => {
    renderWithMantine(<ComparePage onBack={() => undefined} />)
    expect(screen.getByRole('heading', { name: nb['compare.title'] })).toBeInTheDocument()
  })

  it('says plainly that the comparison itself is not built yet', () => {
    renderWithMantine(<ComparePage onBack={() => undefined} />)
    expect(screen.getByText(nb['compare.pending'])).toBeInTheDocument()
  })

  it('goes back the same way every other screen does', () => {
    const onBack = vi.fn()
    renderWithMantine(<ComparePage onBack={onBack} />)

    fireEvent.click(screen.getByRole('button', { name: /tilbake/i }))
    expect(onBack).toHaveBeenCalledOnce()
  })
})
