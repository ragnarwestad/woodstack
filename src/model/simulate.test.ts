import { describe, expect, it } from 'vitest'
import { emc } from './emc'
import { effectiveRate, estimateWindow, refitRate, simulate, windowProgress } from './simulate'
import { DRY_ENOUGH_MOISTURE } from './units'
import { OSLO_NORMALS, constantNormals, makeStack } from '../test/fixtures'

describe('simulate', () => {
  it('approaches equilibrium: strictly falling, never below the EMC', () => {
    const normals = constantNormals(15, 65)
    const equilibrium = emc(15, 65)
    const points = simulate(makeStack(), normals, { months: 24 })

    expect(points.length).toBe(25)
    for (let i = 1; i < points.length; i++) {
      expect(points[i].moisture).toBeLessThan(points[i - 1].moisture)
      expect(points[i].moisture).toBeGreaterThan(equilibrium - 1e-9)
    }
  })

  it('starts at the species green moisture on the stacked date', () => {
    const points = simulate(makeStack({ stackedDate: '2026-04-15' }), OSLO_NORMALS)
    expect(points[0].moisture).toBeGreaterThan(60)
    expect(points[0].date.toISOString().slice(0, 10)).toBe('2026-04-15')
  })

  it('dries a stack under a roof further than the same stack uncovered', () => {
    const roofed = simulate(makeStack({ cover: 'roof' }), OSLO_NORMALS, { months: 12 })
    const bare = simulate(makeStack({ cover: 'none' }), OSLO_NORMALS, { months: 12 })
    expect(roofed[12].moisture).toBeLessThan(bare[12].moisture)
  })
})

describe('estimateWindow', () => {
  it('returns two dates, never one', () => {
    const window = estimateWindow(makeStack(), OSLO_NORMALS)
    expect(window.earliest).toBeInstanceOf(Date)
    expect(window.latest).toBeInstanceOf(Date)
    expect(window.latest.getTime()).toBeGreaterThan(window.earliest.getTime())
  })

  it('lands after the stacked date and inside the plausible 6-24 month span', () => {
    const stack = makeStack({ stackedDate: '2026-04-15' })
    const window = estimateWindow(stack, OSLO_NORMALS)
    const stacked = new Date('2026-04-15T00:00:00Z').getTime()
    const months = (window.earliest.getTime() - stacked) / (1000 * 60 * 60 * 24 * 30.44)
    expect(months).toBeGreaterThan(3)
    expect(months).toBeLessThan(30)
  })

  it('gives a slow-drying species a later window than a fast one', () => {
    const oak = estimateWindow(makeStack({ species: 'eik' }), OSLO_NORMALS)
    const spruce = estimateWindow(makeStack({ species: 'gran' }), OSLO_NORMALS)
    expect(oak.earliest.getTime()).toBeGreaterThan(spruce.earliest.getTime())
  })
})

describe('estimateWindow on a mixed stack', () => {
  const spruce = makeStack({ species: 'gran' })
  const oak = makeStack({ species: 'eik' })
  const mixed = makeStack({ species: 'gran', secondSpecies: { species: 'eik', share: 'third' } })

  it('runs from the first species ready to the last, not somewhere in between', () => {
    const window = estimateWindow(mixed, OSLO_NORMALS)
    expect(window.earliest).toEqual(estimateWindow(spruce, OSLO_NORMALS).earliest)
    expect(window.latest).toEqual(estimateWindow(oak, OSLO_NORMALS).latest)
  })

  it('is wider than either species on its own', () => {
    const window = estimateWindow(mixed, OSLO_NORMALS)
    const span = (w: { earliest: Date; latest: Date }) => w.latest.getTime() - w.earliest.getTime()
    expect(span(window)).toBeGreaterThan(span(estimateWindow(spruce, OSLO_NORMALS)))
    expect(span(window)).toBeGreaterThan(span(estimateWindow(oak, OSLO_NORMALS)))
  })

  it('still returns two dates in order', () => {
    const window = estimateWindow(mixed, OSLO_NORMALS)
    expect(window.latest.getTime()).toBeGreaterThan(window.earliest.getTime())
  })

  it('does not change the window of a stack with no second species', () => {
    expect(estimateWindow(spruce, OSLO_NORMALS)).toEqual(estimateWindow(makeStack({ species: 'gran' }), OSLO_NORMALS))
  })

  it('keeps the ring inside 0-100 across the combined window', () => {
    const window = estimateWindow(mixed, OSLO_NORMALS)
    const before = new Date(window.earliest.getTime() - 1000 * 60 * 60 * 24 * 365)
    const middle = new Date((window.earliest.getTime() + window.latest.getTime()) / 2)
    const after = new Date(window.latest.getTime() + 1000 * 60 * 60 * 24 * 365)

    expect(windowProgress(window, before)).toBe(0)
    expect(windowProgress(window, after)).toBe(100)
    expect(windowProgress(window, middle)).toBeGreaterThan(0)
    expect(windowProgress(window, middle)).toBeLessThan(100)
  })
})

describe('refitRate', () => {
  it('fits a slower rate when the wood is wetter than projected', () => {
    const stack = makeStack()
    const projected = simulate(stack, OSLO_NORMALS, { months: 6 })[6].moisture
    const wetter = { id: 'r1', date: '2026-10-15', moisture: projected + 10 }
    expect(refitRate(stack, wetter, OSLO_NORMALS)).toBeLessThan(effectiveRate(stack, OSLO_NORMALS))
  })

  it('fits a faster rate when the wood is drier than projected', () => {
    const stack = makeStack()
    const projected = simulate(stack, OSLO_NORMALS, { months: 6 })[6].moisture
    const drier = { id: 'r1', date: '2026-10-15', moisture: Math.max(projected - 10, 22) }
    expect(refitRate(stack, drier, OSLO_NORMALS)).toBeGreaterThan(effectiveRate(stack, OSLO_NORMALS))
  })
})

describe('estimateWindow with a logged reading', () => {
  it('changes the window once a reading is logged', () => {
    const before = estimateWindow(makeStack(), OSLO_NORMALS)
    const projected = simulate(makeStack(), OSLO_NORMALS, { months: 6 })[6].moisture
    const after = estimateWindow(
      makeStack({ readings: [{ id: 'r1', date: '2026-10-15', moisture: projected + 8 }] }),
      OSLO_NORMALS,
    )
    expect(after.earliest.getTime()).not.toBe(before.earliest.getTime())
    expect(after.latest.getTime()).not.toBe(before.latest.getTime())
  })

  it('narrows the window, because a measurement is worth more than a guess', () => {
    const before = estimateWindow(makeStack(), OSLO_NORMALS)
    const projected = simulate(makeStack(), OSLO_NORMALS, { months: 6 })[6].moisture
    const after = estimateWindow(
      makeStack({ readings: [{ id: 'r1', date: '2026-10-15', moisture: projected }] }),
      OSLO_NORMALS,
    )
    const span = (w: { earliest: Date; latest: Date }) => w.latest.getTime() - w.earliest.getTime()
    expect(span(after)).toBeLessThan(span(before))
  })
})

describe('windowProgress', () => {
  const window = {
    earliest: new Date('2027-09-01T00:00:00Z'),
    latest: new Date('2027-11-01T00:00:00Z'),
  }

  it('is 0 before the window', () => {
    expect(windowProgress(window, new Date('2027-01-01T00:00:00Z'))).toBe(0)
  })

  it('is strictly between 0 and 100 inside the window', () => {
    const value = windowProgress(window, new Date('2027-10-01T00:00:00Z'))
    expect(value).toBeGreaterThan(0)
    expect(value).toBeLessThan(100)
  })

  it('is 100 after the window', () => {
    expect(windowProgress(window, new Date('2028-01-01T00:00:00Z'))).toBe(100)
  })

  it('never leaves 0-100 for any date', () => {
    for (const iso of ['2020-01-01', '2027-09-30', '2100-01-01']) {
      const value = windowProgress(window, new Date(`${iso}T00:00:00Z`))
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(100)
    }
  })
})

describe('the dry-enough threshold', () => {
  it('is the level the window is measured against', () => {
    const stack = makeStack()
    const window = estimateWindow(stack, OSLO_NORMALS)
    const points = simulate(stack, OSLO_NORMALS, { months: 36 })
    const atLatest = points.find((p) => p.date.getTime() >= window.latest.getTime())
    expect(atLatest?.moisture).toBeLessThanOrEqual(DRY_ENOUGH_MOISTURE + 2)
  })
})
