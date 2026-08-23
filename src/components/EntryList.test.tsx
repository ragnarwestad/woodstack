import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, within } from '@testing-library/react'
import { EntryList } from './EntryList'
import { renderWithMantine } from '../test/render'
import { ENGLISH_TEST_LANGUAGE, setTestLanguage } from '../test/language'

const READINGS = [
  { id: 'r1', date: '2026-10-15', moisture: 28 },
  { id: 'r2', date: '2027-01-20', moisture: 19 },
]

const VOLUME_ENTRIES = [
  { id: 'v1', date: '2026-04-15', kind: 'addition' as const, amount: 2, unit: 'favn' as const },
]

function renderList(overrides: Partial<Parameters<typeof EntryList>[0]> = {}) {
  const props = {
    readings: READINGS,
    volumeEntries: VOLUME_ENTRIES,
    onDeleteReading: vi.fn(),
    onDeleteVolumeEntry: vi.fn(),
    ...overrides,
  }
  renderWithMantine(<EntryList {...props} />)
  return props
}

describe('EntryList', () => {
  it('says so when nothing has been logged, rather than showing an empty block', () => {
    renderList({ readings: [], volumeEntries: [] })
    expect(screen.getByText(/ingenting lagt inn ennå/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /slett/i })).not.toBeInTheDocument()
  })

  it('shows readings and volume movements in one list, oldest first', () => {
    renderList()
    const rows = screen.getAllByTestId('entry-row')

    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveTextContent('2026-04-15')
    expect(rows[0]).toHaveTextContent(/la inn ved: 2 favn/i)
    expect(rows[1]).toHaveTextContent('2026-10-15')
    expect(rows[1]).toHaveTextContent(/28 % \(tørrvekt\)/i)
    expect(rows[2]).toHaveTextContent('2027-01-20')
  })

  it('deletes the reading whose row was confirmed, not another one', () => {
    const { onDeleteReading, onDeleteVolumeEntry } = renderList()
    const row = screen.getAllByTestId('entry-row')[1]

    fireEvent.click(within(row).getByRole('button', { name: /^slett$/i }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^ok$/i }))

    expect(onDeleteReading).toHaveBeenCalledWith('r1')
    expect(onDeleteVolumeEntry).not.toHaveBeenCalled()
  })

  it('deletes a volume movement through its own callback', () => {
    const { onDeleteReading, onDeleteVolumeEntry } = renderList()
    const row = screen.getAllByTestId('entry-row')[0]

    fireEvent.click(within(row).getByRole('button', { name: /^slett$/i }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^ok$/i }))

    expect(onDeleteVolumeEntry).toHaveBeenCalledWith('v1')
    expect(onDeleteReading).not.toHaveBeenCalled()
  })

  it('deletes nothing when the visitor backs out of a row', () => {
    const { onDeleteReading } = renderList()
    const row = screen.getAllByTestId('entry-row')[1]

    fireEvent.click(within(row).getByRole('button', { name: /^slett$/i }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^avbryt$/i }))

    expect(onDeleteReading).not.toHaveBeenCalled()
    expect(within(row).getByRole('button', { name: /^slett$/i })).toBeInTheDocument()
  })
})

describe('EntryList in English', () => {
  it('translates the heading, the rows and the delete action', () => {
    setTestLanguage(ENGLISH_TEST_LANGUAGE)
    renderList()

    expect(screen.getAllByTestId('entry-row')[0]).toHaveTextContent(/added wood: 2 favn/i)
    expect(screen.getAllByRole('button', { name: /^delete$/i })).toHaveLength(3)
  })
})
