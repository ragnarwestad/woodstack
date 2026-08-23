import { describe, expect, it } from 'vitest'
import { fireEvent, screen, within } from '@testing-library/react'
import { renderWithMantine } from '../test/render'
import { ENGLISH_TEST_LANGUAGE, setTestLanguage } from '../test/language'
import { SERVICE_NAME } from '../climate/openMeteo'
import { nb } from '../i18n/nb'
import { en } from '../i18n/en'
import { AboutMenu } from './AboutMenu'

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

  it('opens a menu with the one item behind the dots', () => {
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

  it('closes again on Escape', () => {
    renderWithMantine(<AboutMenu />)
    openDialog()
    fireEvent.keyDown(document.body, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
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
