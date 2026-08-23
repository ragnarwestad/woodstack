import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { App } from './App'
import { renderWithMantine } from './test/render'
import { OSLO_NORMALS, makeStack } from './test/fixtures'
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
    expect(screen.getByRole('heading', { name: 'Woodstack' })).toBeInTheDocument()
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

    fireEvent.click(screen.getByRole('button', { name: /bjørk ved veggen/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: /^slett stabelen$/i })).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /^slett stabelen$/i }))
    fireEvent.click(screen.getByRole('button', { name: /^ja, slett stabelen$/i }))

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

    fireEvent.click(screen.getByRole('button', { name: /^endre stabelen$/i }))
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
    await waitFor(() => screen.getByRole('button', { name: /^endre stabelen$/i }))

    fireEvent.click(screen.getByRole('button', { name: /^endre stabelen$/i }))
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

describe('App in English', () => {
  it('keeps the brand name but translates the tagline and the screen under it', () => {
    setTestLanguage(ENGLISH_TEST_LANGUAGE)
    saveStacks([makeStack({ id: 'a', name: 'Bjørk ved veggen' })])
    renderWithMantine(<App />)

    expect(screen.getByRole('heading', { name: 'Woodstack' })).toBeInTheDocument()
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
