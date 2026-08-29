import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, within } from '@testing-library/react'
import { renderWithMantine } from '../test/render'
import { nb } from '../i18n/nb'
import { RESULT_UNIT_STORAGE_KEY, readResultUnitPreference } from '../storage/resultUnitPreference'
import { ComparePage } from './ComparePage'

/** Two lots side by side, four figures each, and one line saying which is the
 *  better buy. The arithmetic itself is tested in `model/lot.test.ts` against
 *  the spreadsheet; what is tested here is that the screen asks for the right
 *  things and puts the right answers on screen. */

beforeEach(() => {
  localStorage.clear()
})

/** happy-dom has no layout engine, so the phone-width branch cannot be
 *  reached by resizing anything — it is read from `useMediaQuery`, which
 *  falls back to `false` (`window.matchMedia` does not exist here) unless a
 *  test stands one up itself. This is the one the narrow-screen tests below
 *  install; every other test in this file runs with the real absence of
 *  `matchMedia` and so exercises the side-by-side layout, same as before. */
function mockNarrowViewport() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: true,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    })),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

/** Fills in one lot. The unit goes in before the species, because changing the
 *  unit is what decides whether the species field takes anything. */
function fillLot(index: number, values: { price: string; amount: string; unit?: string; species?: string; moisture?: string }) {
  const lot = within(screen.getByTestId(`lot-${index}`))

  if (values.unit) fireEvent.change(lot.getByLabelText(nb['compare.unitLabel']), { target: { value: values.unit } })
  if (values.species) fireEvent.change(lot.getByLabelText(nb['compare.speciesLabel']), { target: { value: values.species } })
  if (values.moisture) fireEvent.change(lot.getByLabelText(nb['compare.moistureLabel']), { target: { value: values.moisture } })
  fireEvent.change(lot.getByLabelText(nb['compare.priceLabel']), { target: { value: values.price } })
  fireEvent.change(lot.getByLabelText(nb['compare.amountLabel']), { target: { value: values.amount } })
}

function figure(index: number, name: string): string {
  return within(screen.getByTestId(`lot-${index}`)).getByTestId(name).textContent ?? ''
}

describe('ComparePage', () => {
  it('names itself, so the visitor knows which screen they landed on', () => {
    renderWithMantine(<ComparePage />)
    expect(screen.getByRole('heading', { name: nb['compare.title'] })).toBeInTheDocument()
  })

  /** Acceptance criterion 6. A favn of birch and a favn of spruce are nearly
   *  twice apart in energy, so a volume lot has to say which wood it is; kilos
   *  are already a weight and need no species. The field stays put either way
   *  — a field that comes and goes moves everything under it, the same rule
   *  `AddStackForm` states for its second-species picker. */
  it('asks a lot sold by volume which wood it is, and a lot sold by weight not', () => {
    renderWithMantine(<ComparePage />)

    fillLot(0, { price: '2400', amount: '1', unit: 'favn' })
    fillLot(1, { price: '3000', amount: '1000', unit: 'kg' })

    const volumeSpecies = within(screen.getByTestId('lot-0')).getByLabelText(nb['compare.speciesLabel'])
    const weightSpecies = within(screen.getByTestId('lot-1')).getByLabelText(nb['compare.speciesLabel'])

    expect(volumeSpecies).toBeEnabled()
    expect(weightSpecies).toBeDisabled()
    expect(weightSpecies).toBeInTheDocument()
  })

  /** Acceptance criterion 5: all four figures the description asks for, not
   *  only the headline one. 1 favn of birch is 1600 solid litres, 800 kg bone
   *  dry, 960 kg at 20 % — so 2400 kroner is 2,50 per kilo. */
  it('shows all four figures for each lot, not only the kilowatt-hour price', () => {
    renderWithMantine(<ComparePage />)

    fillLot(0, { price: '2400', amount: '1', unit: 'favn', species: 'bjork' })
    fillLot(1, { price: '900', amount: '1', unit: 'losKubikk', species: 'gran' })

    expect(figure(0, 'krPerKgDry')).toContain('2,50')
    expect(figure(0, 'krPerKwh')).toContain('0,595')
    expect(figure(0, 'kgAt20Percent')).toContain('960')
    // Favn is the default result unit, and one favn is one favn.
    expect(figure(0, 'amountInUnit')).toContain('1')

    // 500 solid litres of spruce: 190 kg dry, 228 kg at 20 %.
    expect(figure(1, 'kgAt20Percent')).toContain('228')
    expect(figure(1, 'amountInUnit')).toContain('0,31')
  })

  it('restates both amounts in the unit that was already chosen when the screen opened', () => {
    localStorage.setItem(RESULT_UNIT_STORAGE_KEY, 'fastKubikk')
    renderWithMantine(<ComparePage />)

    fillLot(0, { price: '2400', amount: '1', unit: 'favn', species: 'bjork' })

    expect(figure(0, 'amountInUnit')).toContain('1,6')
  })

  /** The point of moving the picker onto this screen: changing it and seeing
   *  what it did are the same glance, with nothing else to press. */
  it('recalculates the amounts the moment another unit is picked on the screen', () => {
    renderWithMantine(<ComparePage />)

    fillLot(0, { price: '2400', amount: '1', unit: 'favn', species: 'bjork' })
    expect(figure(0, 'amountInUnit')).toContain('1,00')

    fireEvent.change(screen.getByLabelText(nb['compare.resultUnitLabel']), {
      target: { value: 'fastKubikk' },
    })

    expect(figure(0, 'amountInUnit')).toContain('1,6')
  })

  /** One remembered setting, not one per screen: it is picked once and still
   *  there tomorrow, and on the calculator screen too. */
  it('remembers the unit picked here, past this session', () => {
    renderWithMantine(<ComparePage />)

    fireEvent.change(screen.getByLabelText(nb['compare.resultUnitLabel']), {
      target: { value: 'storsekk' },
    })

    expect(readResultUnitPreference()).toBe('storsekk')
  })

  /** Kilos cannot be restated as favner without knowing which wood they are,
   *  and a weight lot is never asked. A dash says so; a number would be made
   *  up. */
  it('leaves the restated amount blank for a lot sold by the kilo', () => {
    renderWithMantine(<ComparePage />)

    fillLot(0, { price: '3000', amount: '1000', unit: 'kg' })

    expect(figure(0, 'amountInUnit')).toContain('–')
  })

  it('says which lot is cheaper and by how much, rather than leaving two columns to compare', () => {
    renderWithMantine(<ComparePage />)

    // Same wood, same amount, one of them half the price: 50 % cheaper.
    fillLot(0, { price: '1200', amount: '1', unit: 'favn', species: 'bjork' })
    fillLot(1, { price: '2400', amount: '1', unit: 'favn', species: 'bjork' })

    const verdict = screen.getByTestId('verdict').textContent ?? ''
    expect(verdict).toContain('1')
    expect(verdict).toContain('50')
  })

  /** The verdict is a sentence, not a wordmark — Bungee draws capitals only,
   *  so it turned "Parti 1 er 50 % billigere per kWh" into a shout, the same
   *  problem a stack's own name has on `StackDetail`. */
  it('sets the verdict in the body face, not the display one', () => {
    renderWithMantine(<ComparePage />)
    fillLot(0, { price: '1200', amount: '1', unit: 'favn', species: 'bjork' })
    fillLot(1, { price: '2400', amount: '1', unit: 'favn', species: 'bjork' })

    expect(getComputedStyle(screen.getByTestId('verdict')).fontFamily).not.toContain('Bungee')
  })

  /** Acceptance criterion 1. The verdict names a lot by number; the badge
   *  points at the card, so the winner can be seen without reading a
   *  sentence and counting cards. */
  it('marks the cheaper lot\u2019s own card, not only the verdict line', () => {
    renderWithMantine(<ComparePage />)

    fillLot(0, { price: '1200', amount: '1', unit: 'favn', species: 'bjork' })
    fillLot(1, { price: '2400', amount: '1', unit: 'favn', species: 'bjork' })

    expect(within(screen.getByTestId('lot-0')).getByText(nb['compare.cheapestBadge'])).toBeInTheDocument()
    expect(within(screen.getByTestId('lot-1')).queryByText(nb['compare.cheapestBadge'])).not.toBeInTheDocument()
  })

  it('names no winner when the two cost the same', () => {
    renderWithMantine(<ComparePage />)

    fillLot(0, { price: '2400', amount: '1', unit: 'favn', species: 'bjork' })
    fillLot(1, { price: '2400', amount: '1', unit: 'favn', species: 'bjork' })

    expect(screen.getByTestId('verdict')).toHaveTextContent(nb['compare.verdictTie'])
    // Acceptance criterion 2: a tie has no winner to point at, so neither
    // card is marked either.
    expect(screen.queryByText(nb['compare.cheapestBadge'])).not.toBeInTheDocument()
  })

  it('waits for both lots before saying anything about which one wins', () => {
    renderWithMantine(<ComparePage />)

    fillLot(0, { price: '2400', amount: '1', unit: 'favn', species: 'bjork' })

    expect(screen.queryByTestId('verdict')).not.toBeInTheDocument()
    // Acceptance criterion 3: the badge cannot run ahead of the verdict it
    // reads from — one priced lot is not a comparison.
    expect(screen.queryByText(nb['compare.cheapestBadge'])).not.toBeInTheDocument()
  })

  /** The same placeholder as the narrow layout, not the old two-sentence
   *  intro — the two lots side by side is the only thing that differs
   *  between the narrow and the wide screen now. */
  it('holds the verdict’s place before both lots are priced, here too', () => {
    renderWithMantine(<ComparePage />)
    expect(screen.getByText(nb['compare.verdictAwaiting'])).toBeInTheDocument()

    fillLot(0, { price: '1200', amount: '1', unit: 'favn', species: 'bjork' })
    fillLot(1, { price: '2400', amount: '1', unit: 'favn', species: 'bjork' })

    expect(screen.queryByText(nb['compare.verdictAwaiting'])).not.toBeInTheDocument()
    expect(screen.getByTestId('verdict')).toBeInTheDocument()
  })

  /** The placeholder's sentence is longer than the verdict's and would wrap
   *  to a second line on its own, making its card taller — which is exactly
   *  what nudged everything below it down a few pixels the moment the
   *  verdict replaced it. Sharing one `min-height` is what keeps the swap
   *  from moving anything below it. */
  it('gives the placeholder and the verdict the same minimum height', () => {
    renderWithMantine(<ComparePage />)
    const placeholderHeight = screen.getByText(nb['compare.verdictAwaiting']).parentElement?.style.minHeight
    expect(placeholderHeight).toBeTruthy()

    fillLot(0, { price: '1200', amount: '1', unit: 'favn', species: 'bjork' })
    fillLot(1, { price: '2400', amount: '1', unit: 'favn', species: 'bjork' })

    expect(screen.getByTestId('verdict').parentElement?.style.minHeight).toBe(placeholderHeight)
  })
})

/** On a phone, side by side used to mean two long forms stacked instead, with
 *  the verdict at the bottom of both — the one thing the screen exists to
 *  say, behind the longest scroll on it. */
describe('ComparePage on a narrow screen', () => {
  it('shows one lot at a time, behind a tab for each', () => {
    mockNarrowViewport()
    renderWithMantine(<ComparePage />)

    expect(screen.getByRole('tab', { name: nb['compare.lotHeading'].replace('{number}', '1') })).toBeInTheDocument()
    expect(screen.getByTestId('lot-0')).toBeInTheDocument()
    expect(screen.queryByTestId('lot-1')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: nb['compare.lotHeading'].replace('{number}', '2') }))
    expect(screen.getByTestId('lot-1')).toBeInTheDocument()
    expect(screen.queryByTestId('lot-0')).not.toBeInTheDocument()
  })

  it('puts the verdict above the tabs, not after two long forms', () => {
    mockNarrowViewport()
    renderWithMantine(<ComparePage />)

    fillLot(0, { price: '1200', amount: '1', unit: 'favn', species: 'bjork' })
    fireEvent.click(screen.getByRole('tab', { name: nb['compare.lotHeading'].replace('{number}', '2') }))
    fillLot(1, { price: '2400', amount: '1', unit: 'favn', species: 'bjork' })

    const verdict = screen.getByTestId('verdict')
    const tabs = screen.getByRole('tablist')
    expect(verdict.compareDocumentPosition(tabs) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  /** Without this, the tabs sit right under the picker until both lots are
   *  priced, then jump down the moment the verdict appears above them. The
   *  placeholder holds that spot from the first render, so the tabs never
   *  move once the visitor starts pricing the second lot. */
  it('holds the verdict’s place before both lots are priced, so the tabs do not jump down', () => {
    mockNarrowViewport()
    renderWithMantine(<ComparePage />)

    expect(screen.getByText(nb['compare.verdictAwaiting'])).toBeInTheDocument()
    const placeholder = screen.getByText(nb['compare.verdictAwaiting'])
    const tabsBefore = screen.getByRole('tablist')
    expect(placeholder.compareDocumentPosition(tabsBefore) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    fillLot(0, { price: '1200', amount: '1', unit: 'favn', species: 'bjork' })
    fireEvent.click(screen.getByRole('tab', { name: nb['compare.lotHeading'].replace('{number}', '2') }))
    fillLot(1, { price: '2400', amount: '1', unit: 'favn', species: 'bjork' })

    expect(screen.queryByText(nb['compare.verdictAwaiting'])).not.toBeInTheDocument()
    expect(screen.getByTestId('verdict')).toBeInTheDocument()
  })
})
