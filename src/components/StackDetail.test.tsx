import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { StackDetail } from './StackDetail'
import { renderWithMantine } from '../test/render'
import { OSLO_NORMALS, makeStack } from '../test/fixtures'
import { getStack, saveStacks } from '../storage/stacksRepo'
import { ENGLISH_TEST_LANGUAGE, setTestLanguage } from '../test/language'

beforeEach(() => {
  localStorage.clear()
  saveStacks([makeStack({ id: 'a', name: 'Bjørk ved veggen' })])
})

describe('StackDetail', () => {
  it('shows the window and the curve once the climate data is there', async () => {
    renderWithMantine(
      <StackDetail stackId="a" onBack={vi.fn()} onEdit={vi.fn()} getNormalsFn={vi.fn().mockResolvedValue(OSLO_NORMALS)} />,
    )
    await waitFor(() => expect(screen.getByText(/klar mellom/i)).toBeInTheDocument())
    expect(screen.getByRole('img', { name: /tørkekurve/i })).toBeInTheDocument()
  })

  it('shows an explicit fetching state before the climate data arrives', () => {
    renderWithMantine(
      <StackDetail stackId="a" onBack={vi.fn()} onEdit={vi.fn()} getNormalsFn={() => new Promise(() => {})} />,
    )
    expect(screen.getByText(/henter klimadata/i)).toBeInTheDocument()
    expect(screen.queryByText(/klar mellom/i)).not.toBeInTheDocument()
  })

  it('retries by itself when the browser comes back online', async () => {
    const getNormalsFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(OSLO_NORMALS)

    renderWithMantine(<StackDetail stackId="a" onBack={vi.fn()} onEdit={vi.fn()} getNormalsFn={getNormalsFn} />)
    await waitFor(() => expect(screen.getByText(/ingen nett/i)).toBeInTheDocument())

    fireEvent(window, new Event('online'))

    await waitFor(() => expect(screen.getByText(/klar mellom/i)).toBeInTheDocument())
    expect(getNormalsFn).toHaveBeenCalledTimes(2)
  })

  it('narrows the window when a reading is logged', async () => {
    renderWithMantine(
      <StackDetail stackId="a" onBack={vi.fn()} onEdit={vi.fn()} getNormalsFn={vi.fn().mockResolvedValue(OSLO_NORMALS)} />,
    )
    await waitFor(() => screen.getByText(/klar mellom/i))
    const before = screen.getByTestId('window-text').textContent

    fireEvent.click(screen.getByRole('tab', { name: /måling/i }))
    const readingPanel = screen.getByLabelText(/fuktighet/i).closest('[role="tabpanel"]') as HTMLElement
    fireEvent.change(screen.getByLabelText(/fuktighet/i), { target: { value: '35' } })
    fireEvent.change(screen.getByLabelText(/målt/i), { target: { value: '2026-10-15' } })
    fireEvent.click(within(readingPanel).getByRole('button', { name: /^lagre$/i }))

    await waitFor(() => expect(screen.getByTestId('window-text').textContent).not.toBe(before))
  })

  it('says the volume is not tracked yet rather than showing a bare zero', async () => {
    renderWithMantine(
      <StackDetail stackId="a" onBack={vi.fn()} onEdit={vi.fn()} getNormalsFn={vi.fn().mockResolvedValue(OSLO_NORMALS)} />,
    )
    await waitFor(() => screen.getByText(/klar mellom/i))
    expect(screen.getByText(/ingen ved lagt inn ennå/i)).toBeInTheDocument()
    expect(screen.queryByText(/igjen nå/i)).not.toBeInTheDocument()
  })

  it('shows what is left in fast kubikkmeter, whatever units the ledger was logged in', async () => {
    saveStacks([
      makeStack({
        id: 'a',
        volumeEntries: [
          { id: 'v1', date: '2026-04-15', kind: 'addition', amount: 2, unit: 'favn' },
          { id: 'v2', date: '2027-01-10', kind: 'withdrawal', amount: 1, unit: 'storsekk' },
        ],
      }),
    ])
    renderWithMantine(
      <StackDetail stackId="a" onBack={vi.fn()} onEdit={vi.fn()} getNormalsFn={vi.fn().mockResolvedValue(OSLO_NORMALS)} />,
    )

    // 2 favn = 3300 solid litres, less one storsekk at 500 = 2800.
    await waitFor(() => expect(screen.getByText(/igjen nå: 2,8 m³ fast/i)).toBeInTheDocument())
  })

  it('shows zero, not a negative number, when more was taken out than was ever logged in', async () => {
    saveStacks([
      makeStack({
        id: 'a',
        volumeEntries: [
          { id: 'v1', date: '2026-04-15', kind: 'addition', amount: 1, unit: 'storsekk' },
          { id: 'v2', date: '2027-01-10', kind: 'withdrawal', amount: 2, unit: 'storsekk' },
        ],
      }),
    ])
    renderWithMantine(
      <StackDetail stackId="a" onBack={vi.fn()} onEdit={vi.fn()} getNormalsFn={vi.fn().mockResolvedValue(OSLO_NORMALS)} />,
    )

    await waitFor(() => expect(screen.getByText(/igjen nå: 0 m³ fast/i)).toBeInTheDocument())
    // The ledger itself is untouched — the clamp is a display decision only.
    expect(getStack('a')?.volumeEntries).toHaveLength(2)
  })

  it('adds a logged entry to the running total', async () => {
    renderWithMantine(
      <StackDetail stackId="a" onBack={vi.fn()} onEdit={vi.fn()} getNormalsFn={vi.fn().mockResolvedValue(OSLO_NORMALS)} />,
    )
    await waitFor(() => screen.getByText(/klar mellom/i))

    const volumePanel = screen.getByLabelText(/enhet/i).closest('[role="tabpanel"]') as HTMLElement
    fireEvent.change(screen.getByLabelText(/mengde/i), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText(/enhet/i), { target: { value: 'favn' } })
    fireEvent.click(within(volumePanel).getByRole('button', { name: /^lagre$/i }))

    await waitFor(() => expect(screen.getByText(/igjen nå: 1,65 m³ fast/i)).toBeInTheDocument())
    expect(getStack('a')?.volumeEntries).toHaveLength(1)
  })

  it('goes back to the list', () => {
    const onBack = vi.fn()
    renderWithMantine(
      <StackDetail stackId="a" onBack={onBack} onEdit={vi.fn()} getNormalsFn={vi.fn().mockResolvedValue(OSLO_NORMALS)} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /tilbake/i }))
    expect(onBack).toHaveBeenCalled()
  })

  it('shows what has been logged against the stack, in one list', async () => {
    saveStacks([
      makeStack({
        id: 'a',
        readings: [{ id: 'r1', date: '2026-10-15', moisture: 28 }],
        volumeEntries: [{ id: 'v1', date: '2026-04-15', kind: 'addition', amount: 2, unit: 'favn' }],
      }),
    ])
    renderWithMantine(
      <StackDetail stackId="a" onBack={vi.fn()} onEdit={vi.fn()} getNormalsFn={vi.fn().mockResolvedValue(OSLO_NORMALS)} />,
    )
    await waitFor(() => screen.getByText(/klar mellom/i))

    expect(screen.getAllByTestId('entry-row')).toHaveLength(2)
  })

  it('deletes the stack and goes back to the list once the visitor confirms', async () => {
    const onBack = vi.fn()
    renderWithMantine(
      <StackDetail stackId="a" onBack={onBack} onEdit={vi.fn()} getNormalsFn={vi.fn().mockResolvedValue(OSLO_NORMALS)} />,
    )
    await waitFor(() => screen.getByText(/klar mellom/i))

    fireEvent.click(screen.getByRole('button', { name: /^slett$/i }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^ok$/i }))

    expect(getStack('a')).toBeUndefined()
    expect(onBack).toHaveBeenCalled()
  })

  it('hands the visitor over to the edit screen', async () => {
    const onEdit = vi.fn()
    renderWithMantine(
      <StackDetail
        stackId="a"
        onBack={vi.fn()}
        onEdit={onEdit}
        getNormalsFn={vi.fn().mockResolvedValue(OSLO_NORMALS)}
      />,
    )
    await waitFor(() => screen.getByText(/klar mellom/i))

    fireEvent.click(screen.getByRole('button', { name: /^endre$/i }))

    expect(onEdit).toHaveBeenCalled()
  })

  it('keeps the stack when the visitor backs out of deleting it', async () => {
    const onBack = vi.fn()
    renderWithMantine(
      <StackDetail stackId="a" onBack={onBack} onEdit={vi.fn()} getNormalsFn={vi.fn().mockResolvedValue(OSLO_NORMALS)} />,
    )
    await waitFor(() => screen.getByText(/klar mellom/i))

    fireEvent.click(screen.getByRole('button', { name: /^slett$/i }))
    fireEvent.click(screen.getAllByRole('button', { name: /^avbryt$/i })[0])

    expect(getStack('a')).toBeDefined()
    expect(onBack).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /^slett$/i })).toBeInTheDocument()
  })

  it('deletes one reading and leaves the rest of the stack alone', async () => {
    saveStacks([
      makeStack({
        id: 'a',
        readings: [
          { id: 'r1', date: '2026-10-15', moisture: 28 },
          { id: 'r2', date: '2026-12-01', moisture: 24 },
        ],
        volumeEntries: [{ id: 'v1', date: '2026-04-15', kind: 'addition', amount: 2, unit: 'favn' }],
      }),
    ])
    renderWithMantine(
      <StackDetail stackId="a" onBack={vi.fn()} onEdit={vi.fn()} getNormalsFn={vi.fn().mockResolvedValue(OSLO_NORMALS)} />,
    )
    await waitFor(() => screen.getByText(/klar mellom/i))

    fireEvent.click(screen.getByRole('tab', { name: /historikk/i }))
    const row = screen.getAllByTestId('entry-row')[1]
    fireEvent.click(within(row).getByRole('button', { name: /^fjern$/i }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^ok$/i }))

    await waitFor(() => expect(screen.getAllByTestId('entry-row')).toHaveLength(2))
    expect(getStack('a')?.readings.map((r) => r.id)).toEqual(['r2'])
    expect(getStack('a')?.volumeEntries).toHaveLength(1)
  })

  it('works the running total out again when a volume entry is deleted', async () => {
    saveStacks([
      makeStack({
        id: 'a',
        volumeEntries: [
          { id: 'v1', date: '2026-04-15', kind: 'addition', amount: 2, unit: 'fastKubikk' },
          { id: 'v2', date: '2026-05-20', kind: 'addition', amount: 1, unit: 'fastKubikk' },
        ],
      }),
    ])
    renderWithMantine(
      <StackDetail stackId="a" onBack={vi.fn()} onEdit={vi.fn()} getNormalsFn={vi.fn().mockResolvedValue(OSLO_NORMALS)} />,
    )
    await waitFor(() => expect(screen.getByText(/igjen nå: 3 m³ fast/i)).toBeInTheDocument())

    fireEvent.click(screen.getByRole('tab', { name: /historikk/i }))
    const row = screen.getAllByTestId('entry-row')[1]
    fireEvent.click(within(row).getByRole('button', { name: /^fjern$/i }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^ok$/i }))

    await waitFor(() => expect(screen.getByText(/igjen nå: 2 m³ fast/i)).toBeInTheDocument())
    expect(getStack('a')?.volumeEntries?.map((entry) => entry.id)).toEqual(['v1'])
  })

  it('says so when the stack is gone', () => {
    localStorage.clear()
    renderWithMantine(
      <StackDetail stackId="nope" onBack={vi.fn()} onEdit={vi.fn()} getNormalsFn={vi.fn().mockResolvedValue(OSLO_NORMALS)} />,
    )
    expect(screen.getByText(/finner ikke/i)).toBeInTheDocument()
  })
})

describe('StackDetail in English', () => {
  it('translates the detail chrome and the species in the heading line', async () => {
    setTestLanguage(ENGLISH_TEST_LANGUAGE)
    renderWithMantine(
      <StackDetail stackId="a" onBack={vi.fn()} onEdit={vi.fn()} getNormalsFn={vi.fn().mockResolvedValue(OSLO_NORMALS)} />,
    )

    await waitFor(() => expect(screen.getByText(/ready between/i)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /^back$/i })).toBeInTheDocument()
    expect(screen.getByText(/^Birch · stacked 2026-04-15 · Oslo$/)).toBeInTheDocument()
    expect(screen.queryByText(/bjørk ·/i)).not.toBeInTheDocument()
  })

  it('says the stack is gone in English', () => {
    setTestLanguage(ENGLISH_TEST_LANGUAGE)
    localStorage.clear()
    renderWithMantine(
      <StackDetail stackId="nope" onBack={vi.fn()} onEdit={vi.fn()} getNormalsFn={vi.fn().mockResolvedValue(OSLO_NORMALS)} />,
    )
    expect(screen.getByText(/cannot find this woodpile/i)).toBeInTheDocument()
  })
})
