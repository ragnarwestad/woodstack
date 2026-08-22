import '@testing-library/jest-dom/vitest'
import { beforeEach } from 'vitest'
import { NORWEGIAN_TEST_LANGUAGE, setTestLanguage } from './language'

// Norwegian is what the suite assumes unless a test says otherwise, and this
// puts it back afterwards so an English case cannot leak into the next test.
beforeEach(() => setTestLanguage(NORWEGIAN_TEST_LANGUAGE))
