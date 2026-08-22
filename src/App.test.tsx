import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { App } from './App'
import { renderWithMantine } from './test/render'
import { OSLO_NORMALS, makeStack } from './test/fixtures'
import { saveStacks } from './storage/stacksRepo'
import { writeCachedNormals } from './climate/normalsCache'
import { exportState } from './storage/appState'
import { ENGLISH_TEST_LANGUAGE, setTestLanguage } from './test/language'

beforeEach(() => {
  localStorage.clear()
  window.location.hash = ''
  writeCachedNormals(OSLO_NORMALS)
})

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
