import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithMantine } from '../test/render'
import { ENGLISH_TEST_LANGUAGE, setTestLanguage } from '../test/language'
import { LanguageProvider } from '../i18n/LanguageProvider'
import { LANGUAGE_STORAGE_KEY, readLanguagePreference } from '../i18n/languagePreference'
import { AppHeader } from './AppHeader'

function renderHeader() {
  return renderWithMantine(
    <LanguageProvider>
      <AppHeader />
    </LanguageProvider>,
  )
}

describe('AppHeader', () => {
  beforeEach(() => localStorage.removeItem(LANGUAGE_STORAGE_KEY))

  it('shows the app name and the tagline in the current language', () => {
    renderHeader()
    expect(screen.getByRole('heading', { name: 'Woodstack' })).toBeInTheDocument()
    expect(screen.getByText('Når er veden tørr nok til å fyre med?')).toBeInTheDocument()
  })

  /** Each option is written in its own language. A visitor who has landed on
   *  the wrong one cannot read the language they are trying to leave, so
   *  "English" must say English rather than "Engelsk". */
  it('names each language in that language', () => {
    renderHeader()
    expect(screen.getByRole('radio', { name: 'Norsk' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'English' })).toBeInTheDocument()
  })

  it('switches the visible text when the other language is picked', () => {
    renderHeader()
    fireEvent.click(screen.getByRole('radio', { name: 'English' }))
    expect(
      screen.getByText('When is the firewood dry enough to burn?'),
    ).toBeInTheDocument()
  })

  it('remembers the choice for the next visit', () => {
    renderHeader()
    fireEvent.click(screen.getByRole('radio', { name: 'English' }))
    expect(readLanguagePreference()).toBe('en')
  })

  it('starts on the stored choice rather than the browser language', () => {
    setTestLanguage(ENGLISH_TEST_LANGUAGE)
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'nb')
    renderHeader()
    expect(screen.getByText('Når er veden tørr nok til å fyre med?')).toBeInTheDocument()
  })
})
