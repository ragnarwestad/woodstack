import { detectLanguage, type Language } from './language'

/** Deliberately its own key rather than a field in `AppState`: the share link
 *  carries a payload built from `AppState` (`storage/schema.ts`), and someone
 *  opening a friend's stacks should read them in their own language, not the
 *  sender's. Keeping it out also leaves `SCHEMA_VERSION` alone. */
export const LANGUAGE_STORAGE_KEY = 'woodstack.language'

function isLanguage(value: string | null): value is Language {
  return value === 'nb' || value === 'en'
}

/** A stored choice wins over the browser's language; without one, the browser
 *  decides. An unrecognised stored value is treated as no choice at all. */
export function readLanguagePreference(): Language {
  let stored: string | null = null
  try {
    stored = localStorage.getItem(LANGUAGE_STORAGE_KEY)
  } catch {
    // A browser that refuses to be read from still gets a language.
  }
  return isLanguage(stored) ? stored : detectLanguage()
}

/** Best effort. Safari in a private window throws instead of storing, and a
 *  visitor who cannot be remembered should still get to switch for now. */
export function writeLanguagePreference(language: Language): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  } catch {
    // Nothing to do: the choice lives in React state for this session.
  }
}
