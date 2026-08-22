import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { VolumeEntryForm } from './VolumeEntryForm'
import { renderWithMantine } from '../test/render'
import { ENGLISH_TEST_LANGUAGE, setTestLanguage } from '../test/language'

describe('VolumeEntryForm', () => {
  it('asks for the four things an entry is made of', () => {
    renderWithMantine(<VolumeEntryForm onLog={vi.fn()} />)
    expect(screen.getByLabelText(/hva gjorde du/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/mengde/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/enhet/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/dato/i)).toBeInTheDocument()
  })

  it('offers every unit the conversion table knows, favn and storsekk included', () => {
    renderWithMantine(<VolumeEntryForm onLog={vi.fn()} />)
    const unit = screen.getByLabelText(/enhet/i)
    expect(unit).toHaveTextContent(/favn/i)
    expect(unit).toHaveTextContent(/storsekk/i)
    expect(unit).toHaveTextContent(/fast kubikk/i)
  })

  it('hands over the addition with its date, amount and unit', () => {
    const onLog = vi.fn()
    renderWithMantine(<VolumeEntryForm onLog={onLog} />)

    fireEvent.change(screen.getByLabelText(/mengde/i), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText(/enhet/i), { target: { value: 'favn' } })
    fireEvent.change(screen.getByLabelText(/dato/i), { target: { value: '2026-10-15' } })
    fireEvent.click(screen.getByRole('button', { name: /lagre mengde/i }))

    expect(onLog).toHaveBeenCalledWith({ date: '2026-10-15', kind: 'addition', amount: 2, unit: 'favn' })
  })

  it('hands over a withdrawal as a withdrawal, not as a negative addition', () => {
    const onLog = vi.fn()
    renderWithMantine(<VolumeEntryForm onLog={onLog} />)

    fireEvent.change(screen.getByLabelText(/hva gjorde du/i), { target: { value: 'withdrawal' } })
    fireEvent.change(screen.getByLabelText(/mengde/i), { target: { value: '3' } })
    fireEvent.change(screen.getByLabelText(/enhet/i), { target: { value: 'sekk60' } })
    fireEvent.change(screen.getByLabelText(/dato/i), { target: { value: '2027-01-10' } })
    fireEvent.click(screen.getByRole('button', { name: /lagre mengde/i }))

    expect(onLog).toHaveBeenCalledWith({ date: '2027-01-10', kind: 'withdrawal', amount: 3, unit: 'sekk60' })
  })

  it('will not save an amount that is missing, zero or not a number', () => {
    const onLog = vi.fn()
    renderWithMantine(<VolumeEntryForm onLog={onLog} />)

    fireEvent.click(screen.getByRole('button', { name: /lagre mengde/i }))
    expect(onLog).not.toHaveBeenCalled()
    expect(screen.getByText(/større enn 0/i)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/mengde/i), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: /lagre mengde/i }))
    expect(onLog).not.toHaveBeenCalled()
  })

  it('clears the amount after saving, so the next entry starts empty', () => {
    renderWithMantine(<VolumeEntryForm onLog={vi.fn()} />)

    fireEvent.change(screen.getByLabelText(/mengde/i), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: /lagre mengde/i }))

    expect(screen.getByLabelText(/mengde/i)).toHaveValue(null)
  })
})

describe('VolumeEntryForm in English', () => {
  it('translates the fields and the unit names', () => {
    setTestLanguage(ENGLISH_TEST_LANGUAGE)
    renderWithMantine(<VolumeEntryForm onLog={vi.fn()} />)

    expect(screen.getByLabelText(/what did you do/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save amount/i })).toBeInTheDocument()
    expect(screen.queryByText(/lagre mengde/i)).not.toBeInTheDocument()
  })
})
