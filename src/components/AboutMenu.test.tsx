import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, screen, within } from '@testing-library/react'
import { renderWithMantine } from '../test/render'
import { ENGLISH_TEST_LANGUAGE, setTestLanguage } from '../test/language'
import { SERVICE_NAME } from '../climate/openMeteo'
import { nb } from '../i18n/nb'
import { en } from '../i18n/en'
import { AboutMenu } from './AboutMenu'
import { assertNoBungeeBelow16 } from '../test/fontRules'

/** The version is baked in at build time and differs on every checkout, so the
 *  test checks its SHAPE — a commit date and a short SHA, or the «dev» the
 *  fallback leaves behind when there is no git to ask. */
const VERSION = /(\d{4}-\d{2}-\d{2} \([0-9a-f]{7,}\)|dev)/

function openDialog() {
  fireEvent.click(screen.getByRole('button', { name: nb['about.menuLabel'] }))
  fireEvent.click(screen.getByRole('menuitem', { name: nb['about.menuItem'] }))
  return screen.getByRole('dialog')
}

describe('AboutMenu', () => {
  it('is three dots and nothing else until it is asked', () => {
    renderWithMantine(<AboutMenu />)
    expect(screen.getByRole('button', { name: nb['about.menuLabel'] })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens a menu with the one thing that belongs to the app as a whole', () => {
    renderWithMantine(<AboutMenu />)
    fireEvent.click(screen.getByRole('button', { name: nb['about.menuLabel'] }))
    expect(screen.getByRole('menuitem', { name: nb['about.menuItem'] })).toBeInTheDocument()
  })

  it('opens the dialog on the first tab, with the three tabs to pick from', () => {
    renderWithMantine(<AboutMenu />)
    const dialog = openDialog()

    expect(within(dialog).getByRole('tab', { name: nb['about.tabWhat'] })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(within(dialog).getByRole('tab', { name: nb['about.tabHow'] })).toBeInTheDocument()
    expect(within(dialog).getByRole('tab', { name: nb['about.tabInfo'] })).toBeInTheDocument()
    expect(dialog.textContent).toContain(nb['about.what.body'])
  })

  /** Switching tabs used to resize the dialog, since a one-paragraph tab and
   *  a four-paragraph one are not the same height. The wrapper's own
   *  `min-height` is what keeps the dialog the same size regardless of which
   *  tab is open. */
  it('gives the panels a fixed minimum height, the same on every tab', () => {
    renderWithMantine(<AboutMenu />)
    const dialog = openDialog()

    const heightOnFirstTab = within(dialog).getByTestId('about-panels').style.minHeight
    expect(heightOnFirstTab).not.toBe('')

    fireEvent.click(within(dialog).getByRole('tab', { name: nb['about.tabInfo'] }))
    expect(within(dialog).getByTestId('about-panels').style.minHeight).toBe(heightOnFirstTab)
  })

  it('explains how the estimate is worked out on its own tab', () => {
    renderWithMantine(<AboutMenu />)
    const dialog = openDialog()
    expect(dialog.textContent).not.toContain(nb['about.how.body'])

    fireEvent.click(within(dialog).getByRole('tab', { name: nb['about.tabHow'] }))
    expect(dialog.textContent).toContain(nb['about.how.body'])
  })

  /** The whole point of the Info tab: it says what the app does with what you
   *  put into it, and it names the one outside service by name. */
  it('names the one outside service on the info tab', () => {
    renderWithMantine(<AboutMenu />)
    const dialog = openDialog()

    fireEvent.click(within(dialog).getByRole('tab', { name: nb['about.tabInfo'] }))
    expect(dialog.textContent).toContain(nb['about.info.body'])
    expect(dialog.textContent).toContain(SERVICE_NAME)
  })

  /** «Which version am I looking at» is the question the dialog exists to
   *  answer when something looks wrong, so the answer cannot be hiding behind
   *  whichever tab happens to be open. */
  it('shows the build it is running, whichever tab is open', () => {
    renderWithMantine(<AboutMenu />)
    const dialog = openDialog()
    expect(within(dialog).getByText(VERSION)).toBeInTheDocument()

    fireEvent.click(within(dialog).getByRole('tab', { name: nb['about.tabInfo'] }))
    expect(within(dialog).getByText(VERSION)).toBeInTheDocument()
  })

  /** No dashed rule running into it any more — the version stands on its
   *  own, centred under the tabs rather than left-aligned beside a line. */
  it('centres the version line, without a rule running into it', () => {
    renderWithMantine(<AboutMenu />)
    const dialog = openDialog()

    expect(within(dialog).getByText(VERSION)).toHaveStyle({ textAlign: 'center' })
    expect(dialog.querySelector('[aria-hidden="true"]')).not.toBeInTheDocument()
  })

  /** The dialog title sat at 12 px in Bungee and the three tabs at 10 — both
   *  written into `styles={{ ... }}` objects, which is the form happy-dom
   *  keeps, so the rendered tree is where they are checked. */
  it('sets nothing in Bungee below 16 px', () => {
    renderWithMantine(<AboutMenu />)
    openDialog()

    assertNoBungeeBelow16(document.body)
  })

  /** Three shouted labels in a row are the same wall the Bungee version
   *  was. */
  it('leaves the tab labels in mixed case', () => {
    renderWithMantine(<AboutMenu />)
    const dialog = openDialog()

    const tab = within(dialog).getByRole('tab', { name: nb['about.tabHow'] })
    expect(tab.getAttribute('style') ?? '').not.toContain('text-transform: uppercase')
  })

  it('closes again on Escape', () => {
    renderWithMantine(<AboutMenu />)
    openDialog()
    fireEvent.keyDown(document.body, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  /** The same underline tabs as the stack page, and for the same reason — but
   *  without the even split. The three labels are not close to the same
   *  width, so an even split would hand the shortest one a lake of space and
   *  squeeze the longest. The three keep their own widths, left-aligned. */
  it('draws the dialog tabs as an underline row that keeps each label to its own width', () => {
    renderWithMantine(<AboutMenu />)
    const dialog = openDialog()

    const list = within(dialog).getByRole('tablist')
    expect(list).toHaveAttribute('data-variant', 'default')
    expect(list).not.toHaveAttribute('data-grow')
    expect(within(dialog).getByRole('tab', { name: nb['about.tabWhat'] })).toHaveStyle({
      padding: '9px 14px',
    })
  })

  /** Three tabs of prose are the largest block of text in the app, and a
   *  block that size is exactly where one language quietly goes missing. */
  it('speaks English to an English visitor, all the way through', () => {
    setTestLanguage(ENGLISH_TEST_LANGUAGE)
    renderWithMantine(<AboutMenu />)

    fireEvent.click(screen.getByRole('button', { name: en['about.menuLabel'] }))
    fireEvent.click(screen.getByRole('menuitem', { name: en['about.menuItem'] }))
    const dialog = screen.getByRole('dialog')

    expect(dialog.textContent).toContain(en['about.what.body'])
    fireEvent.click(within(dialog).getByRole('tab', { name: en['about.tabHow'] }))
    expect(dialog.textContent).toContain(en['about.how.body'])
    fireEvent.click(within(dialog).getByRole('tab', { name: en['about.tabInfo'] }))
    expect(dialog.textContent).toContain(en['about.info.body'])
    expect(dialog.textContent).toContain(en['about.version'].replace('{value}', ''))
  })
})

/** The unit the answers are read in used to sit in this menu too; it now
 *  sits on the two screens that use it. */
describe('AboutMenu holding the app-wide settings', () => {
  beforeEach(() => {
    window.location.hash = ''
  })

  /** Eleven units unfolded inline is not what a menu is for — theme has three
   *  choices and language two, which is why those two can sit open here. The
   *  choice moved to the two screens whose figures it governs. */
  it('no longer offers the unit the answers are read in', () => {
    renderWithMantine(<AboutMenu />)
    fireEvent.click(screen.getByRole('button', { name: nb['about.menuLabel'] }))

    expect(screen.queryByText(nb['compare.resultUnitLabel'])).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: nb['volume.unit.favn'] })).not.toBeInTheDocument()
  })
})
