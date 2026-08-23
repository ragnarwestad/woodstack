import { VOLUME_UNITS } from './schema'

/** Which unit the app reads an answer back in — a favn, a loose cubic metre,
 *  a sack. Some people think in one, some in another, and the arithmetic is
 *  the same either way.
 *
 *  Deliberately its own key rather than a field in `AppState`, for the same
 *  reason `i18n/languagePreference.ts` gives for the language: the share link
 *  carries a payload built from `AppState`, and someone opening a friend's
 *  stacks should read the amounts in their own unit, not the sender's.
 *  Keeping it out also leaves `SCHEMA_VERSION` alone.
 *
 *  Written here rather than in the screen that reads it, because two screens
 *  read it: the comparison screen and, later, "how much do I need". They must
 *  agree on the key and the fallback, so both import this. */
export const RESULT_UNIT_STORAGE_KEY = 'woodstack.resultUnit'

/** Narrower than `VolumeUnit`, and deliberately so: that type also carries
 *  the retired `stablet`, which an old ledger entry may still be stored in but
 *  which nobody may be shown as a choice. An answer is read back in a unit the
 *  app offers. */
export type ResultUnit = (typeof VOLUME_UNITS)[number]

function isResultUnit(value: string | null): value is ResultUnit {
  return VOLUME_UNITS.includes(value as ResultUnit)
}

/** Favn without a stored choice: it is the unit firewood is advertised in
 *  here, so it is the one a visitor comparing two adverts is already holding
 *  in their head. An unrecognised stored value is treated as no choice at
 *  all — which is also what happens to a unit written by a later version of
 *  the app that this one does not know. */
export function readResultUnitPreference(): ResultUnit {
  let stored: string | null = null
  try {
    stored = localStorage.getItem(RESULT_UNIT_STORAGE_KEY)
  } catch {
    // A browser that refuses to be read from still gets a unit.
  }
  return isResultUnit(stored) ? stored : 'favn'
}

/** Best effort. Safari in a private window throws instead of storing, and a
 *  visitor who cannot be remembered should still get to switch for now. */
export function writeResultUnitPreference(unit: ResultUnit): void {
  try {
    localStorage.setItem(RESULT_UNIT_STORAGE_KEY, unit)
  } catch {
    // Nothing to do: the choice lives in React state for this session.
  }
}
