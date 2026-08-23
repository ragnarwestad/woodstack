import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { NotifyPrompt } from './NotifyPrompt'
import { renderWithMantine } from '../test/render'
import { ENGLISH_TEST_LANGUAGE, setTestLanguage } from '../test/language'

/** `happy-dom` has no `Notification`, so this file installs one — the same
 *  local stub `readyNotifier.test.ts` uses, for the same reason: one of the
 *  cases below is about the browser not having the API at all. */

function installNotification(
  permission: NotificationPermission,
  // The real API answers with a promise, so the stub does too — the component
  // reads the visitor's answer off it.
  requestPermission = vi.fn().mockResolvedValue('granted' as NotificationPermission),
) {
  Object.defineProperty(globalThis, 'Notification', {
    value: { permission, requestPermission },
    configurable: true,
    writable: true,
  })
  return requestPermission
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'Notification')
})

describe('NotifyPrompt', () => {
  it('offers to tell the visitor, and says what about', () => {
    installNotification('default')
    renderWithMantine(<NotifyPrompt supported />)

    expect(screen.getByText(/få beskjed når veden er klar/i)).toBeInTheDocument()
    expect(screen.getByText(/tørr nok til å fyre med/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /si fra/i })).toBeInTheDocument()
  })

  // Nothing is asked for on mount. The permission dialog only ever opens
  // because the visitor pressed the button.
  it('does not ask the browser for anything until the button is pressed', () => {
    const requestPermission = installNotification('default')
    renderWithMantine(<NotifyPrompt supported />)
    expect(requestPermission).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /si fra/i }))
    expect(requestPermission).toHaveBeenCalledTimes(1)
  })

  it('renders nothing where the platform cannot honour it', () => {
    installNotification('default')
    renderWithMantine(<NotifyPrompt supported={false} />)
    expect(screen.queryByText(/få beskjed når veden er klar/i)).not.toBeInTheDocument()
  })

  it('renders nothing once the visitor has already answered', () => {
    installNotification('granted')
    renderWithMantine(<NotifyPrompt supported />)
    expect(screen.queryByText(/få beskjed når veden er klar/i)).not.toBeInTheDocument()
  })

  it('renders nothing once the visitor has said no', () => {
    installNotification('denied')
    renderWithMantine(<NotifyPrompt supported />)
    expect(screen.queryByText(/få beskjed når veden er klar/i)).not.toBeInTheDocument()
  })

  it('can be dismissed', () => {
    installNotification('default')
    renderWithMantine(<NotifyPrompt supported />)

    fireEvent.click(screen.getByRole('button', { name: /lukk/i }))
    expect(screen.queryByText(/få beskjed når veden er klar/i)).not.toBeInTheDocument()
  })

  it('renders nothing where the browser has no Notification API at all', () => {
    Reflect.deleteProperty(globalThis, 'Notification')
    renderWithMantine(<NotifyPrompt supported />)
    expect(screen.queryByText(/få beskjed når veden er klar/i)).not.toBeInTheDocument()
  })
})

describe('NotifyPrompt in English', () => {
  it('asks in English too', () => {
    setTestLanguage(ENGLISH_TEST_LANGUAGE)
    installNotification('default')
    renderWithMantine(<NotifyPrompt supported />)

    expect(screen.getByText(/tell you when the firewood is ready/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^tell me$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^close$/i })).toBeInTheDocument()
  })
})
