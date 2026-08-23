import { describe, expect, it } from 'vitest'
import { act, fireEvent, screen } from '@testing-library/react'
import { InstallPrompt } from './InstallPrompt'
import { renderWithMantine } from '../test/render'
import { ENGLISH_TEST_LANGUAGE, setTestLanguage } from '../test/language'

/** The event Chromium fires and iOS never does. */
function fireInstallPrompt() {
  const event = new Event('beforeinstallprompt') as Event & { prompt?: () => Promise<void> }
  event.prompt = () => Promise.resolve()
  act(() => {
    fireEvent(window, event)
  })
}

describe('InstallPrompt', () => {
  it('renders nothing once the app is installed', () => {
    renderWithMantine(<InstallPrompt standalone ios={false} />)
    fireInstallPrompt()
    expect(screen.queryByText(/hjem-skjermen/i)).not.toBeInTheDocument()
  })

  it('shows the static Add to Home Screen explainer on iOS, which never fires the event', () => {
    renderWithMantine(<InstallPrompt standalone={false} ios />)
    expect(screen.getByText(/legg til på hjem-skjerm/i)).toBeInTheDocument()
  })

  it('waits for the browser event elsewhere, then shows the banner', () => {
    renderWithMantine(<InstallPrompt standalone={false} ios={false} />)
    expect(screen.queryByText(/hjem-skjermen/i)).not.toBeInTheDocument()

    fireInstallPrompt()
    expect(screen.getByRole('button', { name: /installer/i })).toBeInTheDocument()
  })

  /** The box has to say what installing gets you, not just ask for it. It used
   *  to argue from Safari's storage eviction, which is an iOS problem told to
   *  an audience that mostly is not on iOS. */
  it('says what installing gets you — iOS copy', () => {
    renderWithMantine(<InstallPrompt standalone={false} ios />)
    expect(screen.getByText(/virker uten nett/i)).toBeInTheDocument()
    expect(screen.queryByText(/safari/i)).not.toBeInTheDocument()
  })

  it('says the same in the browser banner', () => {
    renderWithMantine(<InstallPrompt standalone={false} ios={false} />)
    fireInstallPrompt()
    expect(screen.getByText(/virker uten nett/i)).toBeInTheDocument()
    expect(screen.queryByText(/safari/i)).not.toBeInTheDocument()
  })

  it('can be dismissed', () => {
    renderWithMantine(<InstallPrompt standalone={false} ios />)
    fireEvent.click(screen.getByRole('button', { name: /lukk/i }))
    expect(screen.queryByText(/hjem-skjermen/i)).not.toBeInTheDocument()
  })
})

describe('InstallPrompt in English', () => {
  it('asks to be installed, and says why, in English', () => {
    setTestLanguage(ENGLISH_TEST_LANGUAGE)
    renderWithMantine(<InstallPrompt standalone={false} ios />)

    expect(screen.getByText(/add woodstack to your home screen/i)).toBeInTheDocument()
    expect(screen.getByText(/works offline/i)).toBeInTheDocument()
    expect(screen.getByText(/add to home screen/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^close$/i })).toBeInTheDocument()
  })
})
