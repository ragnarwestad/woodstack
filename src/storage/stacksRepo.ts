import { useCallback, useEffect, useState } from 'react'
import {
  SCHEMA_VERSION,
  type AppState,
  type NewStack,
  type Reading,
  type Stack,
  type VolumeEntry,
} from './schema'

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

/** `initialVolume` is destructured out rather than spread along: it belongs to
 *  `NewStack`, not to `Stack`, and TypeScript's excess-property check does not
 *  fire through a spread — so spreading `input` would leave the field sitting
 *  on the stored object and travelling in every share link. What it holds
 *  becomes the ledger's first entry instead. */
export function addStack(input: NewStack): Stack {
  const { initialVolume, ...rest } = input
  const created: Stack = {
    ...rest,
    id: newId(),
    readings: [],
    volumeEntries: initialVolume
      ? [{ id: newId(), date: rest.stackedDate, kind: 'addition', ...initialVolume }]
      : [],
  }
  saveStacks([...loadStacks(), created])
  return created
}

export function removeStack(id: string): void {
  saveStacks(loadStacks().filter((stack) => stack.id !== id))
}

/** The five fields a stack can be changed on after the fact. `species` and
 *  `stackedDate` are deliberately absent: every reading was measured against
 *  the drying curve those two fix, so moving them would reinterpret history
 *  the visitor never re-measured. */
export type StackEdit = Pick<Stack, 'name' | 'splitSize' | 'cover' | 'exposure' | 'location'>

/** Overwrite those five and nothing else. Last-write-wins on the whole stored
 *  array, exactly like every other mutator here — a later sync layer has
 *  nothing extra to unwind. */
export function updateStack(id: string, edit: StackEdit): Stack | undefined {
  const stacks = loadStacks()
  const target = stacks.find((stack) => stack.id === id)
  if (!target) return undefined

  const updated: Stack = { ...target, ...edit }
  saveStacks(stacks.map((stack) => (stack.id === id ? updated : stack)))
  return updated
}

/** Records that the visitor has been told this stack's window has opened, so
 *  the check on the next app open does not tell them all over again. One
 *  direction only: nothing here ever clears the field. */
export function markStackReadyNotified(id: string, date: string): Stack | undefined {
  const stacks = loadStacks()
  const target = stacks.find((stack) => stack.id === id)
  if (!target) return undefined

  const updated: Stack = { ...target, notifiedReadyAt: date }
  saveStacks(stacks.map((stack) => (stack.id === id ? updated : stack)))
  return updated
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

/** Take a reading back out. Removal only filters — unlike `addReading` it
 *  needs no re-sort, since what is left was already in date order. */
export function removeReading(stackId: string, readingId: string): Stack | undefined {
  const stacks = loadStacks()
  const target = stacks.find((stack) => stack.id === stackId)
  if (!target) return undefined

  const updated: Stack = {
    ...target,
    readings: target.readings.filter((reading) => reading.id !== readingId),
  }
  saveStacks(stacks.map((stack) => (stack.id === stackId ? updated : stack)))
  return updated
}

/** Append a movement of wood in or out, keeping the ledger in date order the
 *  same way readings are kept. A stack stored before the ledger existed has no
 *  `volumeEntries` at all, and gets one here rather than being rejected. */
export function addVolumeEntry(stackId: string, entry: Omit<VolumeEntry, 'id'>): Stack | undefined {
  const stacks = loadStacks()
  const target = stacks.find((stack) => stack.id === stackId)
  if (!target) return undefined

  const updated: Stack = {
    ...target,
    volumeEntries: [...(target.volumeEntries ?? []), { ...entry, id: newId() }].sort((a, b) =>
      a.date.localeCompare(b.date),
    ),
  }
  saveStacks(stacks.map((stack) => (stack.id === stackId ? updated : stack)))
  return updated
}

/** Take a movement back out of the ledger. A stack from before the ledger
 *  existed comes back with an empty one rather than none at all — the same
 *  answer `addVolumeEntry` gives it. */
export function removeVolumeEntry(stackId: string, entryId: string): Stack | undefined {
  const stacks = loadStacks()
  const target = stacks.find((stack) => stack.id === stackId)
  if (!target) return undefined

  const updated: Stack = {
    ...target,
    volumeEntries: (target.volumeEntries ?? []).filter((entry) => entry.id !== entryId),
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
