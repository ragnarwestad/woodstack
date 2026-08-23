import { describe, expect, it } from 'vitest'
import { PRICE_UNITS, evaluateLot, isLotComplete, unitNeedsSpecies, type Lot } from './lot'
import { VOLUME_UNITS } from '../storage/schema'

/** The engine behind the comparison screen: what a lot of firewood really
 *  costs once the unit, the species and the water are taken out of it.
 *
 *  The two cross-check tests reproduce the `Sammenlign` sheet of Ved4.xlsx
 *  cell for cell — that sheet is the specification for this file, and a test
 *  that only agrees with itself would not notice this drifting away from it. */

function lot(overrides: Partial<Lot> = {}): Lot {
  return { price: 2400, amount: 1, unit: 'favn', moisture: 23, species: 'bjork', ...overrides }
}

describe('unitNeedsSpecies', () => {
  it('needs a species for every volume unit: a favn of oak is not a favn of spruce', () => {
    for (const unit of VOLUME_UNITS) {
      expect(unitNeedsSpecies(unit)).toBe(true)
    }
  })

  it('needs none for kilos, which are already a weight', () => {
    expect(unitNeedsSpecies('kg')).toBe(false)
  })
})

describe('PRICE_UNITS', () => {
  it('is every unit wood is sold in, kilos included', () => {
    expect(PRICE_UNITS).toEqual([...VOLUME_UNITS, 'kg'])
  })

  /** `stablet` is the legacy stacked-cubic-metre unit no new entry may use
   *  (see `VolumeUnit` in `storage/schema.ts`). Nobody is offered it here. */
  it('does not offer the retired stacked unit', () => {
    expect(PRICE_UNITS).not.toContain('stablet')
  })
})

describe('isLotComplete', () => {
  it('accepts a filled-in volume lot', () => {
    expect(isLotComplete(lot())).toBe(true)
  })

  it('rejects a volume lot with no species, which cannot be weighed', () => {
    expect(isLotComplete(lot({ species: undefined }))).toBe(false)
  })

  it('accepts a weight lot with no species', () => {
    expect(isLotComplete(lot({ unit: 'kg', amount: 100, species: undefined }))).toBe(true)
  })

  it('rejects a price or an amount that is not a positive number', () => {
    expect(isLotComplete(lot({ price: 0 }))).toBe(false)
    expect(isLotComplete(lot({ amount: 0 }))).toBe(false)
    expect(isLotComplete(lot({ price: Number.NaN }))).toBe(false)
  })
})

describe('evaluateLot', () => {
  /** 1600 solid litres of birch is 800 kg bone dry, 960 kg at 20 % — so
   *  2400 kroner is 2,50 per kilo of sale-ready wood. */
  it('prices a favn of birch by weight and by kilowatt-hour', () => {
    const result = evaluateLot(lot())

    expect(result.dryKg).toBeCloseTo(800, 6)
    expect(result.kgAt20Percent).toBeCloseTo(960, 6)
    expect(result.krPerKgDry).toBeCloseTo(2.5, 6)
    expect(result.krPerKwh).toBeCloseTo(2400 / (960 * 4.2), 6)
  })

  /** The wood in a favn is the same wood whether it rained on it or not: a
   *  volume already says how much wood there is, so the moisture band changes
   *  nothing for a lot sold by volume. It is the kilos on a scale that carry
   *  water, and only those. */
  it('ignores the moisture band for a lot sold by volume', () => {
    expect(evaluateLot(lot({ moisture: 100 })).krPerKwh).toBeCloseTo(evaluateLot(lot({ moisture: 14 })).krPerKwh, 9)
  })

  it('takes the water back out of a lot sold by the kilo', () => {
    const result = evaluateLot(lot({ price: 3000, amount: 1000, unit: 'kg', moisture: 50, species: undefined }))

    expect(result.dryKg).toBeCloseTo(1000 / 1.5, 6)
    expect(result.kgAt20Percent).toBeCloseTo(800, 6)
    expect(result.krPerKgDry).toBeCloseTo(3.75, 6)
  })

  /** Wet wood is worth less than it looks, and this is the test that says so:
   *  the same 1000 kilos at the same price buys less heat the wetter it is. */
  it('makes a wetter lot of kilos dearer per kilowatt-hour', () => {
    const wet = evaluateLot(lot({ amount: 1000, unit: 'kg', moisture: 100, species: undefined }))
    const dry = evaluateLot(lot({ amount: 1000, unit: 'kg', moisture: 14, species: undefined }))

    expect(wet.krPerKwh).toBeGreaterThan(dry.krPerKwh)
  })

  describe('restating the amount in the visitor’s own unit', () => {
    it('converts a volume lot through solid litres', () => {
      const result = evaluateLot(lot())

      expect(result.amountIn('favn')).toBeCloseTo(1, 6)
      expect(result.amountIn('fastKubikk')).toBeCloseTo(1.6, 6)
      expect(result.amountIn('losKubikk')).toBeCloseTo(3.2, 6)
    })

    /** Kilos cannot be turned into favner without knowing which wood they
     *  are, and a lot sold by weight is never asked for its species — so the
     *  screen has nothing to show here and gets `null` rather than a guess. */
    it('gives no volume for a lot sold by the kilo', () => {
      const result = evaluateLot(lot({ amount: 1000, unit: 'kg', species: undefined }))

      expect(result.amountIn('favn')).toBeNull()
    })
  })

  describe('against the Sammenlign sheet in Ved4.xlsx', () => {
    /** Parti 2 of that sheet: 60 kroner for 100 kg at 20 % moisture. It reads
     *  back 0,60 kr/kg, 0,142857 kr/kWh and 100 kg salgsved. */
    it('reproduces the sheet’s weight lot', () => {
      const result = evaluateLot({ price: 60, amount: 100, unit: 'kg', moisture: 20 })

      expect(result.krPerKgDry).toBeCloseTo(0.6, 6)
      expect(result.krPerKwh).toBeCloseTo(0.14285714, 6)
      expect(result.kgAt20Percent).toBeCloseTo(100, 6)
    })

    /** The sheet's third row of parti 1: one 60-litre sack of pine, which it
     *  makes 0,0416667 solid m³ and 18,333 kg bone dry. */
    it('reproduces the sheet’s sack of pine', () => {
      const result = evaluateLot({ price: 100, amount: 1, unit: 'sekk60', moisture: 23, species: 'furu' })

      // Three decimals, not more: `volume.ts` stores the 60-litre sack as
      // 41.667 solid litres where the sheet carries 41.6666…, and that
      // rounding is the table's, not this file's.
      expect(result.amountIn('fastKubikk')).toBeCloseTo(0.0416667, 6)
      expect(result.dryKg).toBeCloseTo(18.333, 3)
    })
  })

  it('refuses to price a volume lot whose species nobody gave it', () => {
    expect(() => evaluateLot(lot({ species: undefined }))).toThrow(/species/i)
  })
})
