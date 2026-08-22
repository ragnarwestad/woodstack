import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ExportImport, useImportOnLoad } from './ExportImport'
import { renderWithMantine } from '../test/render'
import { makeStack } from '../test/fixtures'
import { exportState } from '../storage/appState'
import { ENGLISH_TEST_LANGUAGE, setTestLanguage } from '../test/language'

const stacks = [makeStack({ id: 'a' })]

beforeEach(() => {
  window.location.hash = ''
})

describe('ExportImport', () => {
  it('copies a link that carries the whole state in the fragment', async () => {
    const copyFn = vi.fn().mockResolvedValue(undefined)
    renderWithMantine(<ExportImport stacks={stacks} copyFn={copyFn} />)

    fireEvent.click(screen.getByRole('button', { name: /kopier lenken min/i }))

    expect(copyFn).toHaveBeenCalledTimes(1)
    expect(copyFn.mock.calls[0][0]).toContain('#i=')
  })

  it('explains why the link matters, since Safari throws the data away', () => {
    renderWithMantine(<ExportImport stacks={stacks} copyFn={vi.fn()} />)
    expect(screen.getByText(/7 dager/i)).toBeInTheDocument()
  })
})

function Probe({ onImport }: { onImport: (stacks: ReturnType<typeof makeStack>[]) => void }) {
  useImportOnLoad(onImport)
  return <div>probe</div>
}

describe('useImportOnLoad', () => {
  it('imports an #i= payload and rewrites the hash so a reload does not repeat it', () => {
    window.location.hash = `#i=${exportState(stacks)}`
    const onImport = vi.fn()

    render(<Probe onImport={onImport} />)

    expect(onImport).toHaveBeenCalledTimes(1)
    expect(onImport.mock.calls[0][0]).toEqual(stacks)
    expect(window.location.hash).not.toContain('i=')
  })

  it('leaves a stack-selection hash alone', () => {
    window.location.hash = '#s=a'
    const onImport = vi.fn()

    render(<Probe onImport={onImport} />)

    expect(onImport).not.toHaveBeenCalled()
    expect(window.location.hash).toBe('#s=a')
  })

  it('clears a payload it cannot read, rather than looping on it', () => {
    window.location.hash = '#i=!!!broken!!!'
    const onImport = vi.fn()

    render(<Probe onImport={onImport} />)

    expect(onImport).not.toHaveBeenCalled()
    expect(window.location.hash).not.toContain('i=')
  })
})

describe('ExportImport in English', () => {
  it('explains the storage and labels the copy button in English', () => {
    setTestLanguage(ENGLISH_TEST_LANGUAGE)
    renderWithMantine(<ExportImport stacks={stacks} copyFn={vi.fn()} />)

    expect(screen.getByText(/safari deletes it after 7 days/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /copy my link/i })).toBeInTheDocument()
    expect(screen.queryByText(/nettleseren/i)).not.toBeInTheDocument()
  })
})
