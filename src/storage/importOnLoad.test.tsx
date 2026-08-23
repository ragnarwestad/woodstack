import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { useImportOnLoad } from './importOnLoad'
import { makeStack } from '../test/fixtures'
import { exportState } from './appState'

const stacks = [makeStack({ id: 'a' })]

beforeEach(() => {
  window.location.hash = ''
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
