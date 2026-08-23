import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
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

async function pickBergen() {
  fill(/^sted$/i, 'Bergen')
  fireEvent.click(screen.getByRole('button', { name: /søk/i }))
  await waitFor(() => screen.getByRole('button', { name: /Bergen/ }))
  fireEvent.click(screen.getByRole('button', { name: /Bergen/ }))
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
    expect(screen.getByText(/valgt sted: Oslo/i)).toBeInTheDocument()
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

  // Searching drops the chosen place, so a search left half-finished has no
  // place at all — saving then would wipe the location the stack already has.
  it('will not save with the place search left hanging', async () => {
    const onSave = vi.fn()
    renderWithMantine(
      <EditStackForm stackId="a" onSave={onSave} onCancel={vi.fn()} geocodeFn={geocodeBergen()} />,
    )

    fill(/^sted$/i, 'Bergen')
    fireEvent.click(screen.getByRole('button', { name: /søk/i }))
    await waitFor(() => screen.getByRole('button', { name: /Bergen/ }))
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

    fill(/^sted$/i, 'Xyzzy')
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
