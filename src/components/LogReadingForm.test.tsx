import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, within } from '@testing-library/react'
import { LogReadingForm } from './LogReadingForm'
import { renderWithMantine } from '../test/render'
import { ENGLISH_TEST_LANGUAGE, setTestLanguage } from '../test/language'

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
    fireEvent.click(screen.getByRole('button', { name: /^lagre$/i }))

    expect(onLog).toHaveBeenCalledWith({ date: '2026-10-15', moisture: 28 })
  })

  /** The label names the basis but never says why it matters: a pin meter
   *  usually reads the other one, and the two differ by thirty points. */
  it('explains what the dry basis is measured against', () => {
    renderWithMantine(<LogReadingForm onLog={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /tørrvekt/i }))
    expect(within(screen.getByRole('dialog')).getByText(/våtvekt/i)).toBeInTheDocument()
  })

  it('rejects a reading outside a plausible range', () => {
    const onLog = vi.fn()
    renderWithMantine(<LogReadingForm onLog={onLog} />)

    fireEvent.change(screen.getByLabelText(/fuktighet/i), { target: { value: '400' } })
    fireEvent.click(screen.getByRole('button', { name: /^lagre$/i }))

    expect(onLog).not.toHaveBeenCalled()
    expect(screen.getByText(/mellom 5 og 200/i)).toBeInTheDocument()
  })
})

describe('LogReadingForm in English', () => {
  it('translates the fields and names the basis in English', () => {
    setTestLanguage(ENGLISH_TEST_LANGUAGE)
    renderWithMantine(<LogReadingForm onLog={vi.fn()} />)

    expect(screen.getByLabelText(/moisture/i)).toBeInTheDocument()
    expect(screen.getByText(/dry basis/i)).toBeInTheDocument()
    expect(screen.queryByText(/tørrvekt/i)).not.toBeInTheDocument()
  })

  it('explains the basis in English too', () => {
    setTestLanguage(ENGLISH_TEST_LANGUAGE)
    renderWithMantine(<LogReadingForm onLog={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /dry basis/i }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/wet-basis/i)).toBeInTheDocument()
    expect(within(dialog).queryByText(/våtvekt/i)).not.toBeInTheDocument()
  })

  it('keeps both bounds inside the translated range error', () => {
    setTestLanguage(ENGLISH_TEST_LANGUAGE)
    renderWithMantine(<LogReadingForm onLog={vi.fn()} />)

    fireEvent.change(screen.getByLabelText(/moisture/i), { target: { value: '400' } })
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))

    const error = screen.getByText(/between/i)
    expect(error).toHaveTextContent('5')
    expect(error).toHaveTextContent('200')
    expect(error).not.toHaveTextContent('{')
  })
})
