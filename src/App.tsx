import { useCallback, useEffect, useState } from 'react'
import { Alert, Container, Stack } from '@mantine/core'
import type { NewStack, Stack as WoodStack } from './storage/schema'
import { readStackId, stackHash } from './storage/appState'
import { addStack, markStackReadyNotified, removeStack, replaceStacks, useStacks } from './storage/stacksRepo'
import { getCachedNormals, getNormals } from './climate/normalsCache'
import { AppHeader } from './components/AppHeader'
import { StackList } from './components/StackList'
import { StackDetail } from './components/StackDetail'
import { AddStackForm } from './components/AddStackForm'
import { EditStackForm } from './components/EditStackForm'
import { InstallPrompt } from './components/InstallPrompt'
import { findNewlyReady, notifyReady } from './notifications/readyNotifier'
import { useImportOnLoad } from './storage/importOnLoad'
import { useTranslation } from './i18n/useTranslation'

type Props = {
  /** The same seam `StackList` has: without it nothing here can be driven to a
   *  date, and "the stack became ready" is untestable. */
  today?: Date
}

/** Three screens and one hash. A router would be a dependency for something
 *  `location.hash` already does: `#s=<id>` opens a stack, and `#i=<payload>`
 *  is a share link that `useImportOnLoad` consumes and clears. */
export function App({ today = new Date() }: Props = {}) {
  const { language, t } = useTranslation()
  const stacks = useStacks()
  const [selectedId, setSelectedId] = useState<string | null>(() => readStackId(window.location.hash))
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(false)
  const [justReady, setJustReady] = useState<WoodStack[]>([])

  useImportOnLoad(useCallback((imported: WoodStack[]) => replaceStacks(imported), []))

  // Telling the visitor a stack has become ready, on the one occasion this
  // app is ever running: when they open it. `getCachedNormals` never fetches,
  // so this costs nothing and works offline — the same read `StackList`
  // already does on every render.
  //
  // Marking a stack notified writes through the repo, which fires the change
  // event `useStacks` listens for, so this effect runs a second time against
  // the updated stacks. That pass finds nothing — the flag is now set — so it
  // settles rather than loops. `justReady` is only appended to, so the reload
  // cannot take a banner off the screen the visitor is still reading.
  useEffect(() => {
    const newlyReady = findNewlyReady(
      stacks,
      (stack) => getCachedNormals(stack.location.latitude, stack.location.longitude),
      today,
    )
    if (newlyReady.length === 0) return

    newlyReady.forEach((stack) => {
      markStackReadyNotified(stack.id, today.toISOString().slice(0, 10))
      void notifyReady(stack, t('ready.body', { name: stack.name }))
    })
    // The rule's own carve-out: this effect exists to synchronise with two
    // external systems — the stored flag and the OS notification centre — and
    // this state is the record of what that sync did. There is nothing to
    // derive it from during render, because the write it just made is what
    // makes `findNewlyReady` stop returning these stacks.
    // eslint-disable-next-line react/set-state-in-effect
    setJustReady((current) => [...current, ...newlyReady])
  }, [stacks, t, today])

  // `index.html` ships `lang="nb"` for what a crawler or screen reader sees
  // before React mounts; this is the one place that can say which language
  // the visitor actually got.
  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  useEffect(() => {
    function sync() {
      setSelectedId(readStackId(window.location.hash))
    }
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  function select(id: string) {
    window.location.hash = stackHash(id)
    setSelectedId(id)
  }

  function back() {
    history.replaceState(null, '', window.location.pathname + window.location.search)
    setSelectedId(null)
    // Otherwise the next stack the visitor opens lands on the edit screen
    // unasked, because `editing` was left standing from the last one.
    setEditing(false)
  }

  function create(input: NewStack) {
    const created = addStack(input)
    // Fetching the normals now means the list has a window to show by the
    // time the visitor looks at it — and it is the only fetch this location
    // will ever cause.
    void getNormals(created.location.latitude, created.location.longitude).catch(() => undefined)
    setAdding(false)
  }

  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <AppHeader />

        <InstallPrompt />

        {/* Above the screen conditional on purpose: a stack that became ready
            is worth saying wherever the visitor happens to be standing, not
            only on the list. */}
        {justReady.map((stack) => (
          <Alert
            key={stack.id}
            color="teal"
            withCloseButton
            onClose={() => setJustReady((current) => current.filter((other) => other.id !== stack.id))}
          >
            {t('ready.body', { name: stack.name })}
          </Alert>
        ))}

        {selectedId && editing ? (
          <EditStackForm
            stackId={selectedId}
            onSave={() => setEditing(false)}
            onCancel={() => setEditing(false)}
          />
        ) : selectedId ? (
          <StackDetail stackId={selectedId} onBack={back} onEdit={() => setEditing(true)} />
        ) : adding ? (
          <AddStackForm onAdd={create} onCancel={() => setAdding(false)} />
        ) : (
          <StackList
            stacks={stacks}
            normalsFor={(stack) => getCachedNormals(stack.location.latitude, stack.location.longitude)}
            onSelect={select}
            onDelete={(id) => removeStack(id)}
            onAdd={() => setAdding(true)}
          />
        )}
      </Stack>
    </Container>
  )
}
