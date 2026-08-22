import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { StackDetail } from './StackDetail'
import { renderWithMantine } from '../test/render'
import { OSLO_NORMALS, makeStack } from '../test/fixtures'
import { saveStacks } from '../storage/stacksRepo'

beforeEach(() => {
  localStorage.clear()
  saveStacks([makeStack({ id: 'a', name: 'Bjørk ved veggen' })])
})

describe('StackDetail', () => {
  it('shows the window and the curve once the climate data is there', async () => {
    renderWithMantine(
      <StackDetail stackId="a" onBack={vi.fn()} getNormalsFn={vi.fn().mockResolvedValue(OSLO_NORMALS)} />,
    )
    await waitFor(() => expect(screen.getByText(/klar mellom/i)).toBeInTheDocument())
    expect(screen.getByRole('img', { name: /tørkekurve/i })).toBeInTheDocument()
  })

  it('shows an explicit fetching state before the climate data arrives', () => {
    renderWithMantine(
      <StackDetail stackId="a" onBack={vi.fn()} getNormalsFn={() => new Promise(() => {})} />,
    )
    expect(screen.getByText(/henter klimadata/i)).toBeInTheDocument()
    expect(screen.queryByText(/klar mellom/i)).not.toBeInTheDocument()
  })

  it('retries by itself when the browser comes back online', async () => {
    const getNormalsFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(OSLO_NORMALS)

    renderWithMantine(<StackDetail stackId="a" onBack={vi.fn()} getNormalsFn={getNormalsFn} />)
    await waitFor(() => expect(screen.getByText(/ingen nett/i)).toBeInTheDocument())

    fireEvent(window, new Event('online'))

    await waitFor(() => expect(screen.getByText(/klar mellom/i)).toBeInTheDocument())
    expect(getNormalsFn).toHaveBeenCalledTimes(2)
  })

  it('narrows the window when a reading is logged', async () => {
    renderWithMantine(
      <StackDetail stackId="a" onBack={vi.fn()} getNormalsFn={vi.fn().mockResolvedValue(OSLO_NORMALS)} />,
    )
    await waitFor(() => screen.getByText(/klar mellom/i))
    const before = screen.getByTestId('window-text').textContent

    fireEvent.change(screen.getByLabelText(/fuktighet/i), { target: { value: '35' } })
    fireEvent.change(screen.getByLabelText(/målt/i), { target: { value: '2026-10-15' } })
    fireEvent.click(screen.getByRole('button', { name: /lagre måling/i }))

    await waitFor(() => expect(screen.getByTestId('window-text').textContent).not.toBe(before))
  })

  it('goes back to the list', () => {
    const onBack = vi.fn()
    renderWithMantine(
      <StackDetail stackId="a" onBack={onBack} getNormalsFn={vi.fn().mockResolvedValue(OSLO_NORMALS)} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /tilbake/i }))
    expect(onBack).toHaveBeenCalled()
  })

  it('says so when the stack is gone', () => {
    localStorage.clear()
    renderWithMantine(
      <StackDetail stackId="nope" onBack={vi.fn()} getNormalsFn={vi.fn().mockResolvedValue(OSLO_NORMALS)} />,
    )
    expect(screen.getByText(/finner ikke/i)).toBeInTheDocument()
  })
})
