import { beforeEach, describe, expect, it } from 'vitest'
import {
  addReading,
  addStack,
  addVolumeEntry,
  getStack,
  loadStacks,
  removeReading,
  removeStack,
  removeVolumeEntry,
  replaceStacks,
  saveStacks,
} from './stacksRepo'
import { makeStack } from '../test/fixtures'
import { SCHEMA_VERSION } from './schema'
import { currentSolidLiters } from '../model/volume'

beforeEach(() => {
  localStorage.clear()
})

describe('loadStacks', () => {
  it('is an empty list on a fresh browser', () => {
    expect(loadStacks()).toEqual([])
  })

  it('ignores stored junk rather than throwing at startup', () => {
    localStorage.setItem('woodstack.state.v1', 'not json')
    expect(loadStacks()).toEqual([])
  })

  it('ignores a payload written by a newer schema version', () => {
    localStorage.setItem('woodstack.state.v1', JSON.stringify({ version: 99, stacks: [makeStack()] }))
    expect(loadStacks()).toEqual([])
  })

  it('reads a stack stored before the volume ledger existed, rather than dropping it', () => {
    // The shape actually in visitors' browsers today: the current version, and
    // stack objects with no `volumeEntries` key at all. An optional field has
    // to load these untouched — a SCHEMA_VERSION bump would have emptied the
    // list instead.
    const oldShaped = makeStack({ id: 'a' })
    expect('volumeEntries' in oldShaped).toBe(false)
    localStorage.setItem('woodstack.state.v1', JSON.stringify({ version: SCHEMA_VERSION, stacks: [oldShaped] }))

    const loaded = loadStacks()
    expect(loaded).toHaveLength(1)
    expect(loaded[0].id).toBe('a')
    expect(currentSolidLiters(loaded[0].volumeEntries)).toBe(0)
  })
})

describe('addStack', () => {
  it('stores the stack and gives it an id', () => {
    const created = addStack({
      name: 'Bjørk ved veggen',
      species: 'bjork',
      stackedDate: '2026-04-15',
      splitSize: 'medium',
      cover: 'roof',
      exposure: 'normal',
      location: { name: 'Oslo', latitude: 59.9, longitude: 10.8 },
    })

    expect(created.id).toBeTruthy()
    expect(created.readings).toEqual([])
    expect(loadStacks()).toHaveLength(1)
    expect(getStack(created.id)?.name).toBe('Bjørk ved veggen')
  })

  it('keeps the stacks already stored', () => {
    saveStacks([makeStack({ id: 'a' })])
    addStack({
      name: 'Gran',
      species: 'gran',
      stackedDate: '2026-05-01',
      splitSize: 'small',
      cover: 'none',
      exposure: 'exposed',
      location: { name: 'Oslo', latitude: 59.9, longitude: 10.8 },
    })
    expect(loadStacks()).toHaveLength(2)
  })

  it('turns an opening amount into the ledger\'s first entry, dated to the stacking day', () => {
    const created = addStack({
      name: 'Bjørk ved veggen',
      species: 'bjork',
      stackedDate: '2026-04-15',
      splitSize: 'medium',
      cover: 'roof',
      exposure: 'normal',
      location: { name: 'Oslo', latitude: 59.9, longitude: 10.8 },
      initialVolume: { amount: 2, unit: 'favn' },
    })

    expect(created.volumeEntries).toHaveLength(1)
    expect(created.volumeEntries?.[0]).toMatchObject({
      date: '2026-04-15',
      kind: 'addition',
      amount: 2,
      unit: 'favn',
    })
    expect(created.volumeEntries?.[0].id).toBeTruthy()
    expect(currentSolidLiters(getStack(created.id)?.volumeEntries)).toBeCloseTo(3300, 6)
  })

  it('never lets `initialVolume` itself land on the stored stack', () => {
    const created = addStack({
      name: 'Bjørk ved veggen',
      species: 'bjork',
      stackedDate: '2026-04-15',
      splitSize: 'medium',
      cover: 'roof',
      exposure: 'normal',
      location: { name: 'Oslo', latitude: 59.9, longitude: 10.8 },
      initialVolume: { amount: 2, unit: 'favn' },
    })

    // A plain spread of the input would leave this sitting on every stored
    // stack and in every share link, and TypeScript would not say a word.
    expect('initialVolume' in created).toBe(false)
    expect('initialVolume' in (getStack(created.id) ?? {})).toBe(false)
  })

  it('leaves the ledger empty when no opening amount was given', () => {
    const created = addStack({
      name: 'Gran',
      species: 'gran',
      stackedDate: '2026-05-01',
      splitSize: 'small',
      cover: 'none',
      exposure: 'exposed',
      location: { name: 'Oslo', latitude: 59.9, longitude: 10.8 },
    })
    expect(created.volumeEntries).toEqual([])
  })
})

describe('addVolumeEntry', () => {
  it('appends the entry to that stack only', () => {
    saveStacks([makeStack({ id: 'a' }), makeStack({ id: 'b', name: 'Gran' })])
    addVolumeEntry('a', { date: '2026-10-15', kind: 'addition', amount: 1, unit: 'favn' })

    expect(getStack('a')?.volumeEntries).toHaveLength(1)
    expect(getStack('a')?.volumeEntries?.[0].amount).toBe(1)
    expect(getStack('b')?.volumeEntries ?? []).toHaveLength(0)
  })

  it('starts a ledger on a stack stored before the field existed', () => {
    const oldShaped = makeStack({ id: 'a' })
    localStorage.setItem('woodstack.state.v1', JSON.stringify({ version: SCHEMA_VERSION, stacks: [oldShaped] }))

    addVolumeEntry('a', { date: '2026-10-15', kind: 'addition', amount: 1, unit: 'storsekk' })
    expect(currentSolidLiters(getStack('a')?.volumeEntries)).toBeCloseTo(500, 6)
  })

  it('keeps the ledger in date order', () => {
    saveStacks([makeStack({ id: 'a' })])
    addVolumeEntry('a', { date: '2027-01-10', kind: 'withdrawal', amount: 1, unit: 'sekk60' })
    addVolumeEntry('a', { date: '2026-10-15', kind: 'addition', amount: 1, unit: 'favn' })

    expect(getStack('a')?.volumeEntries?.map((entry) => entry.date)).toEqual(['2026-10-15', '2027-01-10'])
  })

  it('does nothing for an unknown stack', () => {
    saveStacks([makeStack({ id: 'a' })])
    expect(addVolumeEntry('nope', { date: '2026-10-15', kind: 'addition', amount: 1, unit: 'favn' })).toBeUndefined()
    expect(getStack('a')?.volumeEntries ?? []).toHaveLength(0)
  })
})

describe('addReading', () => {
  it('appends the reading to that stack only', () => {
    saveStacks([makeStack({ id: 'a' }), makeStack({ id: 'b', name: 'Gran' })])
    addReading('a', { date: '2026-10-15', moisture: 28 })

    expect(getStack('a')?.readings).toHaveLength(1)
    expect(getStack('a')?.readings[0].moisture).toBe(28)
    expect(getStack('b')?.readings).toHaveLength(0)
  })

  it('keeps readings in date order', () => {
    saveStacks([makeStack({ id: 'a' })])
    addReading('a', { date: '2026-12-01', moisture: 24 })
    addReading('a', { date: '2026-10-15', moisture: 28 })

    expect(getStack('a')?.readings.map((r) => r.date)).toEqual(['2026-10-15', '2026-12-01'])
  })

  it('does nothing for an unknown stack', () => {
    saveStacks([makeStack({ id: 'a' })])
    expect(addReading('nope', { date: '2026-10-15', moisture: 28 })).toBeUndefined()
    expect(getStack('a')?.readings).toHaveLength(0)
  })
})

describe('removeStack', () => {
  it('removes only the named stack', () => {
    saveStacks([makeStack({ id: 'a' }), makeStack({ id: 'b' })])
    removeStack('a')
    expect(loadStacks().map((s) => s.id)).toEqual(['b'])
  })
})

describe('replaceStacks', () => {
  it('swaps the whole set, which is what an import does', () => {
    saveStacks([makeStack({ id: 'a' })])
    replaceStacks([makeStack({ id: 'x' }), makeStack({ id: 'y' })])
    expect(loadStacks().map((s) => s.id)).toEqual(['x', 'y'])
  })
})

describe('removeReading', () => {
  it('removes only the named reading', () => {
    saveStacks([
      makeStack({
        id: 'a',
        readings: [
          { id: 'r1', date: '2026-10-15', moisture: 28 },
          { id: 'r2', date: '2026-12-01', moisture: 24 },
        ],
      }),
    ])

    removeReading('a', 'r1')

    expect(getStack('a')?.readings.map((r) => r.id)).toEqual(['r2'])
  })

  it('leaves the other stacks and the ledger alone', () => {
    saveStacks([
      makeStack({
        id: 'a',
        readings: [{ id: 'r1', date: '2026-10-15', moisture: 28 }],
        volumeEntries: [{ id: 'v1', date: '2026-04-15', kind: 'addition', amount: 1, unit: 'favn' }],
      }),
      makeStack({ id: 'b', readings: [{ id: 'r9', date: '2026-10-15', moisture: 30 }] }),
    ])

    removeReading('a', 'r1')

    expect(getStack('a')?.volumeEntries).toHaveLength(1)
    expect(getStack('b')?.readings.map((r) => r.id)).toEqual(['r9'])
  })

  it('does nothing for an unknown stack', () => {
    saveStacks([makeStack({ id: 'a', readings: [{ id: 'r1', date: '2026-10-15', moisture: 28 }] })])

    expect(removeReading('nope', 'r1')).toBeUndefined()
    expect(getStack('a')?.readings).toHaveLength(1)
  })

  it('does nothing for an unknown reading', () => {
    saveStacks([makeStack({ id: 'a', readings: [{ id: 'r1', date: '2026-10-15', moisture: 28 }] })])

    expect(removeReading('a', 'nope')?.readings).toHaveLength(1)
    expect(getStack('a')?.readings).toHaveLength(1)
  })
})

describe('removeVolumeEntry', () => {
  it('removes only the named entry', () => {
    saveStacks([
      makeStack({
        id: 'a',
        volumeEntries: [
          { id: 'v1', date: '2026-04-15', kind: 'addition', amount: 2, unit: 'favn' },
          { id: 'v2', date: '2027-01-10', kind: 'withdrawal', amount: 1, unit: 'storsekk' },
        ],
      }),
    ])

    removeVolumeEntry('a', 'v2')

    expect(getStack('a')?.volumeEntries?.map((entry) => entry.id)).toEqual(['v1'])
  })

  it('leaves the readings and the other stacks alone', () => {
    saveStacks([
      makeStack({
        id: 'a',
        readings: [{ id: 'r1', date: '2026-10-15', moisture: 28 }],
        volumeEntries: [{ id: 'v1', date: '2026-04-15', kind: 'addition', amount: 2, unit: 'favn' }],
      }),
      makeStack({
        id: 'b',
        volumeEntries: [{ id: 'v9', date: '2026-04-15', kind: 'addition', amount: 1, unit: 'favn' }],
      }),
    ])

    removeVolumeEntry('a', 'v1')

    expect(getStack('a')?.readings).toHaveLength(1)
    expect(getStack('b')?.volumeEntries?.map((entry) => entry.id)).toEqual(['v9'])
  })

  it('changes what is left over once the entry is gone', () => {
    saveStacks([
      makeStack({
        id: 'a',
        volumeEntries: [
          { id: 'v1', date: '2026-04-15', kind: 'addition', amount: 2, unit: 'fastKubikk' },
          { id: 'v2', date: '2027-01-10', kind: 'withdrawal', amount: 1, unit: 'fastKubikk' },
        ],
      }),
    ])

    const updated = removeVolumeEntry('a', 'v2')

    expect(currentSolidLiters(updated?.volumeEntries)).toBe(2000)
  })

  it('does nothing for an unknown stack', () => {
    saveStacks([
      makeStack({
        id: 'a',
        volumeEntries: [{ id: 'v1', date: '2026-04-15', kind: 'addition', amount: 2, unit: 'favn' }],
      }),
    ])

    expect(removeVolumeEntry('nope', 'v1')).toBeUndefined()
    expect(getStack('a')?.volumeEntries).toHaveLength(1)
  })

  it('handles a stack stored before the ledger existed', () => {
    saveStacks([makeStack({ id: 'a', volumeEntries: undefined })])

    expect(removeVolumeEntry('a', 'v1')?.volumeEntries).toEqual([])
  })
})
