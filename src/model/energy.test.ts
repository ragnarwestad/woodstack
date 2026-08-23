import { describe, expect, it } from 'vitest'
import {
  deliveredEnergyKwh,
  ENERGY_PER_KG_AT_20_PERCENT_MOISTURE_KWH,
  ENERGY_PER_KG_BONE_DRY_KWH,
  ENERGY_TO_EVAPORATE_PER_KG_WATER_KWH,
  rawEnergyKwh,
  STOVE_EFFICIENCY,
} from './energy'

describe('rawEnergyKwh', () => {
  it('gives bone-dry wood the full 5.32 kWh a kilo', () => {
    expect(rawEnergyKwh(1, 0)).toBeCloseTo(ENERGY_PER_KG_BONE_DRY_KWH, 9)
    expect(rawEnergyKwh(10, 0)).toBeCloseTo(53.2, 9)
  })

  /** Ved4.xlsx states 4.2 kWh per kilo of wood at 20 % moisture as a figure
   *  in its own right; deriving it from the dry-wood figure and the cost of
   *  boiling the water off lands at about 4.28. The gap is the spreadsheet's
   *  own rounding, not an error in either — the test bounds it rather than
   *  pretending the two agree exactly. */
  it('lands within 5 % of the spreadsheet figure for wood at 20 % moisture', () => {
    const perKg = rawEnergyKwh(1, 20)
    expect(perKg).toBeGreaterThan(ENERGY_PER_KG_AT_20_PERCENT_MOISTURE_KWH * 0.95)
    expect(perKg).toBeLessThan(ENERGY_PER_KG_AT_20_PERCENT_MOISTURE_KWH * 1.05)
  })

  /** Wet wood is worth less than it looks: the same kilo carries less wood
   *  and spends some of what it has boiling its own water off. */
  it('makes a kilo of wet wood worth less than a kilo of dry', () => {
    expect(rawEnergyKwh(1, 50)).toBeLessThan(rawEnergyKwh(1, 20))
    expect(rawEnergyKwh(1, 20)).toBeLessThan(rawEnergyKwh(1, 0))
  })

  it('charges 0.9 kWh for every kilo of water it has to boil off', () => {
    expect(ENERGY_TO_EVAPORATE_PER_KG_WATER_KWH).toBeCloseTo(0.9, 9)
    // One kilo at 100 % moisture is half a kilo of wood and half a kilo of water.
    expect(rawEnergyKwh(1, 100)).toBeCloseTo(0.5 * 5.32 - 0.5 * 0.9, 9)
  })

  it('reads nothing as nothing', () => {
    expect(rawEnergyKwh(0, 20)).toBe(0)
  })
})

describe('deliveredEnergyKwh', () => {
  /** The `Vekt` sheet's own worked line: one kilo of wood at 20 % moisture is
   *  4.2 kWh raw, 2.73 out of a clean-burning stove, 1.89 out of an old one
   *  and 0.63 out of an open fire. */
  it('matches the spreadsheet at its three named appliances', () => {
    expect(deliveredEnergyKwh(4.2, STOVE_EFFICIENCY.rentbrennende)).toBeCloseTo(2.73, 6)
    expect(deliveredEnergyKwh(4.2, STOVE_EFFICIENCY.gammel)).toBeCloseTo(1.89, 6)
    expect(deliveredEnergyKwh(4.2, STOVE_EFFICIENCY.grue)).toBeCloseTo(0.63, 6)
  })

  it('is plain multiplication at any efficiency the caller supplies', () => {
    expect(deliveredEnergyKwh(100, 0.9)).toBeCloseTo(90, 9)
    expect(deliveredEnergyKwh(100, 0.98)).toBeCloseTo(98, 9)
    expect(deliveredEnergyKwh(100, 0.15)).toBeCloseTo(15, 9)
    expect(deliveredEnergyKwh(100, 1)).toBe(100)
  })

  it('keeps every named efficiency a fraction between nothing and everything', () => {
    for (const efficiency of Object.values(STOVE_EFFICIENCY)) {
      expect(efficiency).toBeGreaterThan(0)
      expect(efficiency).toBeLessThanOrEqual(1)
    }
  })
})
