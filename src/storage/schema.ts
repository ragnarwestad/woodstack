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

export type Stack = {
  id: string
  name: string
  species: Species
  /** ISO calendar date, `YYYY-MM-DD`. */
  stackedDate: string
  splitSize: SplitSize
  cover: Cover
  exposure: Exposure
  location: StackLocation
  readings: Reading[]
}

/** Everything needed to create a stack; the id and the empty reading list are
 *  the repository's business. */
export type NewStack = Omit<Stack, 'id' | 'readings'>

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
