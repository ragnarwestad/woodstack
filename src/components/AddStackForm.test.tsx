import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { AddStackForm } from './AddStackForm'
import { renderWithMantine } from '../test/render'
import { StorageQuotaError } from '../storage/stacksRepo'
import { ENGLISH_TEST_LANGUAGE, setTestLanguage } from '../test/language'

const geocodeFn = vi.fn().mockResolvedValue([
  { name: 'Oslo', latitude: 59.91, longitude: 10.75, country: 'Norge', admin1: 'Oslo County' },
])

function fill(label: RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

/** The place field is an Autocomplete, so its label belongs to both the input
 *  and the listbox beside it — `getByLabelText` finds two. The input is the one
 *  with the combobox role. */
function placeField(name: RegExp = /nærmeste sted/i) {
  return screen.getByRole('combobox', { name })
}

/** The matches sit in a floating dropdown that Mantine positions with a layout
 *  library. `happy-dom` computes no layout, so the dropdown keeps
 *  `display: none` and the accessibility tree treats its options as hidden —
 *  hence `hidden: true`. The wiring is what these tests check; that the
 *  dropdown is actually visible is a browser fact, checked by eye. */
function match(name: RegExp) {
  return screen.getByRole('option', { name, hidden: true })
}

const PHOTO = 'data:image/jpeg;base64,shrunk'

function resizeTo(dataUrl: string) {
  return vi.fn().mockResolvedValue(dataUrl)
}

async function takePhoto(container: HTMLElement) {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement
  fireEvent.change(input, { target: { files: [new File(['bytes'], 'stabel.jpg', { type: 'image/jpeg' })] } })
  await waitFor(() => expect(screen.getByAltText(/bilde av vedstabelen/i)).toBeInTheDocument())
}

/** The matches come back as a dropdown that replaces the input, so picking one
 *  is a select change, not a click on a list item. */
async function pickOslo() {
  fireEvent.change(placeField(), { target: { value: 'Oslo' } })
  fireEvent.click(screen.getByRole('button', { name: /søk/i }))
  await waitFor(() => expect(match(/Oslo/)).toBeInTheDocument())
  fireEvent.click(match(/Oslo/))
}

describe('AddStackForm', () => {
  it('starts with a translated, left-aligned back control that cancels adding', () => {
    const onCancel = vi.fn()
    const { container } = renderWithMantine(
      <AddStackForm onAdd={vi.fn()} onCancel={onCancel} geocodeFn={geocodeFn} />,
    )
    const column = container.querySelector('.mantine-Stack-root') as HTMLElement
    const back = screen.getByRole('button', { name: /tilbake/i })
    const heading = screen.getByText(/ny vedstabel/i)

    expect(back.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(back.parentElement).not.toBe(column)
    fireEvent.click(back)
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('uses the same heading style as the other subpages', () => {
    renderWithMantine(<AddStackForm onAdd={vi.fn()} onCancel={vi.fn()} geocodeFn={geocodeFn} />)

    expect(screen.getByRole('heading', { name: /ny vedstabel|new woodpile/i, level: 2 })).toBeInTheDocument()
  })

  it('asks for every input the drying rate depends on, split size included', () => {
    renderWithMantine(<AddStackForm onAdd={vi.fn()} onCancel={vi.fn()} geocodeFn={geocodeFn} />)
    expect(screen.getByLabelText(/navn/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/treslag/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/stablet dato/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/kløyvd/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/tak/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/sol og vind/i)).toBeInTheDocument()
    expect(placeField()).toBeInTheDocument()
  })

  /** There is no <form> around these fields, so Enter does nothing unless it
   *  is handled. A search box that ignores Enter reads as broken. */
  it('searches when Enter is pressed in the place field', async () => {
    renderWithMantine(<AddStackForm onAdd={vi.fn()} onCancel={vi.fn()} geocodeFn={geocodeFn} />)

    fireEvent.change(placeField(), { target: { value: 'Oslo' } })
    fireEvent.keyDown(placeField(), { key: 'Enter' })

    await waitFor(() => expect(match(/Oslo/)).toBeInTheDocument())
  })

  /** It used to fall back to the species name, so two unnamed birch piles both
   *  became "Bjørk" — indistinguishable in the only list that shows them. */
  it('will not save without a name', async () => {
    const onAdd = vi.fn()
    renderWithMantine(<AddStackForm onAdd={onAdd} onCancel={vi.fn()} geocodeFn={geocodeFn} />)
    await pickOslo()

    fireEvent.click(screen.getByRole('button', { name: /^lagre$/i }))

    expect(onAdd).not.toHaveBeenCalled()
    expect(screen.getByText(/gi stabelen et navn/i)).toBeInTheDocument()
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
    fill(/stablet dato/i, '2026-04-15')
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
  /** A search for "Oslo" really does return several Norwegian Oslos, and with
   *  the region left out they all read "Oslo, Norge". Identical labels are not
   *  merely confusing: the dropdown refuses duplicate options by throwing, and
   *  the whole page went blank. The region comes back only where it is needed
   *  to tell two matches apart. */
  it('tells matches apart that would otherwise read alike', async () => {
    const manyOslos = vi.fn().mockResolvedValue([
      { name: 'Oslo', latitude: 59.91, longitude: 10.75, country: 'Norge', admin1: 'Oslo' },
      { name: 'Oslo', latitude: 59.75, longitude: 10.2, country: 'Norge', admin1: 'Viken' },
      { name: 'Bergen', latitude: 60.39, longitude: 5.32, country: 'Norge', admin1: 'Vestland' },
    ])
    renderWithMantine(<AddStackForm onAdd={vi.fn()} onCancel={vi.fn()} geocodeFn={manyOslos} />)

    fireEvent.change(placeField(), { target: { value: 'Oslo' } })
    fireEvent.click(screen.getByRole('button', { name: /søk/i }))

    await waitFor(() => expect(match(/Oslo, Oslo, Norge/)).toBeInTheDocument())
    expect(match(/Oslo, Viken, Norge/)).toBeInTheDocument()
    // Bergen stands alone, so it keeps the short form.
    expect(match(/^Bergen, Norge$/)).toBeInTheDocument()
    expect(placeField()).toBeInTheDocument()
  })

  /** Open-Meteo returns the same place twice — same name, same region, same
   *  country — and no extra words tell those apart. Showing one of them beats
   *  throwing, which is what the dropdown does on a duplicate. */
  it('survives two matches that are identical in every field', async () => {
    const twins = vi.fn().mockResolvedValue([
      { name: 'Oslo', latitude: 59.91, longitude: 10.75, country: 'Norge', admin1: 'Oslo' },
      { name: 'Oslo', latitude: 59.92, longitude: 10.76, country: 'Norge', admin1: 'Oslo' },
    ])
    renderWithMantine(<AddStackForm onAdd={vi.fn()} onCancel={vi.fn()} geocodeFn={twins} />)

    fireEvent.change(placeField(), { target: { value: 'Oslo' } })
    fireEvent.click(screen.getByRole('button', { name: /søk/i }))

    await waitFor(() => expect(match(/Oslo/)).toBeInTheDocument())
    expect(screen.getAllByRole('option', { name: /Oslo, Norge/, hidden: true })).toHaveLength(1)
    expect(placeField()).toBeInTheDocument()
  })

  it('closes the matches once one has been picked', async () => {
    renderWithMantine(<AddStackForm onAdd={vi.fn()} onCancel={vi.fn()} geocodeFn={geocodeFn} />)
    await pickOslo()

    expect(screen.queryByRole('option', { name: /Oslo/, hidden: true })).not.toBeInTheDocument()
  })

  it('names the place and the country, and leaves the region out', async () => {
    renderWithMantine(<AddStackForm onAdd={vi.fn()} onCancel={vi.fn()} geocodeFn={geocodeFn} />)
    await pickOslo()

    // The chosen place goes back into the field itself, so the row keeps its
    // height instead of gaining a "Valgt sted: …" line under it.
    expect(placeField()).toHaveValue('Oslo, Norge')
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

  /** Favn, stablet and fast are three different amounts of the same wood, and
   *  the picker says nothing about that on its own. */
  it('explains that the volume units are not the same amount', () => {
    renderWithMantine(<AddStackForm onAdd={vi.fn()} onCancel={vi.fn()} geocodeFn={geocodeFn} />)

    fireEvent.click(screen.getByRole('button', { name: /favn, stablet/i }))
    expect(within(screen.getByRole('dialog')).getByText(/luften mellom kubbene/i)).toBeInTheDocument()
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

  it('hands over the photo the visitor took', async () => {
    const onAdd = vi.fn()
    const { container } = renderWithMantine(
      <AddStackForm onAdd={onAdd} onCancel={vi.fn()} geocodeFn={geocodeFn} resizeFn={resizeTo(PHOTO)} />,
    )

    fill(/navn/i, 'Bjørk ved veggen')
    await takePhoto(container)
    await pickOslo()
    fireEvent.click(screen.getByRole('button', { name: /lagre/i }))

    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ photo: PHOTO }))
  })

  // Same rule as the opening amount: a field nobody filled in is left out of
  // the payload entirely rather than sent along as an empty one.
  it('leaves the photo out entirely when none was taken', async () => {
    const onAdd = vi.fn()
    renderWithMantine(<AddStackForm onAdd={onAdd} onCancel={vi.fn()} geocodeFn={geocodeFn} />)

    fill(/navn/i, 'Bjørk ved veggen')
    await pickOslo()
    fireEvent.click(screen.getByRole('button', { name: /lagre/i }))

    expect(onAdd).toHaveBeenCalledTimes(1)
    expect(onAdd.mock.calls[0][0]).not.toHaveProperty('photo')
  })

  /** The share field stays put and greys out instead of appearing and
   *  disappearing: a field that comes and goes moves everything under it and
   *  makes the form a different shape each time it is answered. */
  it('greys out how much of the second wood there is until one has been picked', () => {
    renderWithMantine(<AddStackForm onAdd={vi.fn()} onCancel={vi.fn()} geocodeFn={geocodeFn} />)
    expect(screen.getByLabelText(/blandet/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/hvor mye/i)).toBeDisabled()

    fill(/blandet/i, 'gran')
    expect(screen.getByLabelText(/hvor mye/i)).toBeEnabled()
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
    expect(screen.getByLabelText(/hvor mye/i)).toBeDisabled()

    fill(/navn/i, 'Granstabelen')
    await pickOslo()
    fireEvent.click(screen.getByRole('button', { name: /lagre/i }))
    expect(onAdd.mock.calls[0][0]).not.toHaveProperty('secondSpecies')
  })

  /** The storage refusing the write is the one failure a photo makes likely,
   *  and the visitor has just typed a whole form: it stays on screen, with the
   *  reason, rather than disappearing into a crash. */
  it('says the browser is full instead of throwing, and keeps the typed fields', async () => {
    const onAdd = vi.fn(() => {
      throw new StorageQuotaError()
    })
    const { container } = renderWithMantine(
      <AddStackForm onAdd={onAdd} onCancel={vi.fn()} geocodeFn={geocodeFn} resizeFn={resizeTo(PHOTO)} />,
    )

    fill(/navn/i, 'Bjørk ved veggen')
    await takePhoto(container)
    await pickOslo()
    fireEvent.click(screen.getByRole('button', { name: /lagre/i }))

    expect(screen.getByText(/ikke plass/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/navn/i)).toHaveValue('Bjørk ved veggen')
    expect(screen.getByAltText(/bilde av vedstabelen/i)).toBeInTheDocument()
  })

  it('says so when the place search finds nothing', async () => {
    renderWithMantine(<AddStackForm onAdd={vi.fn()} onCancel={vi.fn()} geocodeFn={vi.fn().mockResolvedValue([])} />)
    fireEvent.change(placeField(), { target: { value: 'Xyzzy' } })
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

  it('names the species in English in the select', async () => {
    setTestLanguage(ENGLISH_TEST_LANGUAGE)
    const onAdd = vi.fn()
    renderWithMantine(<AddStackForm onAdd={onAdd} onCancel={vi.fn()} geocodeFn={geocodeFn} />)

    const species = screen.getByLabelText(/species/i)
    expect(species).toHaveTextContent('Birch')
    expect(species).toHaveTextContent('Spruce')
    expect(species).not.toHaveTextContent('Bjørk')

    fill(/name of the woodpile/i, 'By the barn')
    fireEvent.change(placeField(/nearest place/i), { target: { value: 'Oslo' } })
    fireEvent.click(screen.getByRole('button', { name: /^search$/i }))
    await waitFor(() => expect(match(/Oslo/)).toBeInTheDocument())
    fireEvent.click(match(/Oslo/))
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))

    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ name: 'By the barn', species: 'bjork' }))
  })
})
