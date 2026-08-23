import { describe, expect, it } from 'vitest'
import { createTranslator } from '../i18n/useTranslation'
import { makeStack } from '../test/fixtures'
import { fromSolidLiters } from './volume'
import {
  deliveredKwh,
  formatNeed,
  hasLoggedVolume,
  neededSolidLiters,
  roundForUnit,
  STOVE_OPTIONS,
  totalLoggedSolidLiters,
} from './needCalculator'

describe('neededSolidLiters and deliveredKwh', () => {
  /** AC 1 and 2: the chain runs both ways. Whatever `neededSolidLiters` says a
   *  kWh need takes, `deliveredKwh` must read back the same kWh need out of it —
   *  not approximately by a fixed constant, but by actually inverting the same
   *  chain (energy → weight → volume and back). */
  it('round-trips a kWh need through wood and back to kWh, for any species and efficiency', () => {
    for (const species of ['gran', 'eik', 'bjork'] as const) {
      for (const efficiency of [0.65, 0.45, 0.15]) {
        const solidLiters = neededSolidLiters(1000, species, efficiency)
        const amountInFastKubikk = fromSolidLiters(solidLiters, 'fastKubikk')
        const kwhBack = deliveredKwh(amountInFastKubikk, 'fastKubikk', species, efficiency)
        expect(kwhBack).toBeCloseTo(1000, 6)
      }
    }
  })

  /** AC 2, the other arrival point: entering an amount already in a volume
   *  unit (e.g. favner) gives back a kWh figure, not just the reverse of the
   *  first test's own construction. */
  it('turns a volume already offered into the kWh it represents', () => {
    // 1 fastKubikk of spruce, bone dry 380 kg, at 20% moisture 456 kg,
    // raw energy 456 * 4.2 = 1915.2 kWh, delivered at 65% = 1244.88 kWh.
    expect(deliveredKwh(1, 'fastKubikk', 'gran', 0.65)).toBeCloseTo(1244.88, 6)
  })

  /** AC 3: the same kWh need, compared across two stoves of different
   *  efficiency, must cost more wood at the lower efficiency — proving stove
   *  choice changes the displayed answer. */
  it('needs more wood for the same kWh through a less efficient stove', () => {
    const efficient = neededSolidLiters(5000, 'bjork', STOVE_OPTIONS.find((s) => s.id === 'rentbrennende')!.efficiency)
    const inefficient = neededSolidLiters(5000, 'bjork', STOVE_OPTIONS.find((s) => s.id === 'grue')!.efficiency)
    expect(roundForUnit(inefficient, 'favn')).toBeGreaterThan(roundForUnit(efficient, 'favn'))
  })
})

describe('STOVE_OPTIONS', () => {
  it('lists the three stoves the engine knows an efficiency for', () => {
    expect(STOVE_OPTIONS.map((s) => s.id).sort()).toEqual(['gammel', 'grue', 'rentbrennende'])
    for (const stove of STOVE_OPTIONS) {
      expect(stove.efficiency).toBeGreaterThan(0)
      expect(stove.efficiency).toBeLessThanOrEqual(1)
    }
  })
})

describe('roundForUnit', () => {
  /** AC 4: never more precision than the unit allows — favner to the nearest
   *  quarter, sacks to the nearest whole one. */
  it('rounds favner to the nearest quarter', () => {
    expect(roundForUnit(1650, 'favn')).toBeCloseTo(1, 6) // 1650/1600 = 1.03125 -> 1
    expect(roundForUnit(2100, 'favn')).toBeCloseTo(1.25, 6) // 2100/1600 = 1.3125 -> 1.25
  })

  it('rounds sacks to the nearest whole one', () => {
    expect(roundForUnit(41.667 * 2.6, 'sekk60')).toBe(3)
  })

  it('never returns more decimals than the unit’s own step implies', () => {
    const amount = roundForUnit(12345, 'favn')
    expect(Math.round(amount * 4)).toBeCloseTo(amount * 4, 6)
  })
})

describe('totalLoggedSolidLiters and hasLoggedVolume', () => {
  /** AC 5: a stack with no ledger contributes nothing, and is not
   *  distinguishable from a stack that truly has none. */
  it('sums logged volume across every stack, skipping stacks with no ledger', () => {
    const withLedger = makeStack({
      id: 'a',
      volumeEntries: [{ id: 'e1', date: '2026-01-01', kind: 'addition', amount: 1, unit: 'favn' }],
    })
    const withoutLedger = makeStack({ id: 'b' })
    expect(totalLoggedSolidLiters([withLedger, withoutLedger])).toBeCloseTo(1600, 6)
  })

  it('reports no logged volume when nobody has used the ledger', () => {
    expect(hasLoggedVolume([makeStack({ id: 'a' }), makeStack({ id: 'b' })])).toBe(false)
  })

  it('reports logged volume once at least one stack has a non-empty ledger', () => {
    const withLedger = makeStack({
      id: 'a',
      volumeEntries: [{ id: 'e1', date: '2026-01-01', kind: 'addition', amount: 1, unit: 'favn' }],
    })
    expect(hasLoggedVolume([withLedger, makeStack({ id: 'b' })])).toBe(true)
  })
})

describe('formatNeed', () => {
  /** AC 6: the preferred unit is said first and largest, and at least one
   *  other unit is said alongside it (never a single number in a single
   *  unit — the description's own bar for this screen). */
  it('names the preferred unit first, and at least one other unit besides it', () => {
    const t = createTranslator('nb')
    const text = formatNeed(4000, 'favn', t)
    expect(text.indexOf('favn')).toBeLessThan(text.indexOf('sekk'))
  })

  it('gives a different secondary unit when the preferred unit is itself the usual second choice', () => {
    const t = createTranslator('nb')
    const text = formatNeed(4000, 'sekk60', t)
    expect(text).toContain('sekk')
    expect(text).toContain('favn')
  })

  it('translates into English', () => {
    const t = createTranslator('en')
    const text = formatNeed(4000, 'favn', t)
    expect(text).toMatch(/favn/i)
    expect(text).not.toMatch(/omtrent/i)
  })
})
