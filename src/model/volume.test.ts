import { describe, expect, it } from 'vitest'
import { VOLUME_UNITS } from '../storage/schema'
import {
  currentSolidLiters,
  exceedsEntryCap,
  formatVolume,
  fromSolidLiters,
  MAX_ENTRY_SOLID_LITERS,
  toSolidLiters,
} from './volume'
import { createTranslator } from '../i18n/useTranslation'

const nb = createTranslator('nb')

describe('the conversion table', () => {
  it('puts one favn at the published 1650 solid litres', () => {
    expect(toSolidLiters(1, 'favn')).toBeCloseTo(1650, 6)
  })

  it('keeps the published ratios between favn, storsekk and stablet kubikk', () => {
    const favn = toSolidLiters(1, 'favn')
    expect(favn / toSolidLiters(1, 'storsekk')).toBeCloseTo(3.3, 6)
    expect(favn / toSolidLiters(1, 'stablet')).toBeCloseTo(2.4, 6)
  })

  it('takes a fast kubikkmeter as the reference: 1000 litres, all of it wood', () => {
    expect(toSolidLiters(1, 'fastKubikk')).toBe(1000)
  })

  it('makes a loose kubikkmeter half a solid one', () => {
    expect(toSolidLiters(1, 'losKubikk')).toBeCloseTo(500, 6)
    expect(toSolidLiters(1, 'storsekk')).toBeCloseTo(500, 6)
  })

  it('scales the two sack sizes off the same stacked fraction', () => {
    expect(toSolidLiters(1, 'sekk60') / toSolidLiters(1, 'sekk40')).toBeCloseTo(1.5, 6)
  })

  it('round-trips every unit back to the amount it started from', () => {
    for (const unit of VOLUME_UNITS) {
      expect(fromSolidLiters(toSolidLiters(2.5, unit), unit)).toBeCloseTo(2.5, 9)
    }
  })
})

describe('currentSolidLiters', () => {
  it('reads an untracked stack as zero rather than as missing', () => {
    expect(currentSolidLiters()).toBe(0)
    expect(currentSolidLiters([])).toBe(0)
  })

  it('sums additions logged in different units', () => {
    const total = currentSolidLiters([
      { id: '1', date: '2026-04-15', kind: 'addition', amount: 2, unit: 'favn' },
      { id: '2', date: '2026-05-01', kind: 'addition', amount: 1, unit: 'storsekk' },
    ])
    expect(total).toBeCloseTo(3800, 6)
  })

  it('subtracts what was taken out again', () => {
    const total = currentSolidLiters([
      { id: '1', date: '2026-04-15', kind: 'addition', amount: 1, unit: 'favn' },
      { id: '2', date: '2027-01-10', kind: 'withdrawal', amount: 0.4, unit: 'storsekk' },
    ])
    expect(total).toBeCloseTo(1450, 6)
  })

  it('lets the stored total go negative, so a correcting entry still adds up', () => {
    const total = currentSolidLiters([
      { id: '1', date: '2026-04-15', kind: 'addition', amount: 1, unit: 'storsekk' },
      { id: '2', date: '2027-01-10', kind: 'withdrawal', amount: 2, unit: 'storsekk' },
    ])
    expect(total).toBeCloseTo(-500, 6)
  })
})

describe('formatVolume', () => {
  it('shows the total in fast kubikkmeter, the one unit that stays additive', () => {
    expect(formatVolume(1650, nb)).toBe('1,65 m³ fast')
  })

  it('shows nothing below zero, whatever the ledger nets out to', () => {
    expect(formatVolume(-500, nb)).toBe('0 m³ fast')
  })

  it('says it in English when that is the language', () => {
    expect(formatVolume(1650, createTranslator('en'))).toBe('1.65 m³ solid')
  })
})

describe('the cap on a single entry', () => {
  /** Any cap is arbitrary; this one is chosen to be impossible to hit by
   *  accident and impossible to miss by typo. 1000 m³ solid is roughly 600
   *  favn — some twenty truckloads — so no woodpile a person stacks by hand
   *  comes near it, while `1e15` in the amount field does not get through. */
  it('is generous enough that a large private woodpile fits', () => {
    expect(toSolidLiters(30, 'favn')).toBeLessThan(MAX_ENTRY_SOLID_LITERS)
  })

  it('is the same limit whichever unit the amount is given in', () => {
    const favn = fromSolidLiters(MAX_ENTRY_SOLID_LITERS, 'favn')
    const sacks = fromSolidLiters(MAX_ENTRY_SOLID_LITERS, 'sekk40')
    expect(toSolidLiters(favn, 'favn')).toBeCloseTo(toSolidLiters(sacks, 'sekk40'), 6)
  })

  it('rejects an amount whose converted volume is over the cap', () => {
    expect(exceedsEntryCap(1e15, 'favn')).toBe(true)
  })

  it('accepts an ordinary amount', () => {
    expect(exceedsEntryCap(2, 'favn')).toBe(false)
  })
})
