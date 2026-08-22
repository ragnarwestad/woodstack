import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { AddStackForm } from './AddStackForm'
import { renderWithMantine } from '../test/render'
import { ENGLISH_TEST_LANGUAGE, setTestLanguage } from '../test/language'

const geocodeFn = vi.fn().mockResolvedValue([
  { name: 'Oslo', latitude: 59.91, longitude: 10.75, country: 'Norge', admin1: 'Oslo' },
])

function fill(label: RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

async function pickOslo() {
  fill(/sted/i, 'Oslo')
  fireEvent.click(screen.getByRole('button', { name: /søk/i }))
  await waitFor(() => screen.getByRole('button', { name: /Oslo/ }))
  fireEvent.click(screen.getByRole('button', { name: /Oslo/ }))
}

describe('AddStackForm', () => {
  it('asks for every input the drying rate depends on, split size included', () => {
    renderWithMantine(<AddStackForm onAdd={vi.fn()} onCancel={vi.fn()} geocodeFn={geocodeFn} />)
    expect(screen.getByLabelText(/navn/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/treslag/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/stablet/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/kløyvd/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/tak/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/sol og vind/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/sted/i)).toBeInTheDocument()
  })

  it('will not save before a place has been picked', () => {
    const onAdd = vi.fn()
    renderWithMantine(<AddStackForm onAdd={onAdd} onCancel={vi.fn()} geocodeFn={geocodeFn} />)
    fill(/navn/i, 'Bjørk ved veggen')
    fireEvent.click(screen.getByRole('button', { name: /lagre/i }))
    expect(onAdd).not.toHaveBeenCalled()
    expect(screen.getByText(/velg et sted/i)).toBeInTheDocument()
  })

  it('hands over every field, including split size', async () => {
    const onAdd = vi.fn()
    renderWithMantine(<AddStackForm onAdd={onAdd} onCancel={vi.fn()} geocodeFn={geocodeFn} />)

    fill(/navn/i, 'Bjørk ved veggen')
    fill(/treslag/i, 'bjork')
    fill(/stablet/i, '2026-04-15')
    fill(/kløyvd/i, 'small')
    fill(/tak/i, 'roof')
    fill(/sol og vind/i, 'exposed')
    await pickOslo()

    fireEvent.click(screen.getByRole('button', { name: /lagre/i }))

    expect(onAdd).toHaveBeenCalledWith({
      name: 'Bjørk ved veggen',
      species: 'bjork',
      stackedDate: '2026-04-15',
      splitSize: 'small',
      cover: 'roof',
      exposure: 'exposed',
      location: { name: 'Oslo', latitude: 59.91, longitude: 10.75 },
    })
  })

  it('hands over an opening amount as the ledger the stack starts with', async () => {
    const onAdd = vi.fn()
    renderWithMantine(<AddStackForm onAdd={onAdd} onCancel={vi.fn()} geocodeFn={geocodeFn} />)

    fill(/navn/i, 'Bjørk ved veggen')
    fill(/hvor mye ved/i, '2')
    fill(/enhet/i, 'favn')
    await pickOslo()
    fireEvent.click(screen.getByRole('button', { name: /lagre/i }))

    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ initialVolume: { amount: 2, unit: 'favn' } }),
    )
  })

  it('leaves the opening amount out entirely when it was not filled in', async () => {
    const onAdd = vi.fn()
    renderWithMantine(<AddStackForm onAdd={onAdd} onCancel={vi.fn()} geocodeFn={geocodeFn} />)

    fill(/navn/i, 'Bjørk ved veggen')
    await pickOslo()
    fireEvent.click(screen.getByRole('button', { name: /lagre/i }))

    expect(onAdd).toHaveBeenCalledTimes(1)
    expect(onAdd.mock.calls[0][0]).not.toHaveProperty('initialVolume')
  })

  it('says so when the place search finds nothing', async () => {
    renderWithMantine(<AddStackForm onAdd={vi.fn()} onCancel={vi.fn()} geocodeFn={vi.fn().mockResolvedValue([])} />)
    fill(/sted/i, 'Xyzzy')
    fireEvent.click(screen.getByRole('button', { name: /søk/i }))
    await waitFor(() => expect(screen.getByText(/fant ingen steder/i)).toBeInTheDocument())
  })
})

describe('AddStackForm in English', () => {
  it('labels every field in English when the browser does not speak Norwegian', () => {
    setTestLanguage(ENGLISH_TEST_LANGUAGE)
    renderWithMantine(<AddStackForm onAdd={vi.fn()} onCancel={vi.fn()} geocodeFn={geocodeFn} />)

    expect(screen.getByText('New woodpile')).toBeInTheDocument()
    expect(screen.getByLabelText(/name of the woodpile/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/species/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/how coarsely is it split/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^save$/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/how much wood/i)).toBeInTheDocument()
    expect(screen.queryByText(/treslag/i)).not.toBeInTheDocument()
  })

  it('names the species in English in the select and in the default stack name', async () => {
    setTestLanguage(ENGLISH_TEST_LANGUAGE)
    const onAdd = vi.fn()
    renderWithMantine(<AddStackForm onAdd={onAdd} onCancel={vi.fn()} geocodeFn={geocodeFn} />)

    const species = screen.getByLabelText(/species/i)
    expect(species).toHaveTextContent('Birch')
    expect(species).toHaveTextContent('Spruce')
    expect(species).not.toHaveTextContent('Bjørk')

    fill(/location/i, 'Oslo')
    fireEvent.click(screen.getByRole('button', { name: /^search$/i }))
    await waitFor(() => screen.getByRole('button', { name: /Oslo/ }))
    fireEvent.click(screen.getByRole('button', { name: /Oslo/ }))
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))

    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ name: 'Birch', species: 'bjork' }))
  })
})
