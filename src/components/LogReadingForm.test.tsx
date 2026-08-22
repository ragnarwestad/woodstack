import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { LogReadingForm } from './LogReadingForm'
import { renderWithMantine } from '../test/render'

describe('LogReadingForm', () => {
  it('names the moisture basis on the input, so the number is never bare', () => {
    renderWithMantine(<LogReadingForm onLog={vi.fn()} />)
    expect(screen.getByLabelText(/fuktighet/i)).toBeInTheDocument()
    expect(screen.getByText(/tørrvekt/i)).toBeInTheDocument()
  })

  it('hands over the reading with its date', () => {
    const onLog = vi.fn()
    renderWithMantine(<LogReadingForm onLog={onLog} />)

    fireEvent.change(screen.getByLabelText(/fuktighet/i), { target: { value: '28' } })
    fireEvent.change(screen.getByLabelText(/målt/i), { target: { value: '2026-10-15' } })
    fireEvent.click(screen.getByRole('button', { name: /lagre måling/i }))

    expect(onLog).toHaveBeenCalledWith({ date: '2026-10-15', moisture: 28 })
  })

  it('rejects a reading outside a plausible range', () => {
    const onLog = vi.fn()
    renderWithMantine(<LogReadingForm onLog={onLog} />)

    fireEvent.change(screen.getByLabelText(/fuktighet/i), { target: { value: '400' } })
    fireEvent.click(screen.getByRole('button', { name: /lagre måling/i }))

    expect(onLog).not.toHaveBeenCalled()
    expect(screen.getByText(/mellom 5 og 200/i)).toBeInTheDocument()
  })
})
