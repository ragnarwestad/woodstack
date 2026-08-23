import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { App } from './App'
import { renderWithMantine } from './test/render'
import { OSLO_NORMALS, makeStack } from './test/fixtures'
import { estimateWindow } from './model/simulate'
import { getStack, saveStacks } from './storage/stacksRepo'
import { writeCachedNormals } from './climate/normalsCache'
import { exportState } from './storage/appState'
import { ENGLISH_TEST_LANGUAGE, setTestLanguage } from './test/language'

beforeEach(() => {
  localStorage.clear()
  window.location.hash = ''
  writeCachedNormals(OSLO_NORMALS)
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
