import { describe, expect, it } from 'vitest'
import { emc } from './emc'

/** Reference values are the USDA Wood Handbook's equilibrium moisture content
 *  table (Table 4-2), dry basis %, converted from °F to °C. Acceptance
 *  criterion 1 allows 1 percentage point of slack against them. */
const REFERENCE = [
  { celsius: 21.1, humidity: 30, expected: 6.3 },
  { celsius: 21.1, humidity: 65, expected: 12.0 },
  { celsius: 21.1, humidity: 90, expected: 21.0 },
  { celsius: 4.4, humidity: 65, expected: 12.4 },
  { celsius: 32.2, humidity: 65, expected: 11.6 },
]

describe('emc', () => {
  it.each(REFERENCE)(
    'is within 1 pp of the Wood Handbook value at $celsius °C / $humidity % RH',
    ({ celsius, humidity, expected }) => {
      expect(Math.abs(emc(celsius, humidity) - expected)).toBeLessThanOrEqual(1)
    },
  )

  it('rises with humidity at a fixed temperature', () => {
    expect(emc(15, 40)).toBeLessThan(emc(15, 70))
    expect(emc(15, 70)).toBeLessThan(emc(15, 95))
  })

  it('stays inside a physically sane range for any ambient input', () => {
    for (let t = -20; t <= 35; t += 5) {
      for (let h = 5; h <= 99; h += 5) {
        const value = emc(t, h)
        expect(value).toBeGreaterThan(0)
        expect(value).toBeLessThan(35)
      }
    }
  })
})
