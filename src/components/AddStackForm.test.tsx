import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { AddStackForm } from './AddStackForm'
import { renderWithMantine } from '../test/render'
import { ENGLISH_TEST_LANGUAGE, setTestLanguage } from '../test/language'

const geocodeFn = vi.fn().mockResolvedValue([
  { name: 'Oslo', latitude: 59.91, longitude: 10.75, country: 'Norge', admin1: 'Oslo County' },
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

  /** Open-Meteo has no Norwegian name for every admin region and falls back to
   *  English per field, so showing it gave "Oslo, Oslo County, Norge" — half
   *  one language, half the other. Name and country only. */
  it('names the place and the country, and leaves the region out', async () => {
    renderWithMantine(<AddStackForm onAdd={vi.fn()} onCancel={vi.fn()} geocodeFn={geocodeFn} />)
    await pickOslo()

    expect(screen.getByText(/Valgt sted: Oslo, Norge$/)).toBeInTheDocument()
    expect(screen.queryByText(/Oslo County/)).not.toBeInTheDocument()
  })

  it('hands over an opening amount as the ledger the stack starts with', async () => {
    const onAdd = vi.fn()
    renderWithMantine(<AddStackForm onAdd={onAdd} onCancel={vi.fn()} geocodeFn={geocodeFn} />)

    fill(/navn/i, 'Bjørk ved veggen')
    fill(/mengde \(favner\)/i, '2')
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

  it('leaves the second wood out entirely when the pile is all one species', async () => {
    const onAdd = vi.fn()
    renderWithMantine(<AddStackForm onAdd={onAdd} onCancel={vi.fn()} geocodeFn={geocodeFn} />)

    fill(/navn/i, 'Bjørk ved veggen')
    await pickOslo()
    fireEvent.click(screen.getByRole('button', { name: /lagre/i }))

    expect(onAdd.mock.calls[0][0]).not.toHaveProperty('secondSpecies')
  })

  it('asks how much of the second wood there is only once one has been picked', () => {
    renderWithMantine(<AddStackForm onAdd={vi.fn()} onCancel={vi.fn()} geocodeFn={geocodeFn} />)
    expect(screen.getByLabelText(/blandet/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/hvor mye/i)).not.toBeInTheDocument()

    fill(/blandet/i, 'gran')
    expect(screen.getByLabelText(/hvor mye/i)).toBeInTheDocument()
  })

  it('hands over the second wood and roughly how much of it there is', async () => {
    const onAdd = vi.fn()
    renderWithMantine(<AddStackForm onAdd={onAdd} onCancel={vi.fn()} geocodeFn={geocodeFn} />)

    fill(/navn/i, 'Blandingsstabelen')
    fill(/treslag/i, 'bjork')
    fill(/blandet/i, 'gran')
    fill(/hvor mye/i, 'half')
    await pickOslo()
    fireEvent.click(screen.getByRole('button', { name: /lagre/i }))

    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ species: 'bjork', secondSpecies: { species: 'gran', share: 'half' } }),
    )
  })

  it('will not offer the same wood twice', () => {
    renderWithMantine(<AddStackForm onAdd={vi.fn()} onCancel={vi.fn()} geocodeFn={geocodeFn} />)
    fill(/treslag/i, 'gran')

    const second = screen.getByLabelText(/blandet/i) as HTMLSelectElement
    const values = Array.from(second.options).map((option) => option.value)
    expect(values).not.toContain('gran')
    expect(values).toContain('bjork')
  })

  /** Picking spruce as the second wood and then making spruce the first one
   *  would otherwise leave "spruce mixed with spruce" standing. */
  it('drops the second wood when the first one becomes the same wood', async () => {
    const onAdd = vi.fn()
    renderWithMantine(<AddStackForm onAdd={onAdd} onCancel={vi.fn()} geocodeFn={geocodeFn} />)

    fill(/blandet/i, 'gran')
    fill(/treslag/i, 'gran')
    expect(screen.queryByLabelText(/hvor mye/i)).not.toBeInTheDocument()

    fill(/navn/i, 'Granstabelen')
    await pickOslo()
    fireEvent.click(screen.getByRole('button', { name: /lagre/i }))
    expect(onAdd.mock.calls[0][0]).not.toHaveProperty('secondSpecies')
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
    expect(screen.getByLabelText(/amount \(favn\)/i)).toBeInTheDocument()
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
