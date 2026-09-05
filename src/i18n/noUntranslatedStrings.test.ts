import { describe, expect, it } from 'vitest'
import { nb, type TranslationKey } from './nb'
import { en } from './en'

/** Seven keys are the same in both languages on purpose: two English
 *  loanwords already used in the Norwegian UI ("Auto", "Info"), two unit
 *  names with no separate English form ("Storfavn", "Cord"), a
 *  currency-plus-unit abbreviation ("Kr per kWh"), and two templates that are
 *  nothing but placeholders. Any OTHER key that goes identical is not a
 *  choice — it is an English string left standing where nb.ts expects a
 *  translation. */
const INTENTIONALLY_SAME: readonly TranslationKey[] = [
  'app.themeAuto',
  'about.tabInfo',
  'compare.krPerKwh',
  'entryList.volumeDetail',
  'species.mixedLabel',
  'volume.unit.storfavn',
  'volume.unit.cord',
]

const INTENTIONALLY_SAME_SET = new Set<TranslationKey>(INTENTIONALLY_SAME)
const KEYS = Object.keys(nb) as TranslationKey[]

function describeMismatch(key: TranslationKey): string {
  return `${key} — nb: ${JSON.stringify(nb[key])}, en: ${JSON.stringify(en[key])}`
}

describe('nb/en translation values', () => {
  it.each(KEYS.filter((key) => !INTENTIONALLY_SAME_SET.has(key)))('%s is translated, not copied', (key) => {
    expect(en[key], describeMismatch(key)).not.toBe(nb[key])
  })

  it.each(INTENTIONALLY_SAME)('%s is still deliberately the same in both languages', (key) => {
    expect(en[key], describeMismatch(key)).toBe(nb[key])
  })
})
