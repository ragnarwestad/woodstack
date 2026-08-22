import { describe, expect, it } from 'vitest'
import { buildShareLink, exportState, importState, readImportPayload, readStackId, stackHash } from './appState'
import { makeStack } from '../test/fixtures'

const stacks = [
  makeStack({
    id: 'a',
    readings: [
      { id: 'r1', date: '2026-10-15', moisture: 28 },
      { id: 'r2', date: '2026-12-01', moisture: 24 },
    ],
  }),
  makeStack({ id: 'b', name: 'Granstabelen', species: 'gran', cover: 'none' }),
]

describe('export and import', () => {
  it('round-trips exactly', () => {
    expect(importState(exportState(stacks))).toEqual(stacks)
  })

  it('produces a payload that is safe in a URL fragment', () => {
    const payload = exportState(stacks)
    expect(payload).toBe(encodeURIComponent(payload))
  })

  it('throws on a payload that is not ours', () => {
    expect(() => importState('!!!not-a-payload!!!')).toThrow()
  })

  it('throws on a payload from a newer schema version', () => {
    const payload = exportState(stacks)
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    const bumped = btoa(JSON.stringify({ ...decoded, version: 99 }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    expect(() => importState(bumped)).toThrow()
  })
})

describe('buildShareLink', () => {
  it('puts the payload in the fragment, never the query, and namespaces it', () => {
    const link = buildShareLink(stacks, 'https://woodstack.example/app')
    expect(link.startsWith('https://woodstack.example/app#i=')).toBe(true)
    expect(link).not.toContain('?')
  })

  it('replaces any hash the current URL already had', () => {
    const link = buildShareLink(stacks, 'https://woodstack.example/app#s=a')
    expect(link.match(/#/g)).toHaveLength(1)
    expect(link).toContain('#i=')
  })
})

describe('the namespaced hash', () => {
  it('reads an import payload only from #i=', () => {
    expect(readImportPayload('#i=abc')).toBe('abc')
    expect(readImportPayload('#s=abc')).toBeNull()
    expect(readImportPayload('')).toBeNull()
  })

  it('reads a stack id only from #s=', () => {
    expect(readStackId('#s=abc')).toBe('abc')
    expect(readStackId('#i=abc')).toBeNull()
    expect(readStackId('')).toBeNull()
  })

  it('writes a stack id back in the same shape it reads', () => {
    expect(readStackId(stackHash('abc'))).toBe('abc')
  })
})
