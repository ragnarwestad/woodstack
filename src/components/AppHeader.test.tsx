import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { useMantineColorScheme } from '@mantine/core'
import { renderWithMantine } from '../test/render'
import { ENGLISH_TEST_LANGUAGE, setTestLanguage } from '../test/language'
import { mockNarrowViewport } from '../test/matchMedia'
import { LanguageProvider } from '../i18n/LanguageProvider'
import { LANGUAGE_STORAGE_KEY, readLanguagePreference } from '../i18n/languagePreference'
import { nb } from '../i18n/nb'
import { AppHeader } from './AppHeader'

/** Theme and language are icon buttons with a menu under them, the way
 *  paceup's header does it. Opening the menu is part of choosing now. */
function pick(control: string, choice: RegExp) {
  fireEvent.click(screen.getByRole('button', { name: control }))
  fireEvent.click(screen.getByRole('menuitem', { name: choice }))
}

function renderHeader() {
  return renderWithMantine(
    <LanguageProvider>
      <AppHeader onHome={() => {}} />
    </LanguageProvider>,
  )
}

describe('AppHeader', () => {
  /* NOT TESTED HERE, and it should be: the panel cancels both of the
     container's paddings — `marginInline` and `marginTop`, each the negative
     of a Mantine spacing token — so the band sits at the top of the screen and
     bleeds to its edges instead of being inset at rest and flush the moment
     `top={0}` takes hold. `happy-dom` drops every `calc(var(...))` value out of
     the style attribute (the panel's own `background-color` goes the same way),
     so there is nothing left to read. It is the code comment on the margins
     that protects them, and a look at a real narrow screen. */

  /** The reported bug: on a narrow screen the three icon buttons wrap to a line
   *  of their own, where they are the only item — and `space-between` puts a
   *  lone item at the start, so they went left. They belong right on both
   *  lines. */
  it('holds the icon buttons right when they wrap to their own line', () => {
    renderHeader()
    const icons = screen.getByRole('button', { name: nb['app.theme'] }).parentElement as HTMLElement
    expect(icons.style.marginLeft).toBe('auto')
  })

  // Both the language and Mantine's colour scheme are stored, so a choice
  // made in one test would otherwise decide the next one's starting point.
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.unstubAllGlobals())

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

    pick(nb['app.language'], /English/)
    expect(screen.getByText('Peace, love and dry firewood')).toBeInTheDocument()
  })

  /** Each option is written in its own language. A visitor who has landed on
   *  the wrong one cannot read the language they are trying to leave, so
   *  "English" must say English rather than "Engelsk". */
  it('names each language in that language', () => {
    renderHeader()
    fireEvent.click(screen.getByRole('button', { name: nb['app.language'] }))
    expect(screen.getByRole('menuitem', { name: /Norsk/ })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /English/ })).toBeInTheDocument()
  })

  it('switches the visible text when the other language is picked', () => {
    renderHeader()
    pick(nb['app.language'], /English/)
    expect(
      screen.getByText('When is the firewood dry enough to burn?'),
    ).toBeInTheDocument()
  })

  it('remembers the choice for the next visit', () => {
    renderHeader()
    pick(nb['app.language'], /English/)
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
        <AppHeader onHome={() => {}} />
        <Probe />
      </LanguageProvider>,
    )

    expect(screen.getByTestId('scheme')).toHaveTextContent('auto')

    pick(nb['app.theme'], /Mørk/)
    expect(screen.getByTestId('scheme')).toHaveTextContent('dark')

    pick(nb['app.theme'], /Lys/)
    expect(screen.getByTestId('scheme')).toHaveTextContent('light')
  })

  it('starts on auto, so the app follows the device until told otherwise', () => {
    renderHeader()
    fireEvent.click(screen.getByRole('button', { name: nb['app.theme'] }))
    expect(screen.getByRole('menuitem', { name: /Auto/ })).toHaveAttribute('aria-checked', 'true')
  })

  it('carries the menu about the app itself', () => {
    renderHeader()
    expect(screen.getByRole('button', { name: nb['about.menuLabel'] })).toBeInTheDocument()
  })

  /** The growth rings and the scalloped edge are the panel's whole point to
   *  look at and nothing at all to read. A screen reader that announces them
   *  reads two empty boxes between the mark and the buttons, so they carry
   *  `aria-hidden` — the assertion is on that, not on the gradients, which a
   *  test could only restate. */
  it('draws the rings and the scalloped edge, hidden from assistive tech', () => {
    renderHeader()
    expect(screen.getByTestId('header-rings')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByTestId('header-scallop')).toHaveAttribute('aria-hidden', 'true')
  })

  /** Which group the dots sit in decides what a phone does with them. The
   *  controls group is the one allowed to wrap onto a line of its own; the
   *  wordmark group must not, so a control placed in there would push the
   *  app's name around at narrow widths and nothing would say so. */
  /** The three buttons — theme, language, about — belong together, away from
   *  the wordmark. The heading match is loose because the wordmark carries the
   *  year: an exact "Woodstack" once landed this test red when spec 13 renamed
   *  it under spec 14's feet. */
  it('keeps the three buttons together, away from the name', () => {
    renderHeader()
    const controls = screen
      .getByRole('button', { name: nb['about.menuLabel'] })
      .closest('[class*="mantine-Group-root"]')

    expect(controls).toContainElement(screen.getByRole('button', { name: nb['app.language'] }))
    expect(controls).toContainElement(screen.getByRole('button', { name: nb['app.theme'] }))
    expect(controls).not.toContainElement(screen.getByRole('heading', { name: /Woodstack/ }))
  })

  /** The tabs used to sit in the scrolling column below the header and
   *  scroll away under it. They are drawn inside this same sticky panel
   *  now, so they stay on screen with the mark instead. */
  it('draws the front-page tabs inside its own sticky panel, when given any', () => {
    renderWithMantine(
      <LanguageProvider>
        <AppHeader onHome={() => {}} homeTabs={{ value: 'stacks', onChange: vi.fn() }} />
      </LanguageProvider>,
    )

    const panel = document.querySelector('.ws-header')
    expect(panel).toContainElement(screen.getByRole('tab', { name: nb['nav.tabCompare'] }))
  })

  it('carries no tabs at all on a stack, a form, or anywhere else they were not asked for', () => {
    renderHeader()
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
  })

  it('changes tab through the callback it was given', () => {
    const onChange = vi.fn()
    renderWithMantine(
      <LanguageProvider>
        <AppHeader onHome={() => {}} homeTabs={{ value: 'stacks', onChange }} />
      </LanguageProvider>,
    )

    fireEvent.click(screen.getByRole('tab', { name: nb['nav.tabCompare'] }))
    expect(onChange).toHaveBeenCalledWith('compare')
  })

  /** The reported bug: below 530px the three icon buttons wrapped to a line
   *  of their own under the wordmark. Theme and language fold into the
   *  «...» dropdown instead, so only one button stands at the top right and
   *  the row never has three to wrap in the first place. */
  describe('on a narrow screen', () => {
    it('carries no theme or language button of their own', () => {
      mockNarrowViewport()
      renderHeader()

      expect(screen.queryByRole('button', { name: nb['app.theme'] })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: nb['app.language'] })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: nb['about.menuLabel'] })).toBeInTheDocument()
    })

    it('offers the theme and language choice behind the same three dots instead', () => {
      mockNarrowViewport()
      renderHeader()
      fireEvent.click(screen.getByRole('button', { name: nb['about.menuLabel'] }))

      expect(screen.getByRole('menuitem', { name: nb['app.themeDark'] })).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: /English/ })).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: nb['about.menuItem'] })).toBeInTheDocument()
    })

    it('still changes the scheme and the language from inside that dropdown', () => {
      function Probe() {
        const { colorScheme } = useMantineColorScheme()
        return <span data-testid="scheme">{colorScheme}</span>
      }
      mockNarrowViewport()
      renderWithMantine(
        <LanguageProvider>
          <AppHeader onHome={() => {}} />
          <Probe />
        </LanguageProvider>,
      )

      fireEvent.click(screen.getByRole('button', { name: nb['about.menuLabel'] }))
      fireEvent.click(screen.getByRole('menuitem', { name: nb['app.themeDark'] }))
      expect(screen.getByTestId('scheme')).toHaveTextContent('dark')

      fireEvent.click(screen.getByRole('button', { name: nb['about.menuLabel'] }))
      fireEvent.click(screen.getByRole('menuitem', { name: /English/ }))
      expect(readLanguagePreference()).toBe('en')
    })
  })
})
