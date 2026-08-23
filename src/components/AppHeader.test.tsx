import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { useMantineColorScheme } from '@mantine/core'
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
  // Both the language and Mantine's colour scheme are stored, so a choice
  // made in one test would otherwise decide the next one's starting point.
  beforeEach(() => localStorage.clear())

  it('shows the app name and the tagline in the current language', () => {
    renderHeader()
    expect(screen.getByRole('heading', { name: "Woodstack '26" })).toBeInTheDocument()
    expect(screen.getByText('Når er veden tørr nok til å fyre med?')).toBeInTheDocument()
  })

  /** The slogan is the joke the whole restyle is named after, so it has to
   *  survive a language switch like any other string. */
  it('shows the slogan, and switches it with the language', () => {
    renderHeader()
    expect(screen.getByText('Fred, kjærlighet og tørr ved')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('radio', { name: 'English' }))
    expect(screen.getByText('Peace, love and dry firewood')).toBeInTheDocument()
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

  /** The switch has to change the scheme the whole app renders in, not just
   *  light up a segment. A probe reads what Mantine actually resolved to. */
  it('switches the colour scheme the app renders in', () => {
    function Probe() {
      const { colorScheme } = useMantineColorScheme()
      return <span data-testid="scheme">{colorScheme}</span>
    }
    renderWithMantine(
      <LanguageProvider>
        <AppHeader />
        <Probe />
      </LanguageProvider>,
    )

    expect(screen.getByTestId('scheme')).toHaveTextContent('auto')

    fireEvent.click(screen.getByRole('radio', { name: 'Mørk' }))
    expect(screen.getByTestId('scheme')).toHaveTextContent('dark')

    fireEvent.click(screen.getByRole('radio', { name: 'Lys' }))
    expect(screen.getByTestId('scheme')).toHaveTextContent('light')
  })

  it('starts on auto, so the app follows the device until told otherwise', () => {
    renderHeader()
    expect(screen.getByRole('radio', { name: 'Auto' })).toBeChecked()
  })
})
