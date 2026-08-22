import { createContext, useCallback, useState, type ReactNode } from 'react'
import type { Language } from './language'
import { readLanguagePreference, writeLanguagePreference } from './languagePreference'

export type LanguageContextValue = {
  language: Language
  setLanguage: (language: Language) => void
}

/** `null` means no provider above, which `useTranslation` reads as "decide the
 *  language yourself" — that is what keeps the component tests that render a
 *  single component without a provider working. */
export const LanguageContext = createContext<LanguageContextValue | null>(null)

/** The one place the chosen language lives. Every `useTranslation` reads it
 *  from here, so switching re-renders the whole tree at once instead of
 *  leaving each component with a language of its own. */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(readLanguagePreference)

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next)
    writeLanguagePreference(next)
  }, [])

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}
