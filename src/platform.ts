/** The two platform facts this app changes its offer on. They live here rather
 *  than inside one component because two components need the same answer:
 *  `InstallPrompt` asks whether to offer an install, `NotifyPrompt` whether the
 *  browser will even let it ask for a notification permission. */

export function isStandalone(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches
}

export function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}
