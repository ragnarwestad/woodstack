import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { App } from './App'
import { renderWithMantine } from './test/render'
import { OSLO_NORMALS, makeStack } from './test/fixtures'
import { estimateWindow } from './model/simulate'
import { getStack, loadStacks, removeStack, saveStacks } from './storage/stacksRepo'
import { clearNormalsCache, writeCachedNormals } from './climate/normalsCache'
import { exportState } from './storage/appState'
import { ENGLISH_TEST_LANGUAGE, setTestLanguage } from './test/language'
import { nb } from './i18n/nb'

beforeEach(() => {
  localStorage.clear()
  window.location.hash = ''
  clearNormalsCache()
  writeCachedNormals(OSLO_NORMALS)
  // A brand-new browser seeds the example stacks and fetches their climate
  // normals; no unit test is going to the network for them.
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('ingen nettverk i test'))))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

/** The window is printed as thirds of a month — "midten av oktober 2026" — so
 *  "later" has to be compared on what those words mean. A bare string
 *  inequality would also pass on a window that moved the wrong way. */
const MONTH_NAMES = Array.from({ length: 12 }, (_, month) =>
  new Intl.DateTimeFormat('nb-NO', { month: 'long', timeZone: 'UTC' }).format(Date.UTC(2026, month, 1)),
)
const MONTH_PARTS = ['begynnelsen', 'midten', 'slutten']

function windowThirds(text: string): number[] {
  const ends = [...text.matchAll(/(begynnelsen|midten|slutten) av (\p{L}+) (\d{4})/gu)]
  expect(ends).toHaveLength(2)
  return ends.map(([, part, month, year]) => {
    const monthIndex = MONTH_NAMES.indexOf(month)
    expect(monthIndex).toBeGreaterThanOrEqual(0)
    return (Number(year) * 12 + monthIndex) * 3 + MONTH_PARTS.indexOf(part)
  })
}

describe('App', () => {
  it('renders inside a Mantine provider', () => {
    renderWithMantine(<App />)
    expect(screen.getByRole('heading', { name: "Woodstack '26" })).toBeInTheDocument()
  })

  it('shows the stack list when no stack is selected', () => {
    saveStacks([makeStack({ id: 'a', name: 'Bjørk ved veggen' })])
    renderWithMantine(<App />)
    expect(screen.getByText('Bjørk ved veggen')).toBeInTheDocument()
  })

  it('opens the detail view for the stack in the #s= hash', async () => {
    saveStacks([makeStack({ id: 'a', name: 'Bjørk ved veggen' })])
    window.location.hash = '#s=a'
    renderWithMantine(<App />)
    await waitFor(() => expect(screen.getByRole('button', { name: /tilbake/i })).toBeInTheDocument())
  })

  it('writes the selected stack into the hash and back out again', async () => {
    saveStacks([makeStack({ id: 'a', name: 'Bjørk ved veggen' })])
    renderWithMantine(<App />)

    fireEvent.click(screen.getByRole('button', { name: /bjørk ved veggen/i }))
    await waitFor(() => expect(window.location.hash).toBe('#s=a'))

    fireEvent.click(screen.getByRole('button', { name: /tilbake/i }))
    await waitFor(() => expect(window.location.hash).toBe(''))
  })

  it('takes a deleted stack off the list it came from', async () => {
    saveStacks([makeStack({ id: 'a', name: 'Bjørk ved veggen' }), makeStack({ id: 'b', name: 'Grana bak låven' })])
    renderWithMantine(<App />)

    // Deleting happens on the list, beside the pile it removes — not two
    // screens in, where nothing shows which one is about to go.
    const row = screen.getByText('Bjørk ved veggen').closest('[class*="Paper"]') as HTMLElement
    fireEvent.click(within(row).getByRole('button', { name: /^slett$/i }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^ok$/i }))

    await waitFor(() => expect(screen.getByText('Grana bak låven')).toBeInTheDocument())
    expect(screen.queryByText('Bjørk ved veggen')).not.toBeInTheDocument()
  })

  /** The one that would break silently. A cover change has to move the ready
   *  window, not just redraw the field: `COVER_FACTOR.none` is below
   *  `COVER_FACTOR.roof` (`src/model/dryingRate.ts`), so taking the roof off
   *  makes the stack dry slower and both ends of the window fall later. */
  it('pushes the ready window later when the roof comes off the stack', async () => {
    saveStacks([makeStack({ id: 'a', name: 'Bjørk ved veggen', cover: 'roof' })])
    renderWithMantine(<App />)

    fireEvent.click(screen.getByRole('button', { name: /bjørk ved veggen/i }))
    await waitFor(() => screen.getByTestId('window-text'))
    const before = windowThirds(screen.getByTestId('window-text').textContent ?? '')

    fireEvent.click(screen.getByRole('button', { name: /^endre$/i }))
    fireEvent.change(screen.getByLabelText(/tak/i), { target: { value: 'none' } })
    fireEvent.click(screen.getByRole('button', { name: /^lagre$/i }))

    await waitFor(() => screen.getByTestId('window-text'))
    const after = windowThirds(screen.getByTestId('window-text').textContent ?? '')

    expect(after[0]).toBeGreaterThan(before[0])
    expect(after[1]).toBeGreaterThan(before[1])
  })

  it('leaves the stack as it was when the edit is cancelled', async () => {
    saveStacks([makeStack({ id: 'a', name: 'Bjørk ved veggen' })])
    renderWithMantine(<App />)

    fireEvent.click(screen.getByRole('button', { name: /bjørk ved veggen/i }))
    await waitFor(() => screen.getByRole('button', { name: /^endre$/i }))

    fireEvent.click(screen.getByRole('button', { name: /^endre$/i }))
    fireEvent.change(screen.getByLabelText(/navn/i), { target: { value: 'Grana bak låven' } })
    fireEvent.click(screen.getByRole('button', { name: /^avbryt$/i }))

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Bjørk ved veggen' })).toBeInTheDocument())
    expect(getStack('a')?.name).toBe('Bjørk ved veggen')
  })

  it('imports an #i= link on load and lands on the list', async () => {
    window.location.hash = `#i=${exportState([makeStack({ id: 'a', name: 'Importert stabel' })])}`
    renderWithMantine(<App />)
    await waitFor(() => expect(screen.getByText('Importert stabel')).toBeInTheDocument())
    expect(window.location.hash).not.toContain('i=')
  })
})

/** The fourth screen the hash routes to, and the one that belongs to no
 *  stack: it answers a question about wood someone else is selling. */
describe('App and the comparison screen', () => {
  it('opens the comparison screen from the three-dot menu', async () => {
    saveStacks([makeStack({ id: 'a', name: 'Bjørk ved veggen' })])
    renderWithMantine(<App />)

    fireEvent.click(screen.getByRole('button', { name: nb['about.menuLabel'] }))
    fireEvent.click(screen.getByRole('menuitem', { name: nb['compare.menuItem'] }))

    // The menu writes the hash; `App` hears the `hashchange` and switches
    // screen on the tick after it, so both halves are waited for.
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: nb['compare.title'] })).toBeInTheDocument(),
    )
    expect(window.location.hash).toBe('#compare')
    expect(screen.queryByText('Bjørk ved veggen')).not.toBeInTheDocument()
  })

  /** A bookmark straight to the screen. The visitor asked for the comparison,
   *  not for a detour through their own stacks on the way to it. */
  it('renders the comparison screen directly when the app loads on #compare', async () => {
    saveStacks([makeStack({ id: 'a', name: 'Bjørk ved veggen' })])
    window.location.hash = '#compare'
    renderWithMantine(<App />)

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: nb['compare.title'] })).toBeInTheDocument(),
    )
    expect(screen.queryByText('Bjørk ved veggen')).not.toBeInTheDocument()
  })

  /** The same trap `back()` already guards against, reached the other way
   *  round: leaving a half-finished edit through the menu must not leave
   *  `editing` standing, or the NEXT stack the visitor opens lands on the
   *  edit screen unasked. */
  it('does not leave an abandoned edit standing behind it', async () => {
    saveStacks([makeStack({ id: 'a', name: 'Bjørk ved veggen' })])
    window.location.hash = '#s=a'
    renderWithMantine(<App />)

    await waitFor(() => screen.getByRole('button', { name: /^endre$/i }))
    fireEvent.click(screen.getByRole('button', { name: /^endre$/i }))
    await waitFor(() => screen.getByRole('button', { name: /^lagre$/i }))

    fireEvent.click(screen.getByRole('button', { name: nb['about.menuLabel'] }))
    fireEvent.click(screen.getByRole('menuitem', { name: nb['compare.menuItem'] }))
    await waitFor(() => screen.getByRole('heading', { name: nb['compare.title'] }))

    fireEvent.click(screen.getByRole('button', { name: /tilbake/i }))
    await waitFor(() => screen.getByText('Bjørk ved veggen'))
    fireEvent.click(screen.getByRole('button', { name: /bjørk ved veggen/i }))

    // The name field is the edit form's own — the stack page never shows it.
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Bjørk ved veggen' })).toBeInTheDocument(),
    )
    expect(screen.queryByLabelText(/navn/i)).not.toBeInTheDocument()
  })

  it('clears the hash and shows the list again on the way back', async () => {
    saveStacks([makeStack({ id: 'a', name: 'Bjørk ved veggen' })])
    window.location.hash = '#compare'
    renderWithMantine(<App />)

    await waitFor(() => screen.getByRole('heading', { name: nb['compare.title'] }))
    fireEvent.click(screen.getByRole('button', { name: /tilbake/i }))

    await waitFor(() => expect(screen.getByText('Bjørk ved veggen')).toBeInTheDocument())
    expect(window.location.hash).toBe('')
  })
})

/** The day after the default fixture stack's window opens. Read out of the
 *  model rather than written down, so a change to the drying rate cannot make
 *  this date quietly mean something else. */
function readyDay(stack: Parameters<typeof estimateWindow>[0]): Date {
  return new Date(estimateWindow(stack, OSLO_NORMALS).earliest.getTime() + 24 * 60 * 60 * 1000)
}

describe('App telling the visitor a stack is ready', () => {
  it('says so once, on the first open after the window has passed', async () => {
    const stack = makeStack({ id: 'a', name: 'Bjørk ved veggen' })
    saveStacks([stack])

    renderWithMantine(<App today={readyDay(stack)} />)

    await waitFor(() => expect(screen.getByText(/bjørk ved veggen kan være klar/i)).toBeInTheDocument())
    expect(getStack('a')?.notifiedReadyAt).toBeTruthy()
  })

  /** The one that would break silently: without the stored flag, every single
   *  app open from here to the end of the winter announces the same stack
   *  again. */
  it('does not say it again the next time the app is opened', async () => {
    const stack = makeStack({ id: 'a', name: 'Bjørk ved veggen' })
    saveStacks([stack])
    const today = readyDay(stack)

    const first = renderWithMantine(<App today={today} />)
    await waitFor(() => expect(screen.getByText(/bjørk ved veggen kan være klar/i)).toBeInTheDocument())
    first.unmount()

    renderWithMantine(<App today={new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)} />)
    await waitFor(() => expect(screen.getByText('Bjørk ved veggen')).toBeInTheDocument())
    expect(screen.queryByText(/bjørk ved veggen kan være klar/i)).not.toBeInTheDocument()
  })

  it('says nothing about a stack whose window has not opened yet', async () => {
    const stack = makeStack({ id: 'a', name: 'Bjørk ved veggen' })
    saveStacks([stack])
    const beforeReady = new Date(estimateWindow(stack, OSLO_NORMALS).earliest.getTime() - 24 * 60 * 60 * 1000)

    renderWithMantine(<App today={beforeReady} />)

    await waitFor(() => expect(screen.getByText('Bjørk ved veggen')).toBeInTheDocument())
    expect(screen.queryByText(/kan være klar/i)).not.toBeInTheDocument()
    expect(getStack('a')?.notifiedReadyAt).toBeUndefined()
  })

  // A permission prompt on arrival is the fastest route to a permanent no.
  it('does not offer to notify anyone before a stack has been opened', () => {
    saveStacks([makeStack({ id: 'a', name: 'Bjørk ved veggen' })])
    renderWithMantine(<App />)
    expect(screen.queryByText(/få beskjed når veden er klar/i)).not.toBeInTheDocument()
  })
})

describe('App in English', () => {
  it('keeps the brand name but translates the tagline and the screen under it', () => {
    setTestLanguage(ENGLISH_TEST_LANGUAGE)
    saveStacks([makeStack({ id: 'a', name: 'Bjørk ved veggen' })])
    renderWithMantine(<App />)

    expect(screen.getByRole('heading', { name: "Woodstack '26" })).toBeInTheDocument()
    expect(screen.getByText(/when is the firewood dry enough to burn/i)).toBeInTheDocument()
    expect(screen.getByText('My woodpiles')).toBeInTheDocument()
    expect(screen.queryByText(/vedstablene mine/i)).not.toBeInTheDocument()
  })

  it('tells the browser which language the page ended up in', () => {
    setTestLanguage(ENGLISH_TEST_LANGUAGE)
    renderWithMantine(<App />)
    expect(document.documentElement.lang).toBe('en')
  })
})

/** An Open-Meteo archive answer with two days in every month, so the reducer
 *  has something to average in all twelve — mild and damp enough that a stack
 *  actually dries. */
function archiveAnswer() {
  const time: string[] = []
  const temperature: number[] = []
  const humidity: number[] = []
  for (let month = 1; month <= 12; month++) {
    const mm = String(month).padStart(2, '0')
    time.push(`2025-${mm}-05`, `2025-${mm}-20`)
    temperature.push(5, 7)
    humidity.push(70, 74)
  }
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        daily: { time, temperature_2m_mean: temperature, relative_humidity_2m_mean: humidity },
      }),
  }
}

const EXAMPLE_NAMES = ['Granveden i skjulet', 'Bjørkestabelen ved uthuset', 'Blandingen bak garasjen']

describe('App seeding example stacks', () => {
  it('gives a browser that has never run the app three stacks to look at', async () => {
    renderWithMantine(<App />)

    for (const name of EXAMPLE_NAMES) {
      await waitFor(() => expect(screen.getByText(name)).toBeInTheDocument())
    }
    expect(loadStacks().map((stack) => stack.location.name)).toEqual([
      'Lillehammer',
      'Lillehammer',
      'Lillehammer',
    ])
    expect(screen.getAllByText('Eksempel')).toHaveLength(3)
  })

  /** The one that would break silently: seeding on "the list is empty" rather
   *  than "this browser has never held anything" puts the three examples back
   *  every time the visitor deletes them, and deleting them never sticks. */
  it('does not put them back after the visitor has deleted all three', async () => {
    const first = renderWithMantine(<App />)
    await waitFor(() => expect(screen.getByText(EXAMPLE_NAMES[0])).toBeInTheDocument())

    loadStacks().forEach((stack) => removeStack(stack.id))
    first.unmount()

    renderWithMantine(<App />)
    await waitFor(() => expect(screen.getByText(/ingen vedstabler ennå/i)).toBeInTheDocument())
    expect(loadStacks()).toHaveLength(0)
  })

  it('lets a share link win over the examples on a brand-new browser', async () => {
    window.location.hash = `#i=${exportState([makeStack({ id: 'a', name: 'Importert stabel' })])}`

    renderWithMantine(<App />)

    await waitFor(() => expect(screen.getByText('Importert stabel')).toBeInTheDocument())
    expect(screen.queryByText(EXAMPLE_NAMES[0])).not.toBeInTheDocument()
    expect(loadStacks()).toHaveLength(1)
  })

  /** Nothing else in the app fetches normals for a stack it did not just
   *  create, so without a fetch here the three examples would sit on "Henter
   *  klimadata …" for as long as the visitor cared to look. */
  it('fetches the examples’ climate normals so the list has a window to show', async () => {
    const fetchMock = vi.fn((_url: string) => Promise.resolve(archiveAnswer()))
    vi.stubGlobal('fetch', fetchMock)

    renderWithMantine(<App />)

    await waitFor(() => expect(screen.getAllByText(/klar mellom/i)).toHaveLength(3))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('latitude=61.1153'))
  })

  it('still shows the three when there is no connection to fetch their climate with', async () => {
    renderWithMantine(<App />)

    for (const name of EXAMPLE_NAMES) {
      await waitFor(() => expect(screen.getByText(name)).toBeInTheDocument())
    }
    expect(screen.getAllByText(/henter klimadata/i)).toHaveLength(3)
  })
})
