import { useCallback, useEffect, useState } from 'react'
import { Container, Stack } from '@mantine/core'
import type { NewStack, Stack as WoodStack } from './storage/schema'
import { readStackId, stackHash } from './storage/appState'
import { addStack, replaceStacks, useStacks } from './storage/stacksRepo'
import { getCachedNormals, getNormals } from './climate/normalsCache'
import { AppHeader } from './components/AppHeader'
import { StackList } from './components/StackList'
import { StackDetail } from './components/StackDetail'
import { AddStackForm } from './components/AddStackForm'
import { EditStackForm } from './components/EditStackForm'
import { InstallPrompt } from './components/InstallPrompt'
import { useImportOnLoad } from './storage/importOnLoad'
import { useTranslation } from './i18n/useTranslation'

/** Three screens and one hash. A router would be a dependency for something
 *  `location.hash` already does: `#s=<id>` opens a stack, and `#i=<payload>`
 *  is a share link that `useImportOnLoad` consumes and clears. */
export function App() {
  const { language } = useTranslation()
  const stacks = useStacks()
  const [selectedId, setSelectedId] = useState<string | null>(() => readStackId(window.location.hash))
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(false)

  useImportOnLoad(useCallback((imported: WoodStack[]) => replaceStacks(imported), []))

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
            onAdd={() => setAdding(true)}
          />
        )}
      </Stack>
    </Container>
  )
}
