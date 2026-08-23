import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  StorageQuotaError,
  addReading,
  addStack,
  addVolumeEntry,
  getStack,
  hasStoredState,
  loadStacks,
  markStackReadyNotified,
  removeReading,
  removeStack,
  removeVolumeEntry,
  replaceStacks,
  saveStacks,
  updateStack,
} from './stacksRepo'
import { OSLO_NORMALS, makeStack } from '../test/fixtures'
import { SCHEMA_VERSION } from './schema'
import { currentSolidLiters } from '../model/volume'
import { estimateWindow } from '../model/simulate'

beforeEach(() => {
  localStorage.clear()
})

/** A browser out of room rejects the write with this, and never half-writes:
 *  whatever was stored before the call is still there afterwards. Restored by
 *  the caller, so the same test can read storage back afterwards. */
function refuseWrites() {
  return vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
    throw new DOMException('quota', 'QuotaExceededError')
  })
}

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

  it('reads a stack stored before a second species could be recorded', () => {
    // Same reasoning as the volume ledger above: `secondSpecies` is optional
    // rather than a SCHEMA_VERSION bump, so every stack already in a
    // visitor's browser loads as the pure stack it is.
    const oldShaped = makeStack({ id: 'b' })
    expect('secondSpecies' in oldShaped).toBe(false)
    localStorage.setItem('woodstack.state.v1', JSON.stringify({ version: SCHEMA_VERSION, stacks: [oldShaped] }))

    const loaded = loadStacks()
    expect(loaded).toHaveLength(1)
    expect(loaded[0].secondSpecies).toBeUndefined()
    expect(estimateWindow(loaded[0], OSLO_NORMALS)).toEqual(estimateWindow(oldShaped, OSLO_NORMALS))
  })

  it('keeps a second species through a save and a load', () => {
    const mixed = makeStack({ id: 'c', secondSpecies: { species: 'gran', share: 'third' } })
    saveStacks([mixed])
    expect(loadStacks()[0].secondSpecies).toEqual({ species: 'gran', share: 'third' })
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

describe('updateStack', () => {
  const BERGEN = { name: 'Bergen', latitude: 60.39, longitude: 5.32 }

  it('replaces the five editable fields and leaves everything else standing', () => {
    saveStacks([
      makeStack({
        id: 'a',
        readings: [{ id: 'r1', date: '2026-10-15', moisture: 28 }],
        volumeEntries: [{ id: 'v1', date: '2026-04-15', kind: 'addition', amount: 2, unit: 'favn' }],
      }),
    ])

    const updated = updateStack('a', {
      name: 'Bjørk bak låven',
      splitSize: 'small',
      cover: 'none',
      exposure: 'exposed',
      location: BERGEN,
    })

    expect(updated?.name).toBe('Bjørk bak låven')
    const stored = getStack('a')
    expect(stored?.name).toBe('Bjørk bak låven')
    expect(stored?.splitSize).toBe('small')
    expect(stored?.cover).toBe('none')
    expect(stored?.exposure).toBe('exposed')
    expect(stored?.location).toEqual(BERGEN)
  })

  // Species and stacked date are what every reading was interpreted against,
  // so an edit may not move them — and the readings themselves are logged
  // history, not something a change of name touches.
  it('leaves species, stacked date, readings and the ledger alone', () => {
    saveStacks([
      makeStack({
        id: 'a',
        readings: [{ id: 'r1', date: '2026-10-15', moisture: 28 }],
        volumeEntries: [{ id: 'v1', date: '2026-04-15', kind: 'addition', amount: 2, unit: 'favn' }],
      }),
    ])

    updateStack('a', {
      name: 'Bjørk bak låven',
      splitSize: 'small',
      cover: 'none',
      exposure: 'exposed',
      location: BERGEN,
    })

    const stored = getStack('a')
    expect(stored?.species).toBe('bjork')
    expect(stored?.stackedDate).toBe('2026-04-15')
    expect(stored?.readings).toEqual([{ id: 'r1', date: '2026-10-15', moisture: 28 }])
    expect(stored?.volumeEntries).toEqual([
      { id: 'v1', date: '2026-04-15', kind: 'addition', amount: 2, unit: 'favn' },
    ])
  })

  it('changes only the named stack', () => {
    saveStacks([makeStack({ id: 'a' }), makeStack({ id: 'b', name: 'Grana bak låven' })])

    updateStack('a', {
      name: 'Bjørk bak låven',
      splitSize: 'small',
      cover: 'none',
      exposure: 'exposed',
      location: BERGEN,
    })

    expect(getStack('b')?.name).toBe('Grana bak låven')
    expect(getStack('b')?.cover).toBe('roof')
  })

  it('does nothing for an unknown stack', () => {
    saveStacks([makeStack({ id: 'a' })])
    const before = loadStacks()

    expect(
      updateStack('nope', {
        name: 'Bjørk bak låven',
        splitSize: 'small',
        cover: 'none',
        exposure: 'exposed',
        location: BERGEN,
      }),
    ).toBeUndefined()
    expect(loadStacks()).toEqual(before)
  })
})

describe('markStackReadyNotified', () => {
  it('records the date the visitor was told, and persists it', () => {
    saveStacks([makeStack({ id: 'a' })])

    const updated = markStackReadyNotified('a', '2027-09-01')

    expect(updated?.notifiedReadyAt).toBe('2027-09-01')
    expect(getStack('a')?.notifiedReadyAt).toBe('2027-09-01')
  })

  it('leaves everything else on the stack standing', () => {
    saveStacks([
      makeStack({
        id: 'a',
        readings: [{ id: 'r1', date: '2026-10-15', moisture: 28 }],
        volumeEntries: [{ id: 'v1', date: '2026-04-15', kind: 'addition', amount: 2, unit: 'favn' }],
      }),
    ])

    markStackReadyNotified('a', '2027-09-01')

    const stored = getStack('a')
    expect(stored?.readings).toHaveLength(1)
    expect(stored?.volumeEntries).toHaveLength(1)
    expect(stored?.name).toBe('Bjørkestabelen')
  })

  it('changes nothing for an id that is not there', () => {
    saveStacks([makeStack({ id: 'a' })])
    const before = loadStacks()

    expect(markStackReadyNotified('nope', '2027-09-01')).toBeUndefined()
    expect(loadStacks()).toEqual(before)
  })
})

describe('a photo on a stack', () => {
  const BERGEN = { name: 'Bergen', latitude: 60.39, longitude: 5.32 }

  function edit(photo: string | undefined) {
    return { name: 'Bjørk bak låven', splitSize: 'small' as const, cover: 'none' as const, exposure: 'exposed' as const, location: BERGEN, photo }
  }

  it('replaces the photo and leaves everything else standing', () => {
    saveStacks([
      makeStack({
        id: 'a',
        photo: 'data:image/jpeg;base64,old',
        readings: [{ id: 'r1', date: '2026-10-15', moisture: 28 }],
        volumeEntries: [{ id: 'v1', date: '2026-04-15', kind: 'addition', amount: 2, unit: 'favn' }],
      }),
    ])

    updateStack('a', edit('data:image/jpeg;base64,new'))

    const stored = getStack('a')
    expect(stored?.photo).toBe('data:image/jpeg;base64,new')
    expect(stored?.species).toBe('bjork')
    expect(stored?.stackedDate).toBe('2026-04-15')
    expect(stored?.readings).toEqual([{ id: 'r1', date: '2026-10-15', moisture: 28 }])
    expect(stored?.volumeEntries).toHaveLength(1)
  })

  // Not an empty string and not a `photo: undefined` key left sitting in the
  // payload: the field goes away entirely, so it costs nothing in the share
  // link either.
  it('removes the photo when the edit carries none', () => {
    saveStacks([makeStack({ id: 'a', photo: 'data:image/jpeg;base64,old' })])

    updateStack('a', edit(undefined))

    const stored = getStack('a')
    expect(stored?.photo).toBeUndefined()
    expect('photo' in (stored as object)).toBe(false)
  })

  it('carries a photo through `addStack`', () => {
    const created = addStack({
      name: 'Bjørk ved veggen',
      species: 'bjork',
      stackedDate: '2026-04-15',
      splitSize: 'medium',
      cover: 'roof',
      exposure: 'normal',
      location: { name: 'Oslo', latitude: 59.9, longitude: 10.8 },
      photo: 'data:image/jpeg;base64,new',
    })

    expect(getStack(created.id)?.photo).toBe('data:image/jpeg;base64,new')
  })
})

/** A photo is the first thing this app stores that can plausibly fill the
 *  browser's ~5 MB. The write either lands or is refused whole, so the stacks
 *  already on disk survive — what must not happen is a raw `DOMException`
 *  escaping into a click handler with nothing to catch it. */
describe('a browser with no room left', () => {
  const BERGEN = { name: 'Bergen', latitude: 60.39, longitude: 5.32 }

  it('turns a refused write into `StorageQuotaError` and keeps the stored stacks, on update', () => {
    saveStacks([makeStack({ id: 'a' })])
    const before = loadStacks()
    const refused = refuseWrites()

    expect(() =>
      updateStack('a', {
        name: 'Bjørk bak låven',
        splitSize: 'small',
        cover: 'none',
        exposure: 'exposed',
        location: BERGEN,
        photo: 'data:image/jpeg;base64,huge',
      }),
    ).toThrow(StorageQuotaError)

    refused.mockRestore()
    expect(loadStacks()).toEqual(before)
  })

  it('turns a refused write into `StorageQuotaError` and keeps the stored stacks, on add', () => {
    saveStacks([makeStack({ id: 'a' })])
    const before = loadStacks()
    const refused = refuseWrites()

    expect(() =>
      addStack({
        name: 'Bjørk ved veggen',
        species: 'bjork',
        stackedDate: '2026-04-15',
        splitSize: 'medium',
        cover: 'roof',
        exposure: 'normal',
        location: { name: 'Oslo', latitude: 59.9, longitude: 10.8 },
        photo: 'data:image/jpeg;base64,huge',
      }),
    ).toThrow(StorageQuotaError)

    refused.mockRestore()
    expect(loadStacks()).toEqual(before)
  })

  // Anything else that goes wrong is not a full disk, and dressing it up as
  // one would send the visitor looking for room they already have.
  it('lets an error that is not about room through as it is', () => {
    const refused = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new TypeError('something else entirely')
    })

    expect(() => saveStacks([makeStack({ id: 'a' })])).toThrow(TypeError)
    refused.mockRestore()
  })
})

/** The distinction the seeding step turns on: "this browser has never run the
 *  app" against "this browser ran it and the visitor emptied the list". */
describe('hasStoredState', () => {
  it('is false in a browser that has never written anything', () => {
    expect(hasStoredState()).toBe(false)
  })

  it('is true once a stack has been written', () => {
    addStack({
      name: 'Bjørkestabelen',
      species: 'bjork',
      stackedDate: '2026-04-15',
      splitSize: 'medium',
      cover: 'roof',
      exposure: 'normal',
      location: { name: 'Oslo', latitude: 59.9, longitude: 10.8 },
    })
    expect(hasStoredState()).toBe(true)
  })

  /** The one that would break silently: reading `loadStacks().length === 0`
   *  instead would call an emptied browser new again, and the visitor who
   *  deleted the examples would find them back on the next visit. */
  it('stays true after the last stack has been deleted', () => {
    const created = addStack({
      name: 'Bjørkestabelen',
      species: 'bjork',
      stackedDate: '2026-04-15',
      splitSize: 'medium',
      cover: 'roof',
      exposure: 'normal',
      location: { name: 'Oslo', latitude: 59.9, longitude: 10.8 },
    })
    removeStack(created.id)

    expect(loadStacks()).toHaveLength(0)
    expect(hasStoredState()).toBe(true)
  })

  it('is true after an empty list has been saved on purpose', () => {
    saveStacks([])
    expect(hasStoredState()).toBe(true)
  })
})
