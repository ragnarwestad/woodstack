import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  RESULT_UNIT_STORAGE_KEY,
  readResultUnitPreference,
  writeResultUnitPreference,
} from './resultUnitPreference'

describe('the result unit preference', () => {
  beforeEach(() => localStorage.removeItem(RESULT_UNIT_STORAGE_KEY))
  afterEach(() => vi.restoreAllMocks())

  it('falls back to favn when nothing is stored', () => {
    expect(readResultUnitPreference()).toBe('favn')
  })

  it('remembers the choice', () => {
    writeResultUnitPreference('losKubikk')
    expect(readResultUnitPreference()).toBe('losKubikk')
  })

  it('ignores a stored value that is not a unit this app knows', () => {
    localStorage.setItem(RESULT_UNIT_STORAGE_KEY, 'cord')
    expect(readResultUnitPreference()).toBe('favn')
  })

  /** Safari in a private window throws on write rather than storing nothing.
   *  A visitor who cannot be remembered should still get to pick a unit for
   *  the session, so the write must not take the app down with it. */
  it('survives a storage that refuses to be written to', () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(() => writeResultUnitPreference('storsekk')).not.toThrow()
  })

  /** The same browser refuses to be read from too, and a screen that cannot
   *  find out which unit was picked should fall back to one rather than take
   *  the whole app down on the way in. */
  it('falls back to a unit when the storage refuses to be read from', () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    expect(readResultUnitPreference()).toBe('favn')
  })

  /** The same reasoning as the language preference: a unit picked for reading
   *  answers should not travel in a stack's share link, and should not force a
   *  `SCHEMA_VERSION` bump. */
  it('is stored under a key of its own, not inside the app state', () => {
    expect(RESULT_UNIT_STORAGE_KEY).not.toContain('state')
  })
})
