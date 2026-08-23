import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { NeedCalculator } from './NeedCalculator'
import { renderWithMantine } from '../test/render'
import { makeStack } from '../test/fixtures'
import { writeResultUnitPreference } from '../storage/resultUnitPreference'

beforeEach(() => {
  localStorage.clear()
})

describe('NeedCalculator', () => {
  /** AC 7: the species field is always shown and required — unlike spec 19's
   *  per-lot comparison, every result this screen gives includes a volume
   *  unit, so species is never conditionally skippable here. */
  it('always shows the species field, on both the energy and the volume tab', () => {
    renderWithMantine(<NeedCalculator stacks={[]} onBack={() => undefined} />)
    expect(screen.getByLabelText(/vedtype/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: /får tilbud om/i }))
    expect(screen.getByLabelText(/vedtype/i)).toBeInTheDocument()
  })

  /** AC 1: an energy need, a species and a stove -> a wood amount in the
   *  preferred unit and at least one other. */
  it('turns a kWh need into a wood amount in more than one unit', () => {
    renderWithMantine(<NeedCalculator stacks={[]} onBack={() => undefined} />)

    fireEvent.change(screen.getByLabelText(/energibehov/i), { target: { value: '5000' } })
    fireEvent.click(screen.getByRole('button', { name: /beregn/i }))

    const text = screen.getByTestId('need-result').textContent ?? ''
    expect(text).toMatch(/favn/i)
    expect(text).toMatch(/sekk/i)
  })

  /** AC 2: an amount already offered in a volume unit -> the kWh it
   *  represents, and the amount restated in other units — proving the
   *  conversion runs in both directions. */
  it('turns an offered volume into the kWh it represents', () => {
    renderWithMantine(<NeedCalculator stacks={[]} onBack={() => undefined} />)

    fireEvent.click(screen.getByRole('tab', { name: /får tilbud om/i }))
    fireEvent.change(screen.getByLabelText(/mengde/i), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: /beregn/i }))

    expect(screen.getByText(/kwh levert varme/i)).toBeInTheDocument()
    const text = screen.getByTestId('need-result').textContent ?? ''
    expect(text).toMatch(/sekk/i)
  })

  /** AC 3: the same kWh need, compared across two stoves of different
   *  efficiency, must change the displayed answer. */
  it('changes the wood amount when the stove changes', () => {
    renderWithMantine(<NeedCalculator stacks={[]} onBack={() => undefined} />)

    fireEvent.change(screen.getByLabelText(/energibehov/i), { target: { value: '5000' } })
    fireEvent.click(screen.getByRole('button', { name: /beregn/i }))
    const efficient = screen.getByTestId('need-result').textContent

    fireEvent.change(screen.getByLabelText(/^ovn$/i), { target: { value: 'grue' } })
    fireEvent.click(screen.getByRole('button', { name: /beregn/i }))
    const inefficient = screen.getByTestId('need-result').textContent

    expect(inefficient).not.toBe(efficient)
  })

  /** AC 4: no unit is shown with more precision than `roundForUnit` allows —
   *  a favn figure never carries three decimals. */
  it('never shows a favn amount to three decimals', () => {
    renderWithMantine(<NeedCalculator stacks={[]} onBack={() => undefined} />)

    fireEvent.change(screen.getByLabelText(/energibehov/i), { target: { value: '4321' } })
    fireEvent.click(screen.getByRole('button', { name: /beregn/i }))

    expect(screen.getByTestId('need-result').textContent).not.toMatch(/\d+,\d{3,}/)
  })

  /** AC 5: the "already have" line only appears once a stack has a non-empty
   *  ledger, and it is not shown at all for a visitor who has never used it. */
  it('shows what is left to buy only once a stack has logged volume', () => {
    const withoutLedger = renderWithMantine(
      <NeedCalculator stacks={[makeStack({ id: 'a' })]} onBack={() => undefined} />,
    )
    fireEvent.change(screen.getByLabelText(/energibehov/i), { target: { value: '5000' } })
    fireEvent.click(screen.getByRole('button', { name: /beregn/i }))
    expect(screen.queryByTestId('need-already-have')).not.toBeInTheDocument()
    withoutLedger.unmount()

    const withLedger = makeStack({
      id: 'a',
      volumeEntries: [{ id: 'e1', date: '2026-01-01', kind: 'addition', amount: 1, unit: 'favn' }],
    })
    renderWithMantine(<NeedCalculator stacks={[withLedger]} onBack={() => undefined} />)
    fireEvent.change(screen.getByLabelText(/energibehov/i), { target: { value: '5000' } })
    fireEvent.click(screen.getByRole('button', { name: /beregn/i }))
    expect(screen.getByTestId('need-already-have')).toBeInTheDocument()
  })

  /** AC 6: the visitor's unit preference decides which unit is said first and
   *  largest among the units shown. */
  it('puts the preferred unit first in the result', () => {
    writeResultUnitPreference('sekk60')
    renderWithMantine(<NeedCalculator stacks={[]} onBack={() => undefined} />)

    fireEvent.change(screen.getByLabelText(/energibehov/i), { target: { value: '5000' } })
    fireEvent.click(screen.getByRole('button', { name: /beregn/i }))

    const text = screen.getByTestId('need-result').textContent ?? ''
    expect(text.indexOf('sekk')).toBeLessThan(text.indexOf('favn'))
  })
})
