import { beforeEach, describe, expect, it } from 'vitest'
import { addReading, addStack, getStack, loadStacks, removeStack, replaceStacks, saveStacks } from './stacksRepo'
import { makeStack } from '../test/fixtures'

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
