import { describe, expect, it } from 'vitest'
import { DRY_ENOUGH_MOISTURE, MOISTURE_BASIS_LABEL, formatMoisture, formatWindow } from './units'

describe('formatMoisture', () => {
  it('always names the basis, so no bare number ever reaches the UI', () => {
    expect(formatMoisture(19.4)).toContain(MOISTURE_BASIS_LABEL)
    expect(formatMoisture(19.4)).toContain('%')
  })

  it('rounds to whole percent', () => {
    expect(formatMoisture(19.4)).toContain('19')
    expect(formatMoisture(19.6)).toContain('20')
  })
})

describe('DRY_ENOUGH_MOISTURE', () => {
  it('is the 20 % dry-basis folk rule', () => {
    expect(DRY_ENOUGH_MOISTURE).toBe(20)
  })
})

describe('formatWindow', () => {
  it('describes both ends as a part of a month, never as an exact date', () => {
    const text = formatWindow({
      earliest: new Date('2027-09-14T00:00:00Z'),
      latest: new Date('2027-10-27T00:00:00Z'),
    })
    expect(text).toContain('midten av september')
    expect(text).toContain('slutten av oktober')
    expect(text).not.toContain('14')
    expect(text).not.toContain('27.')
  })

  it('uses the beginning/middle/end of the month by day', () => {
    const early = formatWindow({
      earliest: new Date('2027-03-03T00:00:00Z'),
      latest: new Date('2027-03-05T00:00:00Z'),
    })
    expect(early).toContain('begynnelsen av mars')
  })
})
