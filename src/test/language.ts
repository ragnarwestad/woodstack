/** Language detection reads `navigator.language`, so the test environment has
 *  to say which language it speaks. Every existing assertion in this suite was
 *  written against the Norwegian UI, so `setup.ts` pins Norwegian before each
 *  test; a test that wants the English UI calls this first. */
export function setTestLanguage(value: string): void {
  Object.defineProperty(navigator, 'language', { value, configurable: true })
}

export const NORWEGIAN_TEST_LANGUAGE = 'nb-NO'
export const ENGLISH_TEST_LANGUAGE = 'en-US'
