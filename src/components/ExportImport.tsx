import { useEffect, useRef, useState } from 'react'
import { Button, Group, Stack as MantineStack, Text } from '@mantine/core'
import type { Stack } from '../storage/schema'
import { buildShareLink, importState, readImportPayload } from '../storage/appState'

/** The only backup this app has. Everything is in the visitor's own browser,
 *  so the link is the way to move it to another device — or to get it back
 *  after Safari has cleared the storage. */

type Props = {
  stacks: Stack[]
  copyFn?: (text: string) => Promise<unknown>
}

export function ExportImport({ stacks, copyFn = (text) => navigator.clipboard.writeText(text) }: Props) {
  const [copied, setCopied] = useState(false)

  return (
    <MantineStack gap="xs">
      <Text size="sm" c="dimmed">
        Alt ligger bare i denne nettleseren. Safari sletter det etter 7 dager uten besøk – ta vare på lenken, så har du
        stablene igjen.
      </Text>
      <Group>
        <Button
          variant="default"
          onClick={() => {
            void Promise.resolve(copyFn(buildShareLink(stacks, window.location.href))).then(() => setCopied(true))
          }}
        >
          Kopier lenken min
        </Button>
        {copied && <Text size="sm">Kopiert.</Text>}
      </Group>
    </MantineStack>
  )
}

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
