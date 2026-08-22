import { describe, expect, it } from 'vitest'
import { detectLanguage } from './language'
import { ENGLISH_TEST_LANGUAGE, setTestLanguage } from '../test/language'

describe('detectLanguage', () => {
  it('reads every Norwegian tag as Norwegian, bokmål and nynorsk alike', () => {
    expect(detectLanguage('nb-NO')).toBe('nb')
    expect(detectLanguage('no')).toBe('nb')
    expect(detectLanguage('nn-NO')).toBe('nb')
  })

  it('falls back to English for every language the app does not speak', () => {
    expect(detectLanguage('en-US')).toBe('en')
    expect(detectLanguage('fr-FR')).toBe('en')
    expect(detectLanguage('')).toBe('en')
  })

  it('does not mistake another language that merely starts with n', () => {
    expect(detectLanguage('nl-NL')).toBe('en')
  })

  it('reads the browser it is running in when given nothing', () => {
    setTestLanguage(ENGLISH_TEST_LANGUAGE)
    expect(detectLanguage()).toBe('en')
  })
})
