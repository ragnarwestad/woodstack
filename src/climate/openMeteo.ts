import type { ClimateNormals, MonthlyNormal } from '../storage/schema'

/** Open-Meteo, used for two things and nothing else: turning a place name
 *  into coordinates, and fetching enough years of daily weather to reduce to
 *  monthly normals. Both field names below were confirmed against the live
 *  API (2026-08-22): the archive endpoint serves `temperature_2m_mean` and
 *  `relative_humidity_2m_mean` as daily aggregates, so nothing has to be
 *  reduced from hourly data. No API key is needed at one call per location. */

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

/** Daily values in, twelve monthly means out — January first.
 *
 *  This is the seam the rest of the app sits behind: whatever shape the
 *  archive API serves, everything downstream sees twelve numbers per
 *  quantity. */
export function reduceToMonthlyNormals(daily: ArchiveDaily): MonthlyNormal[] {
  const sums = Array.from({ length: 12 }, () => ({ t: 0, tn: 0, h: 0, hn: 0 }))

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

  return sums.map((sum, month) => {
    if (!sum.tn || !sum.hn) {
      throw new Error(`Klimadata mangler for måned ${month + 1}`)
    }
    return { temperature: sum.t / sum.tn, humidity: sum.h / sum.hn }
  })
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

export async function geocode(query: string, deps: OpenMeteoDeps = {}): Promise<GeocodeResult[]> {
  const fetchFn = deps.fetchFn ?? defaultFetch()
  const params = new URLSearchParams({ name: query, count: '5', language: 'nb', format: 'json' })
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
