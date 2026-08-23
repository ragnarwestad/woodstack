import { describe, expect, it } from 'vitest'
import { MOISTURE_BANDS, dryBasisFromWetBasis, moistureBand } from './moisture'

describe('dryBasisFromWetBasis', () => {
  /** Water as a share of the whole becomes water as a share of the wood:
   *  45 parts water in 100 parts wet wood is 45 parts water on 55 parts wood.
   *  The app's own rule of thumb («fersk bjørk er 45 % våtvekt og 75 %
   *  tørrvekt», `explain.moisture.body`) is a rounded pair of typical figures
   *  rather than this exact conversion, so it is not what is asserted here. */
  it('reads water as a share of the wood rather than of the whole', () => {
    expect(dryBasisFromWetBasis(45)).toBeCloseTo(81.818, 3)
  })

  it('leaves bone-dry wood at zero on either basis', () => {
    expect(dryBasisFromWetBasis(0)).toBe(0)
  })

  it('reads half-water wood as weighing as much again dry', () => {
    expect(dryBasisFromWetBasis(50)).toBeCloseTo(100, 6)
  })
})

describe('MOISTURE_BANDS', () => {
  it('offers the five bands the spreadsheet names, driest last', () => {
    expect(MOISTURE_BANDS.map((band) => band.id)).toEqual([
      'nyfelt',
      'syretorket',
      'ra',
      'salgsved',
      'ekstraTorr',
    ])
  })

  /** The bands carry the spreadsheet's own wet-basis ends, and the dry-basis
   *  figure the engine uses is derived from them — not typed in twice. */
  it('keeps the spreadsheet ends and derives the dry-basis figure from them', () => {
    expect(moistureBand('salgsved').wetBasisRange).toEqual([16, 22])
    expect(moistureBand('salgsved').moisturePercent).toBe(23)
  })

  it('reads freshly felled wood as roughly its own weight in water', () => {
    expect(moistureBand('nyfelt').moisturePercent).toBe(100)
  })

  it('gets drier with every step down the list', () => {
    const percents = MOISTURE_BANDS.map((band) => band.moisturePercent)
    expect(percents).toEqual([...percents].sort((a, b) => b - a))
  })

  /** A band that reads high on wet basis and low on dry basis would quietly
   *  halve the water in a lot. Every band must convert, not pass through. */
  it('never states a dry-basis figure below its own wet-basis one', () => {
    for (const band of MOISTURE_BANDS) {
      const wetMidpoint = (band.wetBasisRange[0] + band.wetBasisRange[1]) / 2
      expect(band.moisturePercent).toBeGreaterThan(wetMidpoint)
    }
  })
})
