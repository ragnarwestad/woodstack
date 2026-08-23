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
  /** Every figure here is one line-item from `Tabeller 2` in Ved4.xlsx, the
   *  sheet the person this app is built for keeps. Where his figures and the
   *  app's earlier published rules of thumb disagree, his win — he is the one
   *  who buys and sells the wood. That is why favn is 1600 solid litres here
   *  and not the 1650 this table used to say. */
  it('gives every unit the solid litres Ved4.xlsx puts on it', () => {
    expect(toSolidLiters(1, 'fastKubikk')).toBe(1000)
    expect(toSolidLiters(1, 'stablet60')).toBeCloseTo(650, 6)
    expect(toSolidLiters(1, 'stablet30')).toBeCloseTo(740, 6)
    expect(toSolidLiters(1, 'losKubikk')).toBeCloseTo(500, 6)
    expect(toSolidLiters(1, 'favn')).toBeCloseTo(1600, 6)
    expect(toSolidLiters(1, 'storsekk')).toBeCloseTo(500, 6)
    expect(toSolidLiters(1, 'sekk40')).toBeCloseTo(30.303, 3)
    expect(toSolidLiters(1, 'sekk60')).toBeCloseTo(41.667, 3)
    expect(toSolidLiters(1, 'sekk80')).toBeCloseTo(50, 6)
    expect(toSolidLiters(1, 'storfavn')).toBeCloseTo(6800, 6)
    expect(toSolidLiters(1, 'cord')).toBeCloseTo(2678.8, 6)
  })

  /** The stacked cubic metre used to be one unit at a blended 0.6875. It is
   *  two units now, because 30 cm splits stack tighter than 60 cm ones and
   *  Norwegian firewood is sold in both lengths. */
  it('separates the two split lengths a stacked cubic metre comes in', () => {
    expect(toSolidLiters(1, 'stablet30')).toBeGreaterThan(toSolidLiters(1, 'stablet60'))
  })

  /** A stack logged before that split still has entries stored in the old
   *  unit. They must keep converting to the volume they always did — nobody's
   *  woodpile is allowed to change size because the app learned a new word. */
  it('still reads an entry logged in the old, retired stacked unit', () => {
    expect(toSolidLiters(1, 'stablet')).toBeCloseTo(687.5, 6)
  })

  it('no longer offers the old stacked unit for a new entry', () => {
    expect((VOLUME_UNITS as readonly string[])).not.toContain('stablet')
    expect(VOLUME_UNITS).toContain('stablet60')
    expect(VOLUME_UNITS).toContain('stablet30')
  })

  it('round-trips every unit back to the amount it started from', () => {
    for (const unit of [...VOLUME_UNITS, 'stablet' as const]) {
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
    expect(total).toBeCloseTo(3700, 6)
  })

  /** A ledger written across the stacked-unit split: the old entry converts
   *  at the old factor, the new one at its own, and the total is simply the
   *  two added up. Neither vintage is rewritten to look like the other. */
  it('sums a ledger that spans the old stacked unit and the new one', () => {
    const total = currentSolidLiters([
      { id: '1', date: '2026-04-15', kind: 'addition', amount: 2, unit: 'stablet' },
      { id: '2', date: '2027-01-10', kind: 'addition', amount: 3, unit: 'stablet60' },
    ])
    expect(total).toBeCloseTo(2 * 687.5 + 3 * 650, 6)
  })

  it('subtracts what was taken out again', () => {
    const total = currentSolidLiters([
      { id: '1', date: '2026-04-15', kind: 'addition', amount: 1, unit: 'favn' },
      { id: '2', date: '2027-01-10', kind: 'withdrawal', amount: 0.4, unit: 'storsekk' },
    ])
    expect(total).toBeCloseTo(1400, 6)
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
