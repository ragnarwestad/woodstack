export type Language = 'nb' | 'en'

/** Norwegian for a browser that asks for Norwegian — `nb`, `nn` or the older
 *  plain `no` — and English for everything else. English is the fallback
 *  rather than an error: a visitor whose language the app does not speak is
 *  better served by the language most likely to be a second one than by
 *  Norwegian they cannot read. */
export function detectLanguage(navigatorLanguage: string = navigator.language): Language {
  return /^n[bno](-|$)/i.test(navigatorLanguage) ? 'nb' : 'en'
}
