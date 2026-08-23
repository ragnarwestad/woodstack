import { afterEach, describe, expect, it, vi } from 'vitest'
import { isIos, isStandalone } from './platform'

/** These two decide what an iOS visitor is offered — an install instruction or
 *  a notification opt-in — and until now they were only ever reached through
 *  `InstallPrompt`'s overridable props, so nothing tested what they actually
 *  answer. */

const originalMatchMedia = window.matchMedia

function setUserAgent(value: string) {
  Object.defineProperty(navigator, 'userAgent', { value, configurable: true })
}

afterEach(() => {
  Object.defineProperty(window, 'matchMedia', { value: originalMatchMedia, configurable: true, writable: true })
  setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
  )
})

describe('isStandalone', () => {
  it('is true when the app runs from the home screen', () => {
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn().mockReturnValue({ matches: true }),
      configurable: true,
      writable: true,
    })
    expect(isStandalone()).toBe(true)
  })

  it('is false in an ordinary tab', () => {
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn().mockReturnValue({ matches: false }),
      configurable: true,
      writable: true,
    })
    expect(isStandalone()).toBe(false)
  })

  // A browser without `matchMedia` is not a browser running the installed app,
  // and a thrown TypeError here would take the whole render down with it.
  it('is false rather than a crash where matchMedia does not exist', () => {
    Object.defineProperty(window, 'matchMedia', { value: undefined, configurable: true, writable: true })
    expect(isStandalone()).toBe(false)
  })
})

describe('isIos', () => {
  it.each([
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    'Mozilla/5.0 (iPod touch; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
  ])('recognises %s', (userAgent) => {
    setUserAgent(userAgent)
    expect(isIos()).toBe(true)
  })

  it('is false on Android', () => {
    setUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36')
    expect(isIos()).toBe(false)
  })

  it('is false on desktop', () => {
    setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36')
    expect(isIos()).toBe(false)
  })
})
