import { useEffect, useRef } from 'react'
import type { Stack } from './schema'
import { importState, readImportPayload } from './appState'

/** Consume an `#i=` share payload once, then take it out of the URL so a
 *  reload does not import it again — and so it can never be mistaken for the
 *  `#s=` hash the app routes on. */
export function useImportOnLoad(onImport: (stacks: Stack[]) => void): void {
  const done = useRef(false)

  useEffect(() => {
    if (done.current) return
    done.current = true

    const payload = readImportPayload(window.location.hash)
    if (payload === null) return

    try {
      onImport(importState(payload))
    } catch {
      // A link that cannot be read is worth clearing all the same: leaving it
      // in the URL would retry the same failure on every reload.
    }
    clearHash()
  }, [onImport])
}

function clearHash(): void {
  history.replaceState(null, '', window.location.pathname + window.location.search)
}
