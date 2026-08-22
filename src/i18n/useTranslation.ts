import { useContext, useState } from 'react'
import { nb, type TranslationKey } from './nb'
import { en } from './en'
import { detectLanguage, type Language } from './language'
import { LanguageContext, type LanguageContextValue } from './LanguageProvider'

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

/** The language comes from `LanguageProvider`, so the switch in the header
 *  changes every component at once. Without a provider — a component test
 *  rendering one component on its own — the browser's language decides, which
 *  is what the app did before the switch existed. */
export function useTranslation(): Translator {
  const context = useContext(LanguageContext)
  const [detected] = useState<Language>(detectLanguage)
  return createTranslator(context?.language ?? detected)
}

/** The switch itself needs to SET the language, which a plain translator
 *  cannot do. Outside a provider there is nothing to set, and the setter is a
 *  no-op rather than a crash. */
export function useLanguageChoice(): LanguageContextValue {
  const context = useContext(LanguageContext)
  const [detected] = useState<Language>(detectLanguage)
  return context ?? { language: detected, setLanguage: () => undefined }
}
