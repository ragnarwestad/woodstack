import { describe, expect, it } from 'vitest'
import { SPECIES, SPECIES_IDS } from './species'
import { dryingRate, temperatureFactor } from './dryingRate'
import { makeStack } from '../test/fixtures'

describe('SPECIES', () => {
  it('has an entry per species id, with green moisture and a base rate', () => {
    for (const id of SPECIES_IDS) {
      const info = SPECIES[id]
      expect(info.id).toBe(id)
      expect(info.greenMoisture).toBeGreaterThan(40)
      expect(info.baseRate).toBeGreaterThan(0)
    }
  })
})

describe('dryingRate', () => {
  it('dries a small split faster than a large one, all else equal', () => {
    const small = dryingRate(makeStack({ splitSize: 'small' }))
    const large = dryingRate(makeStack({ splitSize: 'large' }))
    expect(small).toBeGreaterThan(large)
  })

  it('dries slower with no cover than under a roof', () => {
    const uncovered = dryingRate(makeStack({ cover: 'none' }))
    const roofed = dryingRate(makeStack({ cover: 'roof' }))
    expect(uncovered).toBeLessThan(roofed)
  })

  it('dries faster in an exposed spot than a sheltered one', () => {
    expect(dryingRate(makeStack({ exposure: 'exposed' }))).toBeGreaterThan(
      dryingRate(makeStack({ exposure: 'sheltered' })),
    )
  })

  it('dries spruce faster than oak', () => {
    expect(dryingRate(makeStack({ species: 'gran' }))).toBeGreaterThan(
      dryingRate(makeStack({ species: 'eik' })),
    )
  })

  it('is positive for every combination', () => {
    expect(dryingRate(makeStack({ species: 'eik', splitSize: 'large', cover: 'none', exposure: 'sheltered' }))).toBeGreaterThan(0)
  })
})

describe('temperatureFactor', () => {
  it('rises with temperature', () => {
    expect(temperatureFactor(0)).toBeLessThan(temperatureFactor(20))
  })

  it('never reaches zero in deep frost, and never runs away in heat', () => {
    expect(temperatureFactor(-30)).toBeGreaterThan(0)
    expect(temperatureFactor(-30)).toBeLessThan(temperatureFactor(15))
    expect(temperatureFactor(45)).toBeLessThan(2)
  })
})
