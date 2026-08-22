import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { AddStackForm } from './AddStackForm'
import { renderWithMantine } from '../test/render'

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

  it('says so when the place search finds nothing', async () => {
    renderWithMantine(<AddStackForm onAdd={vi.fn()} onCancel={vi.fn()} geocodeFn={vi.fn().mockResolvedValue([])} />)
    fill(/sted/i, 'Xyzzy')
    fireEvent.click(screen.getByRole('button', { name: /søk/i }))
    await waitFor(() => expect(screen.getByText(/fant ingen steder/i)).toBeInTheDocument())
  })
})
