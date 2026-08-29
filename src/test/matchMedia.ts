import { vi } from 'vitest'

/** happy-dom has no layout engine, so a narrow-screen branch driven by
 *  `useMediaQuery` cannot be reached by resizing anything in a test —
 *  `window.matchMedia` does not exist here at all, and the hook falls back to
 *  `false` unless a test stands one up itself. This is that stand-in: it
 *  matches every query, so it is only for a test that wants the narrow
 *  branch specifically. Every other test runs with the real absence of
 *  `matchMedia` and so exercises the wide-screen branch, same as before this
 *  hook existed anywhere in the app.
 *
 *  Call `vi.unstubAllGlobals()` in an `afterEach` to remove it again — this
 *  function only installs the stub, once per test that needs it. */
export function mockNarrowViewport(): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: true,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    })),
  )
}
