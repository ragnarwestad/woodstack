import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { StackDetail } from './StackDetail'
import { renderWithMantine } from '../test/render'
import { OSLO_NORMALS, actualWeather, makeStack } from '../test/fixtures'
import { getStack, saveStacks } from '../storage/stacksRepo'
import { ENGLISH_TEST_LANGUAGE, setTestLanguage } from '../test/language'
import { assertNoBungeeBelow16 } from '../test/fontRules'

beforeEach(() => {
  localStorage.clear()
  saveStacks([makeStack({ id: 'a', name: 'Bjørk ved veggen' })])
  // The screen fetches this year's weather by itself unless a test injects
  // it. Nothing in a unit test may reach the network, so the default path
  // hits a refusal here rather than open-meteo.com.
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('no network in tests')))
})

/** The notify opt-in only shows itself where the browser could honour it, and
 *  `happy-dom` has neither API — so the one test about it installs both. */
function installNotificationSupport() {
  Object.defineProperty(globalThis, 'Notification', {
    value: { permission: 'default' as NotificationPermission, requestPermission: vi.fn() },
    configurable: true,
    writable: true,
  })
  Object.defineProperty(navigator, 'serviceWorker', {
    value: { ready: Promise.resolve({ showNotification: vi.fn() }) },
    configurable: true,
    writable: true,
  })
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'Notification')
  Reflect.deleteProperty(navigator, 'serviceWorker')
})

describe('StackDetail', () => {
  /** The reported bug: the chips sit at the foot of the page, so you are
   *  scrolled to the bottom when you tap one. The panels are not the same
   *  height — 1253 px of page on «Inn/ut» against 1096 on «Historikk» — and
   *  switching to a shorter one left the page shorter than the scroll
   *  position. The browser clamped it and everything slid up under the finger.
   *
   *  `happy-dom` has no layout, so the panel area's height is stood in for
   *  here. What is being pinned is the rule, not the pixels: the area never
   *  gives back room it has already taken. */
  it('never lets the panel area shrink when a shorter chip is opened', async () => {
    renderWithMantine(
      <StackDetail stackId="a" onBack={vi.fn()} onEdit={vi.fn()} getNormalsFn={vi.fn().mockResolvedValue(OSLO_NORMALS)} />,
    )
    const area = await screen.findByTestId('tab-panels')
    const stubHeight = (height: number) =>
      Object.defineProperty(area, 'scrollHeight', { value: height, configurable: true })

    stubHeight(198)
    fireEvent.click(screen.getByRole('tab', { name: /måling/i }))
    await waitFor(() => expect(area.style.minHeight).toBe('198px'))

    // The history is the short one, and it is the switch that used to jump.
    stubHeight(41)
    fireEvent.click(screen.getByRole('tab', { name: /historikk/i }))
    await waitFor(() => expect(screen.getByRole('tab', { name: /historikk/i })).toHaveAttribute('data-active', 'true'))
    expect(area.style.minHeight).toBe('198px')
  })

  it('shows the window and the curve once the climate data is there', async () => {
    renderWithMantine(
      <StackDetail stackId="a" onBack={vi.fn()} onEdit={vi.fn()} getNormalsFn={vi.fn().mockResolvedValue(OSLO_NORMALS)} />,
    )
    await waitFor(() => expect(screen.getByText(/klar mellom/i)).toBeInTheDocument())
    expect(screen.getByRole('img', { name: /tørkekurve/i })).toBeInTheDocument()
  })

  /** The window is a range and not a date for a reason the screen never
   *  states. The mark next to it does. */
  it('explains why the window is a range and not a date', async () => {
    renderWithMantine(
      <StackDetail stackId="a" onBack={vi.fn()} onEdit={vi.fn()} getNormalsFn={vi.fn().mockResolvedValue(OSLO_NORMALS)} />,
    )
    await waitFor(() => expect(screen.getByText(/klar mellom/i)).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /hvorfor et vindu/i }))
    expect(within(screen.getByRole('dialog')).getByText(/dag for dag/i)).toBeInTheDocument()
  })

  /** The correction is an extra, never a precondition: with no actual
   *  weather the screen is exactly what it was before this existed. */
  it('shows the plain normals window, and no caption, when there is no actual weather', async () => {
    renderWithMantine(
      <StackDetail
        stackId="a"
        onBack={vi.fn()}
        onEdit={vi.fn()}
        getNormalsFn={vi.fn().mockResolvedValue(OSLO_NORMALS)}
        getActualWeatherFn={vi.fn().mockResolvedValue(null)}
      />,
    )
    await waitFor(() => expect(screen.getByText(/klar mellom/i)).toBeInTheDocument())
    const uncorrected = screen.getByTestId('window-text').textContent

    cleanup()
    renderWithMantine(
      <StackDetail
        stackId="a"
        onBack={vi.fn()}
        onEdit={vi.fn()}
        getNormalsFn={vi.fn().mockResolvedValue(OSLO_NORMALS)}
      />,
    )
    await waitFor(() => expect(screen.getByText(/klar mellom/i)).toBeInTheDocument())

    expect(screen.getByTestId('window-text').textContent).toBe(uncorrected)
    expect(screen.queryByTestId('correction-caption')).not.toBeInTheDocument()
  })

  it('says which way a corrected window moved, rather than moving it silently', async () => {
    renderWithMantine(
      <StackDetail
        stackId="a"
        onBack={vi.fn()}
        onEdit={vi.fn()}
        getNormalsFn={vi.fn().mockResolvedValue(OSLO_NORMALS)}
        getActualWeatherFn={vi.fn().mockResolvedValue(actualWeather(2026, 24, 45))}
      />,
    )
    await waitFor(() => expect(screen.getByTestId('correction-caption')).toBeInTheDocument())
    expect(screen.getByTestId('correction-caption')).toHaveTextContent(/foran normalt/i)
  })

  it('says the stack is behind normal when the year has been cold and wet', async () => {
    renderWithMantine(
      <StackDetail
        stackId="a"
        onBack={vi.fn()}
        onEdit={vi.fn()}
        getNormalsFn={vi.fn().mockResolvedValue(OSLO_NORMALS)}
        getActualWeatherFn={vi.fn().mockResolvedValue(actualWeather(2026, 2, 95))}
      />,
    )
    await waitFor(() => expect(screen.getByTestId('correction-caption')).toBeInTheDocument())
    expect(screen.getByTestId('correction-caption')).toHaveTextContent(/bak normalt/i)
  })

  it('draws one curve when the pile is all one wood', async () => {
    const { container } = renderWithMantine(
      <StackDetail stackId="a" onBack={vi.fn()} onEdit={vi.fn()} getNormalsFn={vi.fn().mockResolvedValue(OSLO_NORMALS)} />,
    )
    await waitFor(() => expect(screen.getByText(/klar mellom/i)).toBeInTheDocument())
    expect(container.querySelectorAll('polyline')).toHaveLength(1)
  })

  it('shows an explicit fetching state before the climate data arrives', () => {
    renderWithMantine(
      <StackDetail stackId="a" onBack={vi.fn()} onEdit={vi.fn()} getNormalsFn={() => new Promise(() => {})} />,
    )
    expect(screen.getByText(/henter klimadata/i)).toBeInTheDocument()
    expect(screen.queryByText(/klar mellom/i)).not.toBeInTheDocument()
  })

  it('retries by itself when the browser comes back online', async () => {
    const getNormalsFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(OSLO_NORMALS)

    renderWithMantine(<StackDetail stackId="a" onBack={vi.fn()} onEdit={vi.fn()} getNormalsFn={getNormalsFn} />)
    await waitFor(() => expect(screen.getByText(/ingen nett/i)).toBeInTheDocument())

    fireEvent(window, new Event('online'))

    await waitFor(() => expect(screen.getByText(/klar mellom/i)).toBeInTheDocument())
    expect(getNormalsFn).toHaveBeenCalledTimes(2)
  })

  it('narrows the window when a reading is logged', async () => {
    renderWithMantine(
      <StackDetail stackId="a" onBack={vi.fn()} onEdit={vi.fn()} getNormalsFn={vi.fn().mockResolvedValue(OSLO_NORMALS)} />,
    )
    await waitFor(() => screen.getByText(/klar mellom/i))
    const before = screen.getByTestId('window-text').textContent

    fireEvent.click(screen.getByRole('tab', { name: /måling/i }))
    const readingPanel = screen.getByLabelText(/fuktighet/i).closest('[role="tabpanel"]') as HTMLElement
    fireEvent.change(screen.getByLabelText(/fuktighet/i), { target: { value: '35' } })
    fireEvent.change(screen.getByLabelText(/målt/i), { target: { value: '2026-10-15' } })
    fireEvent.click(within(readingPanel).getByRole('button', { name: /^lagre$/i }))

    await waitFor(() => expect(screen.getByTestId('window-text').textContent).not.toBe(before))
  })

  /** The picture is a tab, not a band across the top. It answers "which pile is
   *  this", which the name and the species line already answer — the drying
   *  window is what the page is for, and a photo above it pushed the graph off
   *  the first screen. */
  it('keeps the photo behind its own tab, not above the drying window', async () => {
    saveStacks([makeStack({ id: 'a', name: 'Bak fjøset', photo: 'data:image/jpeg;base64,bilde' })])
    renderWithMantine(
      <StackDetail stackId="a" onBack={vi.fn()} onEdit={vi.fn()} getNormalsFn={vi.fn().mockResolvedValue(OSLO_NORMALS)} />,
    )
    await waitFor(() => screen.getByText(/klar mellom/i))

    // Mantine keeps inactive panels mounted, so the picture is in the DOM
    // either way. What matters is WHERE: inside a tab panel, not in the page
    // above the drying window.
    const photo = screen.getByAltText(/bilde av vedstabelen/i)
    expect(photo.closest('[role="tabpanel"]')).not.toBeNull()
    expect(screen.getByRole('tab', { name: /^bilde$/i })).toBeInTheDocument()
  })

  it('offers no photo tab on a stack that has none', async () => {
    renderWithMantine(
      <StackDetail stackId="a" onBack={vi.fn()} onEdit={vi.fn()} getNormalsFn={vi.fn().mockResolvedValue(OSLO_NORMALS)} />,
    )
    await waitFor(() => screen.getByText(/klar mellom/i))
    expect(screen.queryByRole('tab', { name: /^bilde$/i })).not.toBeInTheDocument()
  })

  /** The rule replaces the divider; it does not join it. A stray `<hr>` is
   *  how the old separator survives a restyle unnoticed — and the volume line
   *  itself has to stay one readable sentence, not an eyebrow and a number. */
  it('rules off the volume line with the dashed rule, not a divider', async () => {
    renderWithMantine(
      <StackDetail stackId="a" onBack={vi.fn()} onEdit={vi.fn()} getNormalsFn={vi.fn().mockResolvedValue(OSLO_NORMALS)} />,
    )
    await waitFor(() => screen.getByText(/klar mellom/i))

    expect(document.querySelectorAll('hr')).toHaveLength(0)
    expect(screen.getByTestId('dashed-rule')).toBeInTheDocument()
    expect(screen.getByText('Ingen ved lagt inn ennå.')).toBeInTheDocument()
  })

  /** The 16 px floor, on the one screen that had the most below it: the
   *  «Endre» button at 11, the volume line at 13 and the four tabs at 10.
   *  Only the tabs write their size somewhere happy-dom keeps — the two
   *  others are `fz` props, checked in `bungeeFloor.test.ts` instead. */
  it('sets nothing in Bungee below 16 px', async () => {
    renderWithMantine(
      <StackDetail stackId="a" onBack={vi.fn()} onEdit={vi.fn()} getNormalsFn={vi.fn().mockResolvedValue(OSLO_NORMALS)} />,
    )
    await waitFor(() => screen.getByText(/klar mellom/i))

    assertNoBungeeBelow16(document.body)
  })

  /** «Igjen nå: 3,2 m³ fast» has a lower-case unit in it, and capitals write
   *  the cubic metre wrong. Asserted on the style rather than on the text,
   *  because CSS `text-transform` never changes what the DOM node actually
   *  holds — a `textContent` check would read the same before and after. */
  it('leaves the volume line its own lower case, unit and all', async () => {
    saveStacks([
      makeStack({
        id: 'a',
        volumeEntries: [{ id: 'v1', date: '2026-04-15', kind: 'addition', amount: 2, unit: 'favn' }],
      }),
    ])
    renderWithMantine(
      <StackDetail stackId="a" onBack={vi.fn()} onEdit={vi.fn()} getNormalsFn={vi.fn().mockResolvedValue(OSLO_NORMALS)} />,
    )

    const line = await screen.findByText(/igjen nå: 3,2 m³ fast/i)
    expect(line.getAttribute('style') ?? '').not.toContain('text-transform: uppercase')
  })

  /** Four capitalised words in a row at tab size are the same wall the Bungee
   *  version was, so the labels keep the case `nb.ts` writes them in. */
  it('leaves the tab labels in mixed case', async () => {
    renderWithMantine(
      <StackDetail stackId="a" onBack={vi.fn()} onEdit={vi.fn()} getNormalsFn={vi.fn().mockResolvedValue(OSLO_NORMALS)} />,
    )
    await waitFor(() => screen.getByText(/klar mellom/i))

    const tab = screen.getByRole('tab', { name: /historikk/i })
    expect(tab.getAttribute('style') ?? '').not.toContain('text-transform: uppercase')
  })

  it('says the volume is not tracked yet rather than showing a bare zero', async () => {
    renderWithMantine(
      <StackDetail stackId="a" onBack={vi.fn()} onEdit={vi.fn()} getNormalsFn={vi.fn().mockResolvedValue(OSLO_NORMALS)} />,
    )
    await waitFor(() => screen.getByText(/klar mellom/i))
    expect(screen.getByText(/ingen ved lagt inn ennå/i)).toBeInTheDocument()
    expect(screen.queryByText(/igjen nå/i)).not.toBeInTheDocument()
  })

  it('shows what is left in fast kubikkmeter, whatever units the ledger was logged in', async () => {
    saveStacks([
      makeStack({
        id: 'a',
        volumeEntries: [
          { id: 'v1', date: '2026-04-15', kind: 'addition', amount: 2, unit: 'favn' },
          { id: 'v2', date: '2027-01-10', kind: 'withdrawal', amount: 1, unit: 'storsekk' },
        ],
      }),
    ])
    renderWithMantine(
      <StackDetail stackId="a" onBack={vi.fn()} onEdit={vi.fn()} getNormalsFn={vi.fn().mockResolvedValue(OSLO_NORMALS)} />,
    )

    // 2 favn = 3200 solid litres, less one storsekk at 500 = 2700.
    await waitFor(() => expect(screen.getByText(/igjen nå: 2,7 m³ fast/i)).toBeInTheDocument())
  })

  it('shows zero, not a negative number, when more was taken out than was ever logged in', async () => {
    saveStacks([
      makeStack({
        id: 'a',
        volumeEntries: [
          { id: 'v1', date: '2026-04-15', kind: 'addition', amount: 1, unit: 'storsekk' },
          { id: 'v2', date: '2027-01-10', kind: 'withdrawal', amount: 2, unit: 'storsekk' },
        ],
      }),
    ])
    renderWithMantine(
      <StackDetail stackId="a" onBack={vi.fn()} onEdit={vi.fn()} getNormalsFn={vi.fn().mockResolvedValue(OSLO_NORMALS)} />,
    )

    await waitFor(() => expect(screen.getByText(/igjen nå: 0 m³ fast/i)).toBeInTheDocument())
    // The ledger itself is untouched — the clamp is a display decision only.
    expect(getStack('a')?.volumeEntries).toHaveLength(2)
  })

  it('adds a logged entry to the running total', async () => {
    renderWithMantine(
      <StackDetail stackId="a" onBack={vi.fn()} onEdit={vi.fn()} getNormalsFn={vi.fn().mockResolvedValue(OSLO_NORMALS)} />,
    )
    await waitFor(() => screen.getByText(/klar mellom/i))

    const volumePanel = screen.getByLabelText(/enhet/i).closest('[role="tabpanel"]') as HTMLElement
    fireEvent.change(screen.getByLabelText(/mengde/i), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText(/enhet/i), { target: { value: 'favn' } })
    fireEvent.click(within(volumePanel).getByRole('button', { name: /^lagre$/i }))

    await waitFor(() => expect(screen.getByText(/igjen nå: 1,6 m³ fast/i)).toBeInTheDocument())
    expect(getStack('a')?.volumeEntries).toHaveLength(1)
  })

  it('goes back to the list', () => {
    const onBack = vi.fn()
    renderWithMantine(
      <StackDetail stackId="a" onBack={onBack} onEdit={vi.fn()} getNormalsFn={vi.fn().mockResolvedValue(OSLO_NORMALS)} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /tilbake/i }))
    expect(onBack).toHaveBeenCalled()
  })

  it('shows what has been logged against the stack, in one list', async () => {
    saveStacks([
      makeStack({
        id: 'a',
        readings: [{ id: 'r1', date: '2026-10-15', moisture: 28 }],
        volumeEntries: [{ id: 'v1', date: '2026-04-15', kind: 'addition', amount: 2, unit: 'favn' }],
      }),
    ])
    renderWithMantine(
      <StackDetail stackId="a" onBack={vi.fn()} onEdit={vi.fn()} getNormalsFn={vi.fn().mockResolvedValue(OSLO_NORMALS)} />,
    )
    await waitFor(() => screen.getByText(/klar mellom/i))

    expect(screen.getAllByTestId('entry-row')).toHaveLength(2)
  })


  it('deletes one reading and leaves the rest of the stack alone', async () => {
    saveStacks([
      makeStack({
        id: 'a',
        readings: [
          { id: 'r1', date: '2026-10-15', moisture: 28 },
          { id: 'r2', date: '2026-12-01', moisture: 24 },
        ],
        volumeEntries: [{ id: 'v1', date: '2026-04-15', kind: 'addition', amount: 2, unit: 'favn' }],
      }),
    ])
    renderWithMantine(
      <StackDetail stackId="a" onBack={vi.fn()} onEdit={vi.fn()} getNormalsFn={vi.fn().mockResolvedValue(OSLO_NORMALS)} />,
    )
    await waitFor(() => screen.getByText(/klar mellom/i))

    fireEvent.click(screen.getByRole('tab', { name: /historikk/i }))
    const row = screen.getAllByTestId('entry-row')[1]
    fireEvent.click(within(row).getByRole('button', { name: /^fjern$/i }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^ok$/i }))

    await waitFor(() => expect(screen.getAllByTestId('entry-row')).toHaveLength(2))
    expect(getStack('a')?.readings.map((r) => r.id)).toEqual(['r2'])
    expect(getStack('a')?.volumeEntries).toHaveLength(1)
  })

  it('works the running total out again when a volume entry is deleted', async () => {
    saveStacks([
      makeStack({
        id: 'a',
        volumeEntries: [
          { id: 'v1', date: '2026-04-15', kind: 'addition', amount: 2, unit: 'fastKubikk' },
          { id: 'v2', date: '2026-05-20', kind: 'addition', amount: 1, unit: 'fastKubikk' },
        ],
      }),
    ])
    renderWithMantine(
      <StackDetail stackId="a" onBack={vi.fn()} onEdit={vi.fn()} getNormalsFn={vi.fn().mockResolvedValue(OSLO_NORMALS)} />,
    )
    await waitFor(() => expect(screen.getByText(/igjen nå: 3 m³ fast/i)).toBeInTheDocument())

    fireEvent.click(screen.getByRole('tab', { name: /historikk/i }))
    const row = screen.getAllByTestId('entry-row')[1]
    fireEvent.click(within(row).getByRole('button', { name: /^fjern$/i }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^ok$/i }))

    await waitFor(() => expect(screen.getByText(/igjen nå: 2 m³ fast/i)).toBeInTheDocument())
    expect(getStack('a')?.volumeEntries?.map((entry) => entry.id)).toEqual(['v1'])
  })

  it('says so when the stack is gone', () => {
    localStorage.clear()
    renderWithMantine(
      <StackDetail stackId="nope" onBack={vi.fn()} onEdit={vi.fn()} getNormalsFn={vi.fn().mockResolvedValue(OSLO_NORMALS)} />,
    )
    expect(screen.getByText(/finner ikke/i)).toBeInTheDocument()
  })

  /** `1-description.md` puts the ask here and nowhere else: after the visitor
   *  has entered a stack, when there is something to be told about. */
  it('offers to notify the visitor once they have a stack open', async () => {
    installNotificationSupport()
    renderWithMantine(
      <StackDetail stackId="a" onBack={vi.fn()} onEdit={vi.fn()} getNormalsFn={vi.fn().mockResolvedValue(OSLO_NORMALS)} />,
    )
    await waitFor(() => expect(screen.getByText(/få beskjed når veden er klar/i)).toBeInTheDocument())
  })

  /** The four labels are the place you are standing, not four filters you
   *  switch on — a pill reads as the latter. So they are Mantine's underline
   *  tabs, split evenly across the row so each label owns its own cell and
   *  its underline meets the rule under the whole list.
   *
   *  `data-variant` and `data-grow` are what Mantine puts on the tablist for
   *  the variant and the even split; the underline's own 2 px and 3 px are in
   *  `index.css`, which has its own test. */
  it('draws the chips as an evenly split underline row, not as pills', async () => {
    renderWithMantine(
      <StackDetail stackId="a" onBack={vi.fn()} onEdit={vi.fn()} getNormalsFn={vi.fn().mockResolvedValue(OSLO_NORMALS)} />,
    )
    await waitFor(() => screen.getByText(/klar mellom/i))

    const list = screen.getByRole('tablist')
    expect(list).toHaveAttribute('data-variant', 'default')
    expect(list).toHaveAttribute('data-grow', 'true')
    expect(screen.getByRole('tab', { name: /inn\/ut/i })).toHaveStyle({ padding: '9px 6px' })
  })
})

describe('StackDetail with a mixed stack', () => {
  beforeEach(() => {
    localStorage.clear()
    saveStacks([
      makeStack({ id: 'm', name: 'Blandingsstabelen', secondSpecies: { species: 'eik', share: 'half' } }),
    ])
  })

  it('names both woods in the heading line', async () => {
    renderWithMantine(
      <StackDetail stackId="m" onBack={vi.fn()} onEdit={vi.fn()} getNormalsFn={vi.fn().mockResolvedValue(OSLO_NORMALS)} />,
    )
    await waitFor(() => expect(screen.getByText(/klar mellom/i)).toBeInTheDocument())
    expect(screen.getByText(/^Bjørk \+ Eik \(Omtrent halvparten\) · stablet 2026-04-15 · Oslo$/)).toBeInTheDocument()
  })

  it('draws a curve per wood, so the two speeds are visible', async () => {
    const { container } = renderWithMantine(
      <StackDetail stackId="m" onBack={vi.fn()} onEdit={vi.fn()} getNormalsFn={vi.fn().mockResolvedValue(OSLO_NORMALS)} />,
    )
    await waitFor(() => expect(screen.getByText(/klar mellom/i)).toBeInTheDocument())
    expect(container.querySelectorAll('polyline')).toHaveLength(2)
  })
})

describe('StackDetail in English', () => {
  it('translates the detail chrome and the species in the heading line', async () => {
    setTestLanguage(ENGLISH_TEST_LANGUAGE)
    renderWithMantine(
      <StackDetail stackId="a" onBack={vi.fn()} onEdit={vi.fn()} getNormalsFn={vi.fn().mockResolvedValue(OSLO_NORMALS)} />,
    )

    await waitFor(() => expect(screen.getByText(/ready between/i)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /back$/i })).toBeInTheDocument()
    expect(screen.getByText(/^Birch · stacked 2026-04-15 · Oslo$/)).toBeInTheDocument()
    expect(screen.queryByText(/bjørk ·/i)).not.toBeInTheDocument()
  })

  it('says the stack is gone in English', () => {
    setTestLanguage(ENGLISH_TEST_LANGUAGE)
    localStorage.clear()
    renderWithMantine(
      <StackDetail stackId="nope" onBack={vi.fn()} onEdit={vi.fn()} getNormalsFn={vi.fn().mockResolvedValue(OSLO_NORMALS)} />,
    )
    expect(screen.getByText(/cannot find this woodpile/i)).toBeInTheDocument()
  })
})
