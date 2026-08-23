import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, screen, within } from '@testing-library/react'
import { renderWithMantine } from '../test/render'
import { ENGLISH_TEST_LANGUAGE, setTestLanguage } from '../test/language'
import { SERVICE_NAME } from '../climate/openMeteo'
import { nb } from '../i18n/nb'
import { en } from '../i18n/en'
import {
  RESULT_UNIT_STORAGE_KEY,
  readResultUnitPreference,
  writeResultUnitPreference,
} from '../storage/resultUnitPreference'
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

  it('opens a menu with the things that belong to the app as a whole', () => {
    renderWithMantine(<AboutMenu />)
    fireEvent.click(screen.getByRole('button', { name: nb['about.menuLabel'] }))
    expect(screen.getByRole('menuitem', { name: nb['compare.menuItem'] })).toBeInTheDocument()
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

  /** The same underline tabs as the stack page, and for the same reason — but
   *  without the even split. «Slik regner vi» is three times the width of
   *  «Om», so an even split hands one label a lake of space and squeezes the
   *  other two. The three keep their own widths, left-aligned. */
  it('draws the dialog tabs as an underline row that keeps each label to its own width', () => {
    renderWithMantine(<AboutMenu />)
    const dialog = openDialog()

    const list = within(dialog).getByRole('tablist')
    expect(list).toHaveAttribute('data-variant', 'default')
    expect(list).not.toHaveAttribute('data-grow')
    expect(within(dialog).getByRole('tab', { name: nb['about.tabWhat'] })).toHaveStyle({
      padding: '9px 6px',
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

/** The comparison screen and the unit its answers are read in: two things
 *  that belong to the app rather than to any one stack, so they live behind
 *  the same three dots the «Om appen» item already did. */
describe('AboutMenu holding the app-wide settings', () => {
  beforeEach(() => {
    localStorage.removeItem(RESULT_UNIT_STORAGE_KEY)
    window.location.hash = ''
  })

  it('sends the visitor to the comparison screen', () => {
    renderWithMantine(<AboutMenu />)
    fireEvent.click(screen.getByRole('button', { name: nb['about.menuLabel'] }))
    fireEvent.click(screen.getByRole('menuitem', { name: nb['compare.menuItem'] }))

    expect(window.location.hash).toBe('#compare')
  })

  it('ticks the unit the answers are currently read in', () => {
    writeResultUnitPreference('losKubikk')
    renderWithMantine(<AboutMenu />)
    fireEvent.click(screen.getByRole('button', { name: nb['about.menuLabel'] }))

    expect(screen.getByRole('menuitem', { name: nb['volume.unit.losKubikk'] })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(screen.getByRole('menuitem', { name: nb['volume.unit.favn'] })).toHaveAttribute(
      'aria-checked',
      'false',
    )
  })

  /** The point of the setting: it is picked once and still there tomorrow.
   *  Kept out of the stack data on purpose, so it survives a share link. */
  it('remembers a new unit past this session', () => {
    renderWithMantine(<AboutMenu />)
    fireEvent.click(screen.getByRole('button', { name: nb['about.menuLabel'] }))
    fireEvent.click(screen.getByRole('menuitem', { name: nb['volume.unit.storsekk'] }))

    expect(readResultUnitPreference()).toBe('storsekk')

    fireEvent.click(screen.getByRole('button', { name: nb['about.menuLabel'] }))
    expect(screen.getByRole('menuitem', { name: nb['volume.unit.storsekk'] })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })
})
