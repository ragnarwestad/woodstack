import { beforeEach, describe, expect, it } from 'vitest'
import { ENGLISH_TEST_LANGUAGE, NORWEGIAN_TEST_LANGUAGE, setTestLanguage } from '../test/language'
import {
  LANGUAGE_STORAGE_KEY,
  readLanguagePreference,
  writeLanguagePreference,
} from './languagePreference'

describe('the language preference', () => {
  beforeEach(() => localStorage.removeItem(LANGUAGE_STORAGE_KEY))

  it('falls back to the browser language when nothing is stored', () => {
    setTestLanguage(ENGLISH_TEST_LANGUAGE)
    expect(readLanguagePreference()).toBe('en')
  })

  it('prefers a stored choice over the browser language', () => {
    setTestLanguage(NORWEGIAN_TEST_LANGUAGE)
    writeLanguagePreference('en')
    expect(readLanguagePreference()).toBe('en')
  })

  it('ignores a stored value that is not a language this app speaks', () => {
    setTestLanguage(NORWEGIAN_TEST_LANGUAGE)
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'de')
    expect(readLanguagePreference()).toBe('nb')
  })

  /** Safari in a private window throws on write rather than storing nothing.
   *  A visitor who cannot be remembered should still get to switch language
   *  for the session, so the write must not take the app down with it. */
  it('survives a storage that refuses to be written to', () => {
    const setItem = Storage.prototype.setItem
    Storage.prototype.setItem = () => {
      throw new Error('QuotaExceededError')
    }
    try {
      expect(() => writeLanguagePreference('en')).not.toThrow()
    } finally {
      Storage.prototype.setItem = setItem
    }
  })

  /** The preference deliberately lives outside `AppState`: the share link
   *  carries a payload built from `AppState`, and a recipient should open the
   *  sender's stacks in their OWN language, not the sender's. */
  it('is stored under a key of its own, not inside the app state', () => {
    expect(LANGUAGE_STORAGE_KEY).not.toContain('state')
  })
})
