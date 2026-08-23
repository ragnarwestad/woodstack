import { describe, expect, it } from 'vitest'
import { SPECIES_IDS, type Species } from '../storage/schema'
import { atMoistureKg, litersToKg, SPECIES_DENSITY_KG_PER_SOLID_M3, solidLitersToKg } from './density'

describe('litersToKg', () => {
  /** The arithmetic on its own, with the density handed in — so it is pinned
   *  whatever the table above it says. */
  it('is solid cubic metres times kilos per solid cubic metre', () => {
    expect(litersToKg(1000, 500)).toBe(500)
    expect(litersToKg(2500, 380)).toBeCloseTo(950, 9)
    expect(litersToKg(0, 500)).toBe(0)
  })
})

describe('the density table', () => {
  it('has a figure for every species the app knows', () => {
    for (const species of SPECIES_IDS) {
      expect(SPECIES_DENSITY_KG_PER_SOLID_M3[species]).toBeGreaterThan(0)
    }
  })

  /** `Tabeller 1` in Ved4.xlsx, and the `Vekt` sheet's worked example: one
   *  solid cubic metre of spruce, bone dry, is 380 kg. */
  it('weighs a solid cubic metre of spruce at the spreadsheet figure of 380 kg', () => {
    expect(solidLitersToKg(1000, 'gran')).toBeCloseTo(380, 6)
  })

  it('makes oak nearly half again as heavy as spruce, cubic metre for cubic metre', () => {
    expect(solidLitersToKg(1000, 'eik') / solidLitersToKg(1000, 'gran')).toBeCloseTo(550 / 380, 6)
  })

  /** Seventeen species are in the sheet; the app knows seven. A species that
   *  is not in the table must say so rather than quietly return a guess. */
  it('refuses a species it has no figure for, naming it', () => {
    expect(() => solidLitersToKg(1000, 'lonn' as Species)).toThrow(/lonn/)
  })
})

describe('atMoistureKg', () => {
  /** The table is basisdensitet — bone-dry wood. Wet wood weighs more, and
   *  moisture in this app is dry basis: water as a share of the dry wood, so
   *  20 % moisture is dry weight times 1.2. The `Vekt` sheet does exactly
   *  this: spruce at 380 kg bone dry, 456 kg at 20 %. */
  it('adds the water to the dry weight, dry basis', () => {
    expect(atMoistureKg(380, 20)).toBeCloseTo(456, 6)
    expect(atMoistureKg(380, 0)).toBe(380)
  })

  it('closes the chain from a logged volume to a weight at a moisture', () => {
    expect(atMoistureKg(solidLitersToKg(1000, 'gran'), 20)).toBeCloseTo(456, 6)
  })
})
