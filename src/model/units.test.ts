import { describe, expect, it } from 'vitest'
import { DRY_ENOUGH_MOISTURE, formatMoisture, formatWindow } from './units'
import { createTranslator } from '../i18n/useTranslation'

const nb = createTranslator('nb')
const en = createTranslator('en')

describe('formatMoisture', () => {
  it('always names the basis, so no bare number ever reaches the UI', () => {
    expect(formatMoisture(19.4, nb)).toContain('tørrvekt')
    expect(formatMoisture(19.4, nb)).toContain('%')
  })

  it('names the basis in English too', () => {
    expect(formatMoisture(19.4, en)).toContain('dry basis')
    expect(formatMoisture(19.4, en)).not.toContain('tørrvekt')
  })

  it('rounds to whole percent', () => {
    expect(formatMoisture(19.4, nb)).toContain('19')
    expect(formatMoisture(19.6, nb)).toContain('20')
  })
})

describe('DRY_ENOUGH_MOISTURE', () => {
  it('is the 20 % dry-basis folk rule', () => {
    expect(DRY_ENOUGH_MOISTURE).toBe(20)
  })
})

describe('formatWindow', () => {
  it('describes both ends as a part of a month, never as an exact date', () => {
    const text = formatWindow(
      {
        earliest: new Date('2027-09-14T00:00:00Z'),
        latest: new Date('2027-10-27T00:00:00Z'),
      },
      nb,
    )
    expect(text).toContain('midten av september')
    expect(text).toContain('slutten av oktober')
    expect(text).not.toContain('14')
    expect(text).not.toContain('27.')
  })

  it('uses the beginning/middle/end of the month by day', () => {
    const early = formatWindow(
      {
        earliest: new Date('2027-03-03T00:00:00Z'),
        latest: new Date('2027-03-05T00:00:00Z'),
      },
      nb,
    )
    expect(early).toContain('begynnelsen av mars')
  })

  it('puts both the month name and the part-of-month wording into English', () => {
    const text = formatWindow(
      {
        earliest: new Date('2027-09-14T00:00:00Z'),
        latest: new Date('2027-10-27T00:00:00Z'),
      },
      en,
    )
    expect(text).toContain('middle of September 2027')
    expect(text).toContain('end of October 2027')
    expect(text).not.toContain('september')
    expect(text).not.toContain('av')
  })

  it('uses the English beginning-of-month wording by day too', () => {
    const early = formatWindow(
      {
        earliest: new Date('2027-03-03T00:00:00Z'),
        latest: new Date('2027-03-05T00:00:00Z'),
      },
      en,
    )
    expect(early).toContain('beginning of March 2027')
  })
})
