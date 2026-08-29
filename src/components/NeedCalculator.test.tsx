import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { NeedCalculator } from './NeedCalculator'
import { renderWithMantine } from '../test/render'
import { makeStack } from '../test/fixtures'
import { nb } from '../i18n/nb'
import { readResultUnitPreference, writeResultUnitPreference } from '../storage/resultUnitPreference'

beforeEach(() => {
  localStorage.clear()
})

describe('NeedCalculator', () => {
  /** The reported bug: the title scrolled away with the very first swipe,
   *  while `AppHeader` stayed put above it. `AppHeader` publishes its own
   *  rendered height as `--ws-header-height`, and this heading reads it back
   *  as its own sticky `top` so it stays pinned just below the header
   *  instead — only the fields still scroll.
   *
   *  The `top` value itself is NOT checked here: happy-dom drops a `var(...)`
   *  value out of a `top` declaration entirely (see `StackList.test.tsx`'s
   *  own note on the same thing). `position: sticky` is what survives. */
  it('pins its own title under the header instead of letting it scroll away', () => {
    renderWithMantine(<NeedCalculator stacks={[]} />)

    const row = screen.getByRole('heading', { name: nb['need.title'] }).closest('[class*="Group"]') as HTMLElement
    expect(row.style.position).toBe('sticky')
  })

  /** The reported bug: this row came out shorter than the list's own
   *  heading row, which has a button in it this one does not — three
   *  different heights instead of one shape. Pinned to the button's own
   *  height, the same value `StackList`'s row is pinned to as well. */
  it('gives the title row the same height the list heading row needs for its button', () => {
    renderWithMantine(<NeedCalculator stacks={[]} />)

    const row = screen.getByRole('heading', { name: nb['need.title'] }).closest('[class*="Group"]') as HTMLElement
    expect(row.style.minHeight).toBe('52px')
  })

  /** AC 7: the species field is always shown and required — unlike spec 19's
   *  per-lot comparison, every result this screen gives includes a volume
   *  unit, so species is never conditionally skippable here. */
  it('always shows the species field, on both the energy and the volume tab', () => {
    renderWithMantine(<NeedCalculator stacks={[]} />)
    expect(screen.getByLabelText(/vedtype/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('radio', { name: /får tilbud om/i }))
    expect(screen.getByLabelText(/vedtype/i)).toBeInTheDocument()
  })

  /** AC 1: an energy need, a species and a stove -> a wood amount in the
   *  preferred unit and at least one other. */
  it('turns a kWh need into a wood amount in more than one unit', () => {
    renderWithMantine(<NeedCalculator stacks={[]} />)

    fireEvent.change(screen.getByLabelText(/energibehov/i), { target: { value: '5000' } })
    fireEvent.click(screen.getByRole('button', { name: /beregn/i }))

    const text = screen.getByTestId('need-result').textContent ?? ''
    expect(text).toMatch(/favn/i)
    expect(text).toMatch(/sekk/i)
  })

  /** The result is a sentence, not a wordmark — Bungee draws capitals only,
   *  so it turned "Omtrent 3,2 favner, eller 2 sekker" into a shout, the same
   *  problem a stack's own name has on `StackDetail`. */
  it('sets the result in the body face, not the display one', () => {
    renderWithMantine(<NeedCalculator stacks={[]} />)

    fireEvent.change(screen.getByLabelText(/energibehov/i), { target: { value: '5000' } })
    fireEvent.click(screen.getByRole('button', { name: /beregn/i }))

    expect(getComputedStyle(screen.getByTestId('need-result')).fontFamily).not.toContain('Bungee')
  })

  /** AC 2: an amount already offered in a volume unit -> the kWh it
   *  represents, and the amount restated in other units — proving the
   *  conversion runs in both directions. */
  it('turns an offered volume into the kWh it represents', () => {
    renderWithMantine(<NeedCalculator stacks={[]} />)

    fireEvent.click(screen.getByRole('radio', { name: /får tilbud om/i }))
    fireEvent.change(screen.getByLabelText(/mengde/i), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: /beregn/i }))

    expect(screen.getByText(/kwh levert varme/i)).toBeInTheDocument()
    const text = screen.getByTestId('need-result').textContent ?? ''
    expect(text).toMatch(/sekk/i)
  })

  /** AC 3: the same kWh need, compared across two stoves of different
   *  efficiency, must change the displayed answer. */
  it('changes the wood amount when the stove changes', () => {
    renderWithMantine(<NeedCalculator stacks={[]} />)

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
    renderWithMantine(<NeedCalculator stacks={[]} />)

    fireEvent.change(screen.getByLabelText(/energibehov/i), { target: { value: '4321' } })
    fireEvent.click(screen.getByRole('button', { name: /beregn/i }))

    expect(screen.getByTestId('need-result').textContent).not.toMatch(/\d+,\d{3,}/)
  })

  /** AC 5: the "already have" line only appears once a stack has a non-empty
   *  ledger, and it is not shown at all for a visitor who has never used it. */
  it('shows what is left to buy only once a stack has logged volume', () => {
    const withoutLedger = renderWithMantine(
      <NeedCalculator stacks={[makeStack({ id: 'a' })]} />,
    )
    fireEvent.change(screen.getByLabelText(/energibehov/i), { target: { value: '5000' } })
    fireEvent.click(screen.getByRole('button', { name: /beregn/i }))
    expect(screen.queryByTestId('need-already-have')).not.toBeInTheDocument()
    withoutLedger.unmount()

    const withLedger = makeStack({
      id: 'a',
      volumeEntries: [{ id: 'e1', date: '2026-01-01', kind: 'addition', amount: 1, unit: 'favn' }],
    })
    renderWithMantine(<NeedCalculator stacks={[withLedger]} />)
    fireEvent.change(screen.getByLabelText(/energibehov/i), { target: { value: '5000' } })
    fireEvent.click(screen.getByRole('button', { name: /beregn/i }))
    expect(screen.getByTestId('need-already-have')).toBeInTheDocument()
  })

  /** The error names the field that is actually wrong — «Energibehov» on the
   *  energy tab, «Mengden» on the volume one — rather than one generic
   *  sentence that fits neither exactly. */
  it('names the energy field in the error on the energy tab, and the amount on the volume tab', () => {
    renderWithMantine(<NeedCalculator stacks={[]} />)
    fireEvent.click(screen.getByRole('button', { name: /beregn/i }))
    expect(screen.getByText(nb['need.energyAmountRange'])).toBeInTheDocument()

    fireEvent.click(screen.getByRole('radio', { name: /får tilbud om/i }))
    fireEvent.click(screen.getByRole('button', { name: /beregn/i }))
    expect(screen.getByText(nb['need.amountRange'])).toBeInTheDocument()
  })

  /** The error and the answer are the same two things happening in the same
   *  spot — one or the other, below the button — so «Beregn» does not jump to
   *  a different place depending on whether the last number typed was good. */
  it('puts the error below the button, where the answer would otherwise be', () => {
    renderWithMantine(<NeedCalculator stacks={[]} />)

    fireEvent.click(screen.getByRole('button', { name: /beregn/i }))
    const button = screen.getByRole('button', { name: /beregn/i })
    const error = screen.getByText(nb['need.energyAmountRange'])

    expect(button.compareDocumentPosition(error) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  /** AC 6: the visitor's unit preference decides which unit is said first and
   *  largest among the units shown. */
  it('puts the preferred unit first in the result', () => {
    writeResultUnitPreference('sekk60')
    renderWithMantine(<NeedCalculator stacks={[]} />)

    fireEvent.change(screen.getByLabelText(/energibehov/i), { target: { value: '5000' } })
    fireEvent.click(screen.getByRole('button', { name: /beregn/i }))

    const text = screen.getByTestId('need-result').textContent ?? ''
    expect(text.indexOf('sekk')).toBeLessThan(text.indexOf('favn'))
  })

  /** The picker sits on the screen the answer is on, so the answer follows the
   *  pick straight away — `solidLiters` is unit-independent, and nothing about
   *  the sum changed, so «Beregn» does not have to be pressed a second time. */
  it('restates a result already on screen the moment another unit is picked', () => {
    renderWithMantine(<NeedCalculator stacks={[]} />)

    fireEvent.change(screen.getByLabelText(/energibehov/i), { target: { value: '5000' } })
    fireEvent.click(screen.getByRole('button', { name: /beregn/i }))
    const inFavn = screen.getByTestId('need-result').textContent ?? ''
    expect(inFavn.indexOf('favn')).toBeLessThan(inFavn.indexOf('sekk'))

    fireEvent.change(screen.getByLabelText(nb['compare.resultUnitLabel']), {
      target: { value: 'storsekk' },
    })

    const inStorsekk = screen.getByTestId('need-result').textContent ?? ''
    expect(inStorsekk.indexOf('storsekk')).toBeLessThan(inStorsekk.indexOf('favn'))
  })

  /** One remembered setting, not one per screen: what is picked here is what
   *  the comparison screen opens with. */
  it('remembers the unit picked here, past this session', () => {
    renderWithMantine(<NeedCalculator stacks={[]} />)

    fireEvent.change(screen.getByLabelText(nb['compare.resultUnitLabel']), {
      target: { value: 'losKubikk' },
    })

    expect(readResultUnitPreference()).toBe('losKubikk')
  })
})
