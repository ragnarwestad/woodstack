import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { EditStackForm } from './EditStackForm'
import { renderWithMantine } from '../test/render'
import { OSLO_NORMALS, makeStack } from '../test/fixtures'
import { getStack, saveStacks } from '../storage/stacksRepo'
import { ENGLISH_TEST_LANGUAGE, setTestLanguage } from '../test/language'

const BERGEN = { name: 'Bergen', latitude: 60.39, longitude: 5.32, country: 'Norge', admin1: 'Vestland' }

function geocodeBergen() {
  return vi.fn().mockResolvedValue([BERGEN])
}

function fill(label: RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

/** The place field is an Autocomplete: its label belongs to both the input and
 *  the listbox, so the input is the one with the combobox role. */
function placeField(name: RegExp = /nærmeste sted/i) {
  return screen.getByRole('combobox', { name })
}

/** The matches sit in a floating dropdown Mantine positions with a layout
 *  library. `happy-dom` computes no layout, so they count as hidden. */
function match(name: RegExp) {
  return screen.getByRole('option', { name, hidden: true })
}

async function pickBergen() {
  fireEvent.change(placeField(), { target: { value: 'Bergen' } })
  fireEvent.click(screen.getByRole('button', { name: /søk/i }))
  await waitFor(() => expect(match(/Bergen/)).toBeInTheDocument())
  fireEvent.click(match(/Bergen/))
}

beforeEach(() => {
  localStorage.clear()
  saveStacks([makeStack({ id: 'a', name: 'Bjørk ved veggen' })])
})

describe('EditStackForm', () => {
  it('opens on the values the stack has now', () => {
    renderWithMantine(
      <EditStackForm stackId="a" onSave={vi.fn()} onCancel={vi.fn()} geocodeFn={geocodeBergen()} />,
    )

    expect(screen.getByLabelText(/navn/i)).toHaveValue('Bjørk ved veggen')
    expect(screen.getByLabelText(/kløyvd/i)).toHaveValue('medium')
    expect(screen.getByLabelText(/tak/i)).toHaveValue('roof')
    expect(screen.getByLabelText(/sol og vind/i)).toHaveValue('normal')
    // The place the stack already has is what the field opens on.
    expect(placeField()).toHaveValue('Oslo')
  })

  // The two fields every reading was interpreted against are fixed at
  // creation: there is no control for them here at all.
  it('offers no control for species or stacked date', () => {
    renderWithMantine(
      <EditStackForm stackId="a" onSave={vi.fn()} onCancel={vi.fn()} geocodeFn={geocodeBergen()} />,
    )

    expect(screen.queryByLabelText(/treslag/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/stablet dato/i)).not.toBeInTheDocument()
  })

  it('writes the changed fields through to storage', async () => {
    const onSave = vi.fn()
    renderWithMantine(
      <EditStackForm stackId="a" onSave={onSave} onCancel={vi.fn()} geocodeFn={geocodeBergen()} />,
    )

    fill(/navn/i, 'Bjørk bak låven')
    fill(/tak/i, 'none')
    fireEvent.click(screen.getByRole('button', { name: /^lagre$/i }))

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(getStack('a')?.name).toBe('Bjørk bak låven')
    expect(getStack('a')?.cover).toBe('none')
  })

  // An edit that leaves the place alone must not go near the network: the
  // climate data for a location that has not moved is already right.
  it('asks for no climate data when the location is untouched', async () => {
    const getNormalsFn = vi.fn().mockResolvedValue(OSLO_NORMALS)
    const onSave = vi.fn()
    renderWithMantine(
      <EditStackForm
        stackId="a"
        onSave={onSave}
        onCancel={vi.fn()}
        geocodeFn={geocodeBergen()}
        getNormalsFn={getNormalsFn}
      />,
    )

    fill(/navn/i, 'Bjørk bak låven')
    fireEvent.click(screen.getByRole('button', { name: /^lagre$/i }))

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(getNormalsFn).not.toHaveBeenCalled()
  })

  it('saves a new location once its climate data has been fetched', async () => {
    const getNormalsFn = vi.fn().mockResolvedValue(OSLO_NORMALS)
    const onSave = vi.fn()
    renderWithMantine(
      <EditStackForm
        stackId="a"
        onSave={onSave}
        onCancel={vi.fn()}
        geocodeFn={geocodeBergen()}
        getNormalsFn={getNormalsFn}
      />,
    )

    await pickBergen()
    fireEvent.click(screen.getByRole('button', { name: /^lagre$/i }))

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(getNormalsFn).toHaveBeenCalledWith(60.39, 5.32)
    expect(getStack('a')?.location).toEqual({ name: 'Bergen', latitude: 60.39, longitude: 5.32 })
  })

  /** The whole save is abandoned, not just the location: a stack whose
   *  weather data belongs to somewhere else would give a window that looks
   *  right and is not. */
  it('keeps the old location and says so when the climate data cannot be fetched', async () => {
    const onSave = vi.fn()
    renderWithMantine(
      <EditStackForm
        stackId="a"
        onSave={onSave}
        onCancel={vi.fn()}
        geocodeFn={geocodeBergen()}
        getNormalsFn={vi.fn().mockRejectedValue(new Error('offline'))}
      />,
    )

    fill(/navn/i, 'Bjørk bak låven')
    await pickBergen()
    fireEvent.click(screen.getByRole('button', { name: /^lagre$/i }))

    await waitFor(() => expect(screen.getByText(/klimadata/i)).toBeInTheDocument())
    expect(onSave).not.toHaveBeenCalled()
    expect(getStack('a')?.location).toEqual({ name: 'Oslo', latitude: 59.9, longitude: 10.8 })
    expect(getStack('a')?.name).toBe('Bjørk ved veggen')
  })

  it('opens on the photo the stack already has, and writes a new one through', async () => {
    saveStacks([makeStack({ id: 'a', name: 'Bjørk ved veggen', photo: 'data:image/jpeg;base64,old' })])
    const onSave = vi.fn()
    const { container } = renderWithMantine(
      <EditStackForm
        stackId="a"
        onSave={onSave}
        onCancel={vi.fn()}
        geocodeFn={geocodeBergen()}
        resizeFn={vi.fn().mockResolvedValue('data:image/jpeg;base64,new')}
      />,
    )

    expect(screen.getByAltText(/bilde av vedstabelen/i)).toHaveAttribute('src', 'data:image/jpeg;base64,old')

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File(['bytes'], 'stabel.jpg', { type: 'image/jpeg' })] } })
    await waitFor(() =>
      expect(screen.getByAltText(/bilde av vedstabelen/i)).toHaveAttribute('src', 'data:image/jpeg;base64,new'),
    )

    fireEvent.click(screen.getByRole('button', { name: /^lagre$/i }))

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(getStack('a')?.photo).toBe('data:image/jpeg;base64,new')
  })

  // One photo, replaceable — and removable. Saving after the remove has to
  // take the photo off the stored stack, not leave the old one standing.
  it('takes the photo off the stack when the visitor removes it', async () => {
    saveStacks([makeStack({ id: 'a', name: 'Bjørk ved veggen', photo: 'data:image/jpeg;base64,old' })])
    const onSave = vi.fn()
    renderWithMantine(
      <EditStackForm stackId="a" onSave={onSave} onCancel={vi.fn()} geocodeFn={geocodeBergen()} />,
    )

    fireEvent.click(screen.getByRole('button', { name: /fjern bildet/i }))
    // Removing a photo is asked for now, like every other delete in the app.
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^ok$/i }))
    fireEvent.click(screen.getByRole('button', { name: /^lagre$/i }))

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(getStack('a')?.photo).toBeUndefined()
  })

  /** The write is refused whole, so the stack on disk is untouched — the
   *  screen has to say that rather than close as if the edit had landed. */
  it('says the browser is full instead of throwing, and stays on the edit screen', async () => {
    saveStacks([makeStack({ id: 'a', name: 'Bjørk ved veggen' })])
    const onSave = vi.fn()
    renderWithMantine(
      <EditStackForm stackId="a" onSave={onSave} onCancel={vi.fn()} geocodeFn={geocodeBergen()} />,
    )

    fill(/navn/i, 'Bjørk bak låven')
    // The browser's own refusal, so the repository's quota detection is part
    // of what this test exercises rather than something it steps around.
    const refused = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    fireEvent.click(screen.getByRole('button', { name: /^lagre$/i }))

    await waitFor(() => expect(screen.getByText(/ikke plass/i)).toBeInTheDocument())
    refused.mockRestore()
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByLabelText(/navn/i)).toHaveValue('Bjørk bak låven')
    expect(getStack('a')?.name).toBe('Bjørk ved veggen')
  })

  it('throws the draft away when the visitor cancels', () => {
    const onCancel = vi.fn()
    renderWithMantine(
      <EditStackForm stackId="a" onSave={vi.fn()} onCancel={onCancel} geocodeFn={geocodeBergen()} />,
    )

    fill(/navn/i, 'Bjørk bak låven')
    fill(/tak/i, 'none')
    fireEvent.click(screen.getByRole('button', { name: /^avbryt$/i }))

    expect(onCancel).toHaveBeenCalled()
    expect(getStack('a')?.name).toBe('Bjørk ved veggen')
    expect(getStack('a')?.cover).toBe('roof')
  })

  /** The reported bug: this was the one subpage with no way back at all —
   *  every other one a visitor can land on has a "← Tilbake" link. */
  it('has a way back, the same as every other subpage', () => {
    const onCancel = vi.fn()
    renderWithMantine(
      <EditStackForm stackId="a" onSave={vi.fn()} onCancel={onCancel} geocodeFn={geocodeBergen()} />,
    )

    fireEvent.click(screen.getByRole('button', { name: /tilbake/i }))
    expect(onCancel).toHaveBeenCalled()
  })

  // Searching drops the chosen place, so a search left half-finished has no
  // place at all — saving then would wipe the location the stack already has.
  it('will not save with the place search left hanging', async () => {
    const onSave = vi.fn()
    renderWithMantine(
      <EditStackForm stackId="a" onSave={onSave} onCancel={vi.fn()} geocodeFn={geocodeBergen()} />,
    )

    fireEvent.change(placeField(), { target: { value: 'Bergen' } })
    fireEvent.click(screen.getByRole('button', { name: /søk/i }))
    // Searched but never picked: the field says Bergen while the stack still
    // stands in Oslo, and saving on that would move it somewhere nobody chose.
    await waitFor(() => expect(match(/Bergen/)).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /^lagre$/i }))

    await waitFor(() => expect(screen.getByText(/velg et sted/i)).toBeInTheDocument())
    expect(onSave).not.toHaveBeenCalled()
    expect(getStack('a')?.location.name).toBe('Oslo')
  })

  it('says nothing was found when the place search comes back empty', async () => {
    renderWithMantine(
      <EditStackForm
        stackId="a"
        onSave={vi.fn()}
        onCancel={vi.fn()}
        geocodeFn={vi.fn().mockResolvedValue([])}
      />,
    )

    fireEvent.change(placeField(), { target: { value: 'Xyzzy' } })
    fireEvent.click(screen.getByRole('button', { name: /søk/i }))
    await waitFor(() => expect(screen.getByText(/fant ingen steder/i)).toBeInTheDocument())
  })

  it('offers a way back rather than crashing on a stack that is gone', () => {
    renderWithMantine(<EditStackForm stackId="gone" onSave={vi.fn()} onCancel={vi.fn()} />)

    expect(screen.getByText(/finner ikke denne stabelen/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /tilbake/i })).toBeInTheDocument()
  })
})

describe('EditStackForm in English', () => {
  it('labels every field in English when the browser does not speak Norwegian', () => {
    setTestLanguage(ENGLISH_TEST_LANGUAGE)
    renderWithMantine(
      <EditStackForm stackId="a" onSave={vi.fn()} onCancel={vi.fn()} geocodeFn={geocodeBergen()} />,
    )

    expect(screen.getByLabelText(/name of the woodpile/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/how coarsely is it split/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^save$/i })).toBeInTheDocument()
    expect(screen.queryByText(/kløyvd/i)).not.toBeInTheDocument()
  })
})
