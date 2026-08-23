import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildExampleStacks, isExampleStack, seedExamplesIfEmpty } from './seedStacks'
import { loadStacks, saveStacks } from './stacksRepo'
import { clearNormalsCache } from '../climate/normalsCache'
import { OSLO_NORMALS, makeStack } from '../test/fixtures'
import { dryingProgress } from '../model/simulate'

/** A fixed day, so "16 months ago" is a date this test can name and the three
 *  drying figures below are the same on every run. */
const TODAY = new Date('2026-08-23T00:00:00.000Z')

beforeEach(() => {
  localStorage.clear()
  clearNormalsCache()
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('ingen nettverk i test'))))
})

describe('buildExampleStacks', () => {
  it('builds the three stacks the design was drawn against', () => {
    const examples = buildExampleStacks(TODAY)
    expect(examples.map((example) => example.name)).toEqual([
      'Granveden i skjulet',
      'Bjørkestabelen ved uthuset',
      'Blandingen bak garasjen',
    ])
    expect(examples.map((example) => example.species)).toEqual(['gran', 'bjork', 'bjork'])
    expect(examples[2].secondSpecies).toEqual({ species: 'or', share: 'third' })
  })

  it('puts all three in Lillehammer', () => {
    expect(buildExampleStacks(TODAY).map((example) => example.location.name)).toEqual([
      'Lillehammer',
      'Lillehammer',
      'Lillehammer',
    ])
  })

  it("takes the form's own defaults for everything the design does not name", () => {
    for (const example of buildExampleStacks(TODAY)) {
      expect(example.splitSize).toBe('medium')
      expect(example.cover).toBe('roof')
      expect(example.exposure).toBe('normal')
    }
  })

  /** The one that would break silently: written-down dates are right for one
   *  year and wrong for every year after it, and nothing about the app would
   *  look broken — all three would simply read 100 % and the set would
   *  demonstrate nothing. */
  it('works the stacked dates out from the day it is given, not from a fixed date', () => {
    expect(buildExampleStacks(TODAY).map((example) => example.stackedDate)).toEqual([
      '2025-04-23',
      '2026-04-23',
      '2026-07-23',
    ])

    const twoYearsOn = buildExampleStacks(new Date('2028-08-23T00:00:00.000Z'))
    expect(twoYearsOn.map((example) => example.stackedDate)).toEqual([
      '2027-04-23',
      '2028-04-23',
      '2028-07-23',
    ])
  })

  /** The point of the set: one ready, one well along, one just started. Two of
   *  the three reading much the same would show the visitor a list of
   *  woodpiles rather than the range the app can draw. */
  it('spreads the three across the drying curve', () => {
    const [granveden, bjorkestabelen, blandingen] = buildExampleStacks(TODAY).map((example) =>
      dryingProgress(makeStack({ ...example, readings: [] }), OSLO_NORMALS, TODAY),
    )

    expect(granveden).toBeGreaterThanOrEqual(90)
    expect(bjorkestabelen).toBeGreaterThan(55)
    expect(bjorkestabelen).toBeLessThan(90)
    expect(blandingen).toBeLessThanOrEqual(45)

    expect(granveden - bjorkestabelen).toBeGreaterThanOrEqual(15)
    expect(bjorkestabelen - blandingen).toBeGreaterThanOrEqual(15)
  })
})

describe('seedExamplesIfEmpty', () => {
  it('writes the three examples into a browser that has never held any state', async () => {
    await seedExamplesIfEmpty(TODAY)

    expect(loadStacks().map((stack) => stack.name)).toEqual([
      'Granveden i skjulet',
      'Bjørkestabelen ved uthuset',
      'Blandingen bak garasjen',
    ])
  })

  it('does nothing at all in a browser that has already been seeded and emptied', async () => {
    await seedExamplesIfEmpty(TODAY)
    saveStacks([])

    await seedExamplesIfEmpty(TODAY)

    expect(loadStacks()).toHaveLength(0)
  })

  it('leaves a browser that already holds the visitor’s own stacks alone', async () => {
    saveStacks([makeStack({ id: 'a', name: 'Bjørk ved veggen' })])

    await seedExamplesIfEmpty(TODAY)

    expect(loadStacks().map((stack) => stack.name)).toEqual(['Bjørk ved veggen'])
  })

  it('fetches the normals for Lillehammer once, not once per stack', async () => {
    const fetchMock = vi.fn((_url: string) => Promise.reject(new Error('ingen nettverk i test')))
    vi.stubGlobal('fetch', fetchMock)

    await seedExamplesIfEmpty(TODAY)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('latitude=61.1153'))
  })

  it('still seeds when the climate fetch cannot be made', async () => {
    await expect(seedExamplesIfEmpty(TODAY)).resolves.toBe(true)
    expect(loadStacks()).toHaveLength(3)
  })

  it('says it did nothing when there was nothing to do', async () => {
    saveStacks([])
    await expect(seedExamplesIfEmpty(TODAY)).resolves.toBe(false)
  })
})

describe('isExampleStack', () => {
  it('is false for every stack before anything has been seeded', () => {
    expect(isExampleStack(makeStack({ id: 'a' }))).toBe(false)
  })

  it('is true for exactly the three stacks the seeding created', async () => {
    await seedExamplesIfEmpty(TODAY)

    for (const stack of loadStacks()) {
      expect(isExampleStack(stack)).toBe(true)
    }
    expect(isExampleStack(makeStack({ id: 'ikke-et-eksempel' }))).toBe(false)
  })
})
