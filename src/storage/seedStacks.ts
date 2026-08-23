import { useEffect, useReducer, useRef } from 'react'
import type { NewStack, Stack } from './schema'
import { addStack, hasStoredState } from './stacksRepo'
import { getNormals } from '../climate/normalsCache'
import { addMonths } from '../model/simulate'

/** Three stacks to look at, the first time the app is ever opened.
 *
 *  Everything this app can do — the drying curve, the ready window, the ring,
 *  the inverted card, a mixed pile — is invisible behind "Ingen vedstabler
 *  ennå", and a visitor cannot wait a season to find out whether the app is
 *  any good. These are the three the Woodstack '26 design was drawn against:
 *  one ready, one well along, one just started. */

/** Which stacks the app put there itself, so the list can say so. A key of
 *  its own rather than a field on `Stack`: `normalsCache.ts` already keeps
 *  its data beside the stacks this way, and a `SCHEMA_VERSION` bump would
 *  empty every stored browser instead of migrating it. */
const EXAMPLES_KEY = 'woodstack.examples.v1'

/** The one place the design names, for all three. Written down rather than
 *  looked up: a geocoding call on first load is one more thing to fail. */
const LILLEHAMMER = { name: 'Lillehammer', latitude: 61.1153, longitude: 10.4662 }

/** What `AddStackForm` starts every field on that the design does not name.
 *  Repeated here rather than imported: the form has no reason to export its
 *  own initial state for one caller. Keep the two in step by hand if the
 *  form's defaults ever change. */
const DEFAULT_SPLIT_SIZE = 'medium'
const DEFAULT_COVER = 'roof'
const DEFAULT_EXPOSURE = 'normal'

function monthsAgo(today: Date, months: number): string {
  return addMonths(today, -months).toISOString().slice(0, 10)
}

/** The three examples, dated from `today` rather than written down: fixed
 *  dates are right for one year and useless in the next, when all three would
 *  read 100 % and the set would demonstrate nothing. The spread across the
 *  three is the point, not the exact months — `seedStacks.test.ts` is what
 *  holds the spread in place. */
export function buildExampleStacks(today: Date): NewStack[] {
  const shared = {
    splitSize: DEFAULT_SPLIT_SIZE,
    cover: DEFAULT_COVER,
    exposure: DEFAULT_EXPOSURE,
    location: LILLEHAMMER,
  } as const

  return [
    { name: 'Granveden i skjulet', species: 'gran', stackedDate: monthsAgo(today, 16), ...shared },
    { name: 'Bjørkestabelen ved uthuset', species: 'bjork', stackedDate: monthsAgo(today, 4), ...shared },
    {
      name: 'Blandingen bak garasjen',
      species: 'bjork',
      secondSpecies: { species: 'or', share: 'third' },
      stackedDate: monthsAgo(today, 1),
      ...shared,
    },
  ]
}

function readExampleIds(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(EXAMPLES_KEY) ?? 'null') as unknown
    return Array.isArray(parsed) ? (parsed as string[]) : []
  } catch {
    return []
  }
}

/** Whether the app put this stack there itself — for the label the list
 *  shows, so three stacks nobody entered cannot pass for the visitor's own
 *  under a heading that says "Vedstablene mine". */
export function isExampleStack(stack: Pick<Stack, 'id'>): boolean {
  return readExampleIds().includes(stack.id)
}

/** Seeds the three examples the first time this browser holds any state at
 *  all — never again, including after the visitor deletes all three:
 *  `hasStoredState()` is true from the moment the first `addStack` below
 *  writes, so a later empty list reads as "emptied on purpose" rather than
 *  "never seeded".
 *
 *  Resolves once the climate normals have settled, which is the moment the
 *  list has something new to draw: `writeCachedNormals` fires no event, so
 *  nothing re-renders on its own and the three rows would otherwise sit on
 *  "Henter klimadata …" until the next reload. `false` means there was
 *  nothing to seed and nothing to look at again. */
export async function seedExamplesIfEmpty(today: Date): Promise<boolean> {
  if (hasStoredState()) return false

  const created = buildExampleStacks(today).map((example) => addStack(example))
  localStorage.setItem(EXAMPLES_KEY, JSON.stringify(created.map((stack) => stack.id)))

  // One request in practice, not three: all three share Lillehammer's
  // coordinates, and `getNormals` de-duplicates calls in flight for the same
  // rounded location. A visitor with no connection gets the same
  // "Henter klimadata …" any freshly added stack shows until it resolves.
  await Promise.all(
    created.map((stack) =>
      getNormals(stack.location.latitude, stack.location.longitude).catch(() => undefined),
    ),
  )
  return true
}

/** Runs the seeding once per app load, in the shape `useImportOnLoad` already
 *  set: a ref guard so a re-render never repeats it, reading storage directly
 *  rather than through React state.
 *
 *  Call it AFTER `useImportOnLoad`. On a brand-new browser opened through a
 *  share link, that hook's synchronous write has then already made
 *  `hasStoredState()` true, so the imported stack cannot arrive alongside
 *  three examples the visitor never heard of. */
export function useSeedExamplesOnLoad(today: Date): void {
  const done = useRef(false)
  const [, redraw] = useReducer((count: number) => count + 1, 0)

  useEffect(() => {
    if (done.current) return
    done.current = true

    void seedExamplesIfEmpty(today).then((seeded) => {
      if (seeded) redraw()
    })
  }, [today])
}
