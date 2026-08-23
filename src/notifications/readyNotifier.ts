import type { ClimateNormals, Stack } from '../storage/schema'
import { estimateWindow, hasEnteredWindow } from '../model/simulate'
import { isIos, isStandalone } from '../platform'

/** Telling the visitor their wood is ready, without a server.
 *
 *  Nothing is ever scheduled. The ready window is recomputed from the stack's
 *  current fields every time the app opens, so an edit or a new reading moves
 *  the answer with it — there is no queued message left pointing at a date the
 *  app has stopped believing in. What persists is one flag per stack,
 *  `notifiedReadyAt`, so the visitor is told once rather than every open.
 *
 *  The price of that is honest and stated: a visitor who never opens the app
 *  again is never told. Reaching them would need a push service and a server
 *  to hold the subscription, which this app deliberately does not have. */

/** The stacks whose window has opened and that the visitor has not been told
 *  about yet. Reads cached normals only — never a fetch — which is what makes
 *  this safe to run on every app open, offline included. A stack with no
 *  normals cached has no window at all, and "no window" is not "ready". */
export function findNewlyReady(
  stacks: Stack[],
  normalsFor: (stack: Stack) => ClimateNormals | null,
  today: Date,
): Stack[] {
  return stacks.filter((stack) => {
    if (stack.notifiedReadyAt) return false
    const normals = normalsFor(stack)
    return normals !== null && hasEnteredWindow(estimateWindow(stack, normals), today)
  })
}

/** iOS hands the Notification API to a page only once it has been added to the
 *  home screen; everywhere else that has the API, an ordinary tab may ask.
 *  Asking where the answer cannot be honoured spends the one chance the app
 *  gets on a dialog that leads nowhere. */
export function canRequestNotifications(): boolean {
  return typeof Notification !== 'undefined' && 'serviceWorker' in navigator && (!isIos() || isStandalone())
}

/** Best effort, on purpose. A missing API, a permission the visitor never
 *  granted, or a registration that never arrives all leave them no worse off:
 *  the in-app banner has already told them, and that one needs no permission
 *  from anybody. */
export async function notifyReady(stack: Stack, body: string): Promise<void> {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  try {
    const registration = await navigator.serviceWorker.ready
    // Tagged with the stack id so a second notification about the same stack
    // replaces the first instead of piling up beside it.
    await registration.showNotification('Woodstack', { body, tag: stack.id, icon: '/pwa-192x192.png' })
  } catch {
    // Nothing to recover: this is the bonus channel, not the guaranteed one.
  }
}
