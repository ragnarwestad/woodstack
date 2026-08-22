import { useState } from 'react'
import { nb, type TranslationKey } from './nb'
import { en } from './en'
import { detectLanguage, type Language } from './language'

const TRANSLATIONS: Record<Language, Record<TranslationKey, string>> = { nb, en }

export type Translator = {
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
  language: Language
}

/** The translator as a plain value, for the model functions that format text
 *  but are not components and so cannot call the hook themselves. */
export function createTranslator(language: Language): Translator {
  function t(key: TranslationKey, params?: Record<string, string | number>): string {
    const text = TRANSLATIONS[language][key]
    if (!params) return text
    return Object.entries(params).reduce(
      (result, [name, value]) => result.replaceAll(`{${name}}`, String(value)),
      text,
    )
  }
  return { t, language }
}

/** The language is read once, when the tree first renders. There is no switch
 *  to change it mid-session — see `3-solution.md` § Approaches — so holding it
 *  in state keeps every component agnostic about where it came from, which is
 *  what makes adding a switch later a change to one function rather than to
 *  every call site. */
export function useTranslation(): Translator {
  const [language] = useState<Language>(detectLanguage)
  return createTranslator(language)
}
