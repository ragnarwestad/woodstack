import type { ActualWeather, ClimateNormals, MonthlyNormal } from '../storage/schema'
import type { Language } from '../i18n/language'

/** Open-Meteo, used for two things and nothing else: turning a place name
 *  into coordinates, and fetching enough years of daily weather to reduce to
 *  monthly normals. Both field names below were confirmed against the live
 *  API (2026-08-22): the archive endpoint serves `temperature_2m_mean` and
 *  `relative_humidity_2m_mean` as daily aggregates, so nothing has to be
 *  reduced from hourly data. No API key is needed at one call per location. */

/** The one outside service this app ever talks to. Named once, here beside the
 *  calls themselves, so the About dialog's promise about it and the test that
 *  guards that promise read the same string as the code that makes the call. */
export const SERVICE_NAME = 'Open-Meteo'

const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive'
const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search'

/** Long enough for year-to-year weather to average out, short enough that the
 *  response stays small. */
const NORMALS_YEARS = 5

export type ArchiveDaily = {
  time: string[]
  temperature_2m_mean: number[]
  relative_humidity_2m_mean: number[]
}

export type GeocodeResult = {
  name: string
  latitude: number
  longitude: number
  country?: string
  admin1?: string
}

type FetchLike = (url: string) => Promise<{ ok: boolean; status?: number; json: () => Promise<unknown> }>

export type OpenMeteoDeps = {
  fetchFn?: FetchLike
}

function defaultFetch(): FetchLike {
  return (url) => fetch(url)
}

export function buildArchiveUrl(
  latitude: number,
  longitude: number,
  range: { startDate: string; endDate: string },
): string {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    start_date: range.startDate,
    end_date: range.endDate,
    daily: 'temperature_2m_mean,relative_humidity_2m_mean',
    timezone: 'UTC',
  })
  return `${ARCHIVE_URL}?${params}`
}

/** The most recent whole calendar years, so no partial year skews a month. */
export function defaultRange(today: Date): { startDate: string; endDate: string } {
  const lastCompleteYear = today.getUTCFullYear() - 1
  return {
    startDate: `${lastCompleteYear - NORMALS_YEARS + 1}-01-01`,
    endDate: `${lastCompleteYear}-12-31`,
  }
}

type MonthSum = { t: number; tn: number; h: number; hn: number }

/** Days into twelve buckets, one per calendar month, keeping the count so a
 *  bucket that got nothing can be told from one that averaged to zero. */
function sumDailyByMonth(daily: ArchiveDaily): MonthSum[] {
  const sums: MonthSum[] = Array.from({ length: 12 }, () => ({ t: 0, tn: 0, h: 0, hn: 0 }))

  daily.time.forEach((day, index) => {
    const month = Number(day.slice(5, 7)) - 1
    if (!(month >= 0 && month < 12)) return
    const temperature = daily.temperature_2m_mean?.[index]
    const humidity = daily.relative_humidity_2m_mean?.[index]
    if (Number.isFinite(temperature)) {
      sums[month].t += temperature
      sums[month].tn += 1
    }
    if (Number.isFinite(humidity)) {
      sums[month].h += humidity
      sums[month].hn += 1
    }
  })

  return sums
}

/** Daily values in, twelve monthly means out — January first.
 *
 *  This is the seam the rest of the app sits behind: whatever shape the
 *  archive API serves, everything downstream sees twelve numbers per
 *  quantity. */
export function reduceToMonthlyNormals(daily: ArchiveDaily): MonthlyNormal[] {
  return sumDailyByMonth(daily).map((sum, month) => {
    if (!sum.tn || !sum.hn) {
      throw new Error(`Klimadata mangler for måned ${month + 1}`)
    }
    return { temperature: sum.t / sum.tn, humidity: sum.h / sum.hn }
  })
}

/** Like `reduceToMonthlyNormals`, but for a single year that is still in
 *  progress: a month with no data is `null`, never a thrown error — most of
 *  the year has not happened yet. */
export function reduceToPartialMonthly(daily: ArchiveDaily): (MonthlyNormal | null)[] {
  return sumDailyByMonth(daily).map((sum) =>
    sum.tn && sum.hn ? { temperature: sum.t / sum.tn, humidity: sum.h / sum.hn } : null,
  )
}

/** Archive data lags the present by about this long before Open-Meteo has
 *  ingested it; asking past that returns a response with holes. */
const ARCHIVE_LAG_DAYS = 5
const DAY_MS = 24 * 60 * 60 * 1000

/** The latest month (0-indexed) of `today`'s year whose data is safe to
 *  request: the month has to have fully ended, and that end has to already be
 *  older than the archive's ingestion lag. `null` for every day of January
 *  (no month of this year has ended yet) and for the first four days of
 *  February (January's end has not cleared the lag either) — 5 February is
 *  the earliest date this ever returns a month. */
export function lastSafeMonth(today: Date): number | null {
  const year = today.getUTCFullYear()
  for (let month = today.getUTCMonth() - 1; month >= 0; month--) {
    const endOfMonth = new Date(Date.UTC(year, month + 1, 0))
    if (endOfMonth.getTime() + ARCHIVE_LAG_DAYS * DAY_MS <= today.getTime()) return month
  }
  return null
}

/** 1 January through the end of the last safe month, or `null` when nothing
 *  this year clears the lag yet. */
export function actualWeatherRange(
  today: Date,
): { startDate: string; endDate: string; year: number } | null {
  const month = lastSafeMonth(today)
  if (month === null) return null

  const year = today.getUTCFullYear()
  const endDate = new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10)
  return { startDate: `${year}-01-01`, endDate, year }
}

export async function fetchMonthlyNormals(
  latitude: number,
  longitude: number,
  deps: OpenMeteoDeps & { today?: Date } = {},
): Promise<ClimateNormals> {
  const fetchFn = deps.fetchFn ?? defaultFetch()
  const response = await fetchFn(buildArchiveUrl(latitude, longitude, defaultRange(deps.today ?? new Date())))
  if (!response.ok) {
    throw new Error(`Klimadata kunne ikke hentes (${response.status ?? 'ukjent feil'})`)
  }

  const body = (await response.json()) as { daily?: ArchiveDaily }
  if (!body.daily?.time?.length) {
    throw new Error('Klimadata kom tomt tilbake')
  }

  return {
    latitude,
    longitude,
    monthly: reduceToMonthlyNormals(body.daily),
    fetchedAt: new Date().toISOString(),
  }
}

/** This year so far, for correcting the normals-based projection. `null`
 *  when no month of this year is safe to ask for yet — a January visitor
 *  simply gets the uncorrected estimate, not an error. */
export async function fetchActualWeather(
  latitude: number,
  longitude: number,
  deps: OpenMeteoDeps & { today?: Date } = {},
): Promise<ActualWeather | null> {
  const range = actualWeatherRange(deps.today ?? new Date())
  if (!range) return null

  const fetchFn = deps.fetchFn ?? defaultFetch()
  const response = await fetchFn(buildArchiveUrl(latitude, longitude, range))
  if (!response.ok) {
    throw new Error(`Klimadata kunne ikke hentes (${response.status ?? 'ukjent feil'})`)
  }

  const body = (await response.json()) as { daily?: ArchiveDaily }
  if (!body.daily?.time?.length) {
    throw new Error('Klimadata kom tomt tilbake')
  }

  return {
    latitude,
    longitude,
    year: range.year,
    monthly: reduceToPartialMonthly(body.daily),
    fetchedAt: new Date().toISOString(),
  }
}

/** `language` decides what the API calls the places it finds. It follows the
 *  app's language rather than being fixed, or an English visitor searches in
 *  Norwegian. Open-Meteo does not have every name in every language and falls
 *  back to English per field, which is why the caller shows the place name and
 *  the country but not the region. */
export async function geocode(
  query: string,
  deps: OpenMeteoDeps = {},
  language: Language = 'nb',
): Promise<GeocodeResult[]> {
  const fetchFn = deps.fetchFn ?? defaultFetch()
  const params = new URLSearchParams({ name: query, count: '5', language, format: 'json' })
  const response = await fetchFn(`${GEOCODING_URL}?${params}`)
  if (!response.ok) {
    throw new Error('Stedssøket svarte ikke')
  }

  const body = (await response.json()) as { results?: GeocodeResult[] }
  return (body.results ?? []).map(({ name, latitude, longitude, country, admin1 }) => ({
    name,
    latitude,
    longitude,
    country,
    admin1,
  }))
}
