import { useCallback, useEffect, useState } from 'react'
import { SCHEMA_VERSION, type AppState, type NewStack, type Reading, type Stack } from './schema'

/** The visitor's stacks, in their own browser and nowhere else.
 *
 *  `localStorage` rather than IndexedDB: this is a handful of records with a
 *  short reading history each, and a synchronous API needs no async plumbing
 *  for that. Safari evicts it after seven dormant days unless the app is
 *  installed, which is what `InstallPrompt` and the share link are for. */

const STORAGE_KEY = 'woodstack.state.v1'

/** Browsers announce another tab's writes with this event; the app also fires
 *  it at itself so the current tab re-reads after its own change. */
const CHANGED_EVENT = 'woodstack:stacks-changed'

function newId(): string {
  return crypto.randomUUID()
}

export function loadStacks(): Stack[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as AppState
    // A payload from a later version may mean something else entirely.
    // Reading it as if it were this version is worse than ignoring it.
    if (parsed?.version !== SCHEMA_VERSION || !Array.isArray(parsed.stacks)) return []
    return parsed.stacks
  } catch {
    return []
  }
}

export function saveStacks(stacks: Stack[]): void {
  const state: AppState = { version: SCHEMA_VERSION, stacks }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  window.dispatchEvent(new Event(CHANGED_EVENT))
}

export function getStack(id: string): Stack | undefined {
  return loadStacks().find((stack) => stack.id === id)
}

export function addStack(input: NewStack): Stack {
  const created: Stack = { ...input, id: newId(), readings: [] }
  saveStacks([...loadStacks(), created])
  return created
}

export function removeStack(id: string): void {
  saveStacks(loadStacks().filter((stack) => stack.id !== id))
}

/** Swap the whole set — what importing a share link does. */
export function replaceStacks(stacks: Stack[]): void {
  saveStacks(stacks)
}

/** Append a reading, keeping the list in date order so the newest one is the
 *  last, whatever order they were entered in. */
export function addReading(stackId: string, reading: Omit<Reading, 'id'>): Stack | undefined {
  const stacks = loadStacks()
  const target = stacks.find((stack) => stack.id === stackId)
  if (!target) return undefined

  const updated: Stack = {
    ...target,
    readings: [...target.readings, { ...reading, id: newId() }].sort((a, b) => a.date.localeCompare(b.date)),
  }
  saveStacks(stacks.map((stack) => (stack.id === stackId ? updated : stack)))
  return updated
}

/** The stacks, kept in step with whatever writes them — this tab or another. */
export function useStacks(): Stack[] {
  const [stacks, setStacks] = useState<Stack[]>(loadStacks)

  const reload = useCallback(() => {
    setStacks(loadStacks())
  }, [])

  useEffect(() => {
    window.addEventListener(CHANGED_EVENT, reload)
    window.addEventListener('storage', reload)
    return () => {
      window.removeEventListener(CHANGED_EVENT, reload)
      window.removeEventListener('storage', reload)
    }
  }, [reload])

  return stacks
}
