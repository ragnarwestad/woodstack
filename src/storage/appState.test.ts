import { describe, expect, it } from 'vitest'
import {
  buildShareLink,
  compareHash,
  exportState,
  importState,
  isCompareHash,
  readImportPayload,
  readStackId,
  stackHash,
} from './appState'
import { makeStack } from '../test/fixtures'

const stacks = [
  makeStack({
    id: 'a',
    readings: [
      { id: 'r1', date: '2026-10-15', moisture: 28 },
      { id: 'r2', date: '2026-12-01', moisture: 24 },
    ],
  }),
  makeStack({
    id: 'b',
    name: 'Granstabelen',
    species: 'gran',
    cover: 'none',
    volumeEntries: [
      { id: 'v1', date: '2026-04-15', kind: 'addition', amount: 2, unit: 'favn' },
      { id: 'v2', date: '2027-01-10', kind: 'withdrawal', amount: 3, unit: 'sekk60' },
    ],
  }),
]

describe('export and import', () => {
  it('round-trips exactly', () => {
    expect(importState(exportState(stacks))).toEqual(stacks)
  })

  it('carries the volume ledger through the link unchanged', () => {
    const imported = importState(exportState(stacks))
    expect(imported[1].volumeEntries).toEqual(stacks[1].volumeEntries)
    // The stack written before the ledger existed keeps its shape too: no
    // `volumeEntries` invented for it on the way through.
    expect(imported[0].volumeEntries).toBeUndefined()
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

  it('recognises the comparison screen only from its own bare marker', () => {
    expect(isCompareHash('#compare')).toBe(true)
    expect(isCompareHash('#s=abc')).toBe(false)
    expect(isCompareHash('#i=abc')).toBe(false)
    expect(isCompareHash('#comparez')).toBe(false)
    expect(isCompareHash('')).toBe(false)
  })

  it('writes the comparison marker back in the same shape it reads', () => {
    expect(isCompareHash(compareHash())).toBe(true)
  })

  /** The three namespaces have to stay mutually exclusive: a bookmark to the
   *  comparison screen must never be read as a stack id or a share payload,
   *  or the visitor lands somewhere they did not ask for. */
  it('is not read as a stack id or an import payload', () => {
    expect(readStackId(compareHash())).toBeNull()
    expect(readImportPayload(compareHash())).toBeNull()
  })
})
