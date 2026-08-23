/** The shapes that live in the visitor's browser and travel in a share link.
 *
 *  Every moisture number in this file — and everywhere downstream of it — is
 *  a DRY-BASIS percentage: water weight as a share of the oven-dry wood
 *  weight. Pin meters read this basis and the "under 20 %" rule of thumb
 *  refers to it. The two bases differ enough to matter (fresh birch is 45 %
 *  wet basis and 75 % dry basis), so there is exactly one basis in this app
 *  and it is named in the UI by `formatMoisture` in `src/model/units.ts`. */

/** Bumped when a stored payload can no longer be read as it stands. Anything
 *  written by a newer version is refused rather than half-understood. */
export const SCHEMA_VERSION = 1

export const SPECIES_IDS = ['bjork', 'or', 'osp', 'furu', 'gran', 'eik', 'bok'] as const
export type Species = (typeof SPECIES_IDS)[number]

/** How much of the pile the second species is, roughly — the first species
 *  (`Stack.species`) implicitly makes up the rest. Coarse on purpose: a
 *  felling gives a visitor "mostly birch, some spruce", never a percentage. */
export const SPECIES_SHARES = ['half', 'third', 'bit'] as const
export type SpeciesShare = (typeof SPECIES_SHARES)[number]

export const SPLIT_SIZES = ['small', 'medium', 'large'] as const
export type SplitSize = (typeof SPLIT_SIZES)[number]

/** `none` — open to the sky. `roof` — top covered, sides open. `shed` —
 *  a closed woodshed, dry but with less airflow than an open-sided roof. */
export const COVERS = ['none', 'roof', 'shed'] as const
export type Cover = (typeof COVERS)[number]

export const EXPOSURES = ['sheltered', 'normal', 'exposed'] as const
export type Exposure = (typeof EXPOSURES)[number]

export type StackLocation = {
  name: string
  latitude: number
  longitude: number
}

export type Reading = {
  id: string
  /** ISO calendar date, `YYYY-MM-DD`. */
  date: string
  /** Dry basis, %. */
  moisture: number
}

/** The units firewood is actually traded in here, as offered when logging a
 *  NEW entry. `fastKubikk` is solid wood with no air in it; everything else is
 *  a stack, a pile or a sack, so a declared litre of it is only partly wood.
 *  `sekk40`/`sekk60`/`sekk80` are sack sizes; `cord` is the North American
 *  one, along for the ride because the table it comes from lists it.
 *
 *  `'stablet'` is deliberately absent: it split into `stablet60`/`stablet30`
 *  (see `VolumeUnit` below), because 30 cm splits stack tighter than 60 cm
 *  ones and firewood is sold in both lengths here. */
export const VOLUME_UNITS = [
  'fastKubikk',
  'stablet60',
  'stablet30',
  'losKubikk',
  'favn',
  'storsekk',
  'sekk40',
  'sekk60',
  'sekk80',
  'storfavn',
  'cord',
] as const

/** `'stablet'` is not in `VOLUME_UNITS` — a new entry can no longer be logged
 *  in it — but a stack stacked before that split still has ledger entries
 *  stored in it, and those must keep converting to the same solid volume they
 *  always did (see `VOLUME_UNIT_INFO` in `model/volume.ts`).
 *
 *  No `SCHEMA_VERSION` bump for this: the guard in `stacksRepo.ts` empties the
 *  store for any version it does not recognise, so widening the type is the
 *  only change here that cannot lose a real visitor's stacks. */
export type VolumeUnit = (typeof VOLUME_UNITS)[number] | 'stablet'

export const VOLUME_ENTRY_KINDS = ['addition', 'withdrawal'] as const
export type VolumeEntryKind = (typeof VOLUME_ENTRY_KINDS)[number]

/** One movement of wood in or out of a stack. A ledger rather than a single
 *  number, because "how much is left" is the question a woodpile gets asked in
 *  February, and that needs the withdrawals too. */
export type VolumeEntry = {
  id: string
  /** ISO calendar date, `YYYY-MM-DD`. */
  date: string
  kind: VolumeEntryKind
  amount: number
  unit: VolumeUnit
}

export type Stack = {
  id: string
  name: string
  species: Species
  /** A second species mixed into the same pile, roughly `share` of it — the
   *  rest is `species`. Absent on a pure stack, which is every stack made
   *  before this field existed and most made after: nobody is required to
   *  record a mix they do not have. Set once, at creation, like `species`
   *  itself — see `EditStackForm`'s reasoning for why species is not
   *  editable after the fact. */
  secondSpecies?: { species: Species; share: SpeciesShare }
  /** ISO calendar date, `YYYY-MM-DD`. */
  stackedDate: string
  splitSize: SplitSize
  cover: Cover
  exposure: Exposure
  location: StackLocation
  readings: Reading[]
  /** Absent on a stack written before this field existed — that reads as "no
   *  volume logged", never as zero. Optional rather than a `SCHEMA_VERSION`
   *  bump: the version guard in `stacksRepo.ts` returns an empty list for any
   *  version it does not recognise, so bumping it would delete every stored
   *  stack instead of migrating it. */
  volumeEntries?: VolumeEntry[]
  /** ISO calendar date the visitor was told this stack had entered its ready
   *  window. Absent until then, set once, never cleared — a stack stored
   *  before this field existed reads as "not told yet", the same way an absent
   *  `volumeEntries` reads as "nothing logged", and for the same reason: the
   *  version guard would have emptied every browser instead of migrating it. */
  notifiedReadyAt?: string
  /** One photo of the stack, as a resized JPEG data URL — absent when none has
   *  been taken, never an empty string. Optional for the same reason
   *  `volumeEntries` is: a `SCHEMA_VERSION` bump would empty every stored
   *  browser instead of migrating it. Resized before it is stored, because
   *  everything here shares one ~5 MB `localStorage` quota and travels whole in
   *  every share link. */
  photo?: string
}

/** Everything needed to create a stack; the id and the empty reading list are
 *  the repository's business. `initialVolume` is the amount already stacked
 *  when the visitor first writes the stack down; the repository turns it into
 *  the ledger's first entry rather than storing it as a field of its own. */
export type NewStack = Omit<Stack, 'id' | 'readings' | 'volumeEntries'> & {
  initialVolume?: { amount: number; unit: VolumeUnit }
}

export type MonthlyNormal = {
  /** Mean daily air temperature, °C. */
  temperature: number
  /** Mean daily relative humidity, %. */
  humidity: number
}

/** Climate normals, not live weather: firewood dries over 6-24 months, so
 *  actual weather converges to the normal over that span. Fetched once per
 *  location, then the app works offline forever. */
export type ClimateNormals = {
  latitude: number
  longitude: number
  /** Twelve entries, index 0 is January. */
  monthly: MonthlyNormal[]
  /** ISO timestamp of the fetch, so a future version can refresh stale data. */
  fetchedAt: string
}

/** This year's actual weather, reduced the same way as `ClimateNormals` but
 *  scoped to one calendar year and only as far as it has actually happened.
 *  A `null` month is one not yet elapsed, or not yet fetched — never a zero.
 *  `year` is what gates every use of this against `ClimateNormals`' year-less
 *  monthly cycle, so a projection that runs into next year falls back to the
 *  normals rather than re-living this summer (see `model/simulate.ts`). */
export type ActualWeather = {
  latitude: number
  longitude: number
  year: number
  /** Twelve entries, index 0 is January; `null` where there is no data. */
  monthly: (MonthlyNormal | null)[]
  /** ISO timestamp of the fetch. Unlike normals, this goes stale daily. */
  fetchedAt: string
}

/** The window a stack is expected to become dry enough to burn in. Two dates,
 *  never one: a single date is a promise the model cannot keep. */
export type DryWindow = {
  earliest: Date
  latest: Date
}

/** The whole persisted state, and the payload a share link carries. */
export type AppState = {
  version: number
  stacks: Stack[]
}
