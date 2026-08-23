import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { canRequestNotifications, findNewlyReady, notifyReady } from './readyNotifier'
import { estimateWindow } from '../model/simulate'
import { OSLO_NORMALS, makeStack } from '../test/fixtures'
import type { ClimateNormals, Stack } from '../storage/schema'

/** `happy-dom` implements neither `Notification` nor `navigator.serviceWorker`,
 *  so this file installs both itself and takes them back out again afterwards.
 *  Deliberately local rather than in `src/test/setup.ts`: half the cases here
 *  are about what happens when one of the two is missing, and a globally
 *  installed stub would make that case unreachable. */

const originalMatchMedia = window.matchMedia

type NotificationStub = {
  permission: NotificationPermission
  requestPermission: ReturnType<typeof vi.fn>
}

function installNotification(permission: NotificationPermission): NotificationStub {
  const stub: NotificationStub = { permission, requestPermission: vi.fn() }
  Object.defineProperty(globalThis, 'Notification', { value: stub, configurable: true, writable: true })
  return stub
}

function removeNotification() {
  Reflect.deleteProperty(globalThis, 'Notification')
}

function installServiceWorker(showNotification = vi.fn().mockResolvedValue(undefined)) {
  Object.defineProperty(navigator, 'serviceWorker', {
    value: { ready: Promise.resolve({ showNotification }) },
    configurable: true,
    writable: true,
  })
  return showNotification
}

function removeServiceWorker() {
  Reflect.deleteProperty(navigator, 'serviceWorker')
}

function setPlatform({ ios, standalone }: { ios: boolean; standalone: boolean }) {
  Object.defineProperty(navigator, 'userAgent', {
    value: ios
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
      : 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36',
    configurable: true,
  })
  Object.defineProperty(window, 'matchMedia', {
    value: vi.fn().mockReturnValue({ matches: standalone }),
    configurable: true,
    writable: true,
  })
}

afterEach(() => {
  removeNotification()
  removeServiceWorker()
  Object.defineProperty(window, 'matchMedia', { value: originalMatchMedia, configurable: true, writable: true })
})

/** The default fixture stack, one day past the day its window opens — the
 *  moment the visitor should be told about, computed from the model rather
 *  than hard-coded, so a change to the drying rate cannot quietly make this
 *  test assert about a date the model no longer picks. */
const READY_STACK = makeStack({ id: 'a' })
const READY_DAY = new Date(estimateWindow(READY_STACK, OSLO_NORMALS).earliest.getTime() + 24 * 60 * 60 * 1000)
const BEFORE_READY_DAY = new Date(estimateWindow(READY_STACK, OSLO_NORMALS).earliest.getTime() - 24 * 60 * 60 * 1000)

const oslo = (): ClimateNormals => OSLO_NORMALS
const noNormals = (): ClimateNormals | null => null

describe('findNewlyReady', () => {
  it('includes a stack whose window has opened and that has not been told about', () => {
    expect(findNewlyReady([READY_STACK], oslo, READY_DAY)).toEqual([READY_STACK])
  })

  it('excludes a stack whose window has not opened yet', () => {
    expect(findNewlyReady([READY_STACK], oslo, BEFORE_READY_DAY)).toEqual([])
  })

  it('excludes a stack the visitor has already been told about', () => {
    const told: Stack = { ...READY_STACK, notifiedReadyAt: '2027-01-01' }
    expect(findNewlyReady([told], oslo, READY_DAY)).toEqual([])
  })

  // No cached normals means no window at all — not a window that has opened.
  // Treating it as ready would tell the visitor their wood is dry on the
  // strength of nothing.
  it('excludes a stack with no cached normals rather than assuming it is ready', () => {
    expect(findNewlyReady([READY_STACK], noNormals, READY_DAY)).toEqual([])
  })

  /** The description's "never build a notification the app cannot honour":
   *  nothing is scheduled, so an edit that slows the drying simply moves the
   *  answer on the next check. `cover: 'none'` dries slower than `'roof'`. */
  it('holds the notification back when an edit pushes the window past today', () => {
    const uncovered = makeStack({ id: 'a', cover: 'none' })
    const dayAfterTheRoofedWindowOpened = new Date(
      estimateWindow(makeStack({ id: 'a', cover: 'roof' }), OSLO_NORMALS).earliest.getTime() + 24 * 60 * 60 * 1000,
    )
    expect(findNewlyReady([uncovered], oslo, dayAfterTheRoofedWindowOpened)).toEqual([])
  })
})

describe('canRequestNotifications', () => {
  beforeEach(() => {
    installNotification('default')
    installServiceWorker()
  })

  it('is true on Android and desktop, where an ordinary tab may ask', () => {
    setPlatform({ ios: false, standalone: false })
    expect(canRequestNotifications()).toBe(true)
  })

  // Safari only gives an iOS page the Notification API once it has been added
  // to the home screen. Asking there would fail in front of the visitor.
  it('is false on iOS until the app is installed', () => {
    setPlatform({ ios: true, standalone: false })
    expect(canRequestNotifications()).toBe(false)
  })

  it('is true on iOS once the app runs from the home screen', () => {
    setPlatform({ ios: true, standalone: true })
    expect(canRequestNotifications()).toBe(true)
  })

  it('is false where the browser has no Notification API at all', () => {
    setPlatform({ ios: false, standalone: false })
    removeNotification()
    expect(canRequestNotifications()).toBe(false)
  })

  it('is false where there is no service worker to show it', () => {
    setPlatform({ ios: false, standalone: false })
    removeServiceWorker()
    expect(canRequestNotifications()).toBe(false)
  })
})

describe('notifyReady', () => {
  it('shows the notification, tagged with the stack it is about', async () => {
    installNotification('granted')
    const showNotification = installServiceWorker()

    await notifyReady(READY_STACK, 'Bjørkestabelen kan være klar å fyre med nå.')

    expect(showNotification).toHaveBeenCalledTimes(1)
    const [title, options] = showNotification.mock.calls[0]
    expect(title).toBe('Woodstack')
    expect(options.body).toContain('Bjørkestabelen')
    // One notification per stack, not one per app open: the tag lets the
    // platform replace an earlier one rather than stack them up.
    expect(options.tag).toBe('a')
  })

  it('does nothing when the visitor has not granted permission', async () => {
    installNotification('denied')
    const showNotification = installServiceWorker()

    await notifyReady(READY_STACK, 'noe')

    expect(showNotification).not.toHaveBeenCalled()
  })

  /** The banner is the guaranteed channel and this one is the bonus. A browser
   *  without the API, or a registration that never arrives, may not take the
   *  render down with it. */
  it('resolves quietly where the Notification API does not exist', async () => {
    removeNotification()
    installServiceWorker()
    await expect(notifyReady(READY_STACK, 'noe')).resolves.toBeUndefined()
  })

  it('resolves quietly when the service worker registration rejects', async () => {
    installNotification('granted')
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { ready: Promise.reject(new Error('no registration')) },
      configurable: true,
      writable: true,
    })
    await expect(notifyReady(READY_STACK, 'noe')).resolves.toBeUndefined()
  })
})
