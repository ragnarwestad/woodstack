import { describe, expect, it } from 'vitest'
import { act, fireEvent, screen } from '@testing-library/react'
import { InstallPrompt } from './InstallPrompt'
import { renderWithMantine } from '../test/render'

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

  it('names the seven-day storage eviction, not just "install this app" — iOS copy', () => {
    renderWithMantine(<InstallPrompt standalone={false} ios />)
    expect(screen.getByText(/7 dager/i)).toBeInTheDocument()
  })

  it('names the seven-day storage eviction in the browser banner too', () => {
    renderWithMantine(<InstallPrompt standalone={false} ios={false} />)
    fireInstallPrompt()
    expect(screen.getByText(/7 dager/i)).toBeInTheDocument()
  })

  it('can be dismissed', () => {
    renderWithMantine(<InstallPrompt standalone={false} ios />)
    fireEvent.click(screen.getByRole('button', { name: /lukk/i }))
    expect(screen.queryByText(/hjem-skjermen/i)).not.toBeInTheDocument()
  })
})
