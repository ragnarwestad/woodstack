import { describe, expect, it } from 'vitest'
import { compareLots } from './lotComparison'

describe('comparing two lots', () => {
  it('picks the left lot when it costs less per kWh', () => {
    const { cheaperIndex, percentCheaper } = compareLots({ krPerKwh: 0.8 }, { krPerKwh: 1 })
    expect(cheaperIndex).toBe(0)
    expect(percentCheaper).toBeCloseTo(20)
  })

  it('picks the right lot when it costs less per kWh', () => {
    const { cheaperIndex, percentCheaper } = compareLots({ krPerKwh: 1 }, { krPerKwh: 0.75 })
    expect(cheaperIndex).toBe(1)
    expect(percentCheaper).toBeCloseTo(25)
  })

  /** The percentage is of the dearer lot, not of the cheaper one: «18 %
   *  billigere» answers "how much less than the other one", which is the
   *  question a buyer standing between two sellers is actually asking. The
   *  other reading — 0,75 is 33 % under 1,00 — would make the same pair of
   *  prices sound like a bigger difference than it is. */
  it('states the saving as a share of the dearer lot', () => {
    const { percentCheaper } = compareLots({ krPerKwh: 2 }, { krPerKwh: 1 })
    expect(percentCheaper).toBeCloseTo(50)
  })

  /** Two identical prices have no winner. Picking one anyway would be the app
   *  inventing a difference the numbers do not have. */
  it('names no winner when the two cost the same per kWh', () => {
    expect(compareLots({ krPerKwh: 1.4 }, { krPerKwh: 1.4 })).toEqual({
      cheaperIndex: null,
      percentCheaper: 0,
    })
  })

  it('reads nothing but the kWh price off each lot', () => {
    const left = { krPerKwh: 0.5, krPerKgDry: 99, kgAt20Percent: 12 }
    const right = { krPerKwh: 1, krPerKgDry: 1, kgAt20Percent: 4000 }
    expect(compareLots(left, right).cheaperIndex).toBe(0)
  })
})
