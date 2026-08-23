import type { ActualWeather } from '../storage/schema'
import { fetchActualWeather } from './openMeteo'
import { locationKey } from './normalsCache'

/** One Open-Meteo call per location per calendar day.
 *
 *  The opposite lifetime from `normalsCache.ts`: normals never move, so they
 *  are fetched once and kept forever, while this year keeps happening and has
 *  to be asked for again. A day is the finest refresh worth making — the
 *  archive only ever gains whole months. */

const STORAGE_KEY = 'woodstack.actualWeather.v1'

type CacheFile = Record<string, ActualWeather>

/** Fetches already under way, so two stacks in the same place still make one
 *  call. Not a value cache — that is what `localStorage` is. */
const inFlight = new Map<string, Promise<ActualWeather | null>>()

function readFile(): CacheFile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : null
    return parsed && typeof parsed === 'object' ? (parsed as CacheFile) : {}
  } catch {
    return {}
  }
}

function writeCachedActualWeather(entry: ActualWeather): void {
  const file = readFile()
  // One key per location, overwritten in place: a daily refresh must not make
  // the cache grow by a day's worth of entries every day.
  file[locationKey(entry.latitude, entry.longitude)] = entry
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(file))
  } catch {
    // Best-effort, same as normalsCache.ts: the fetched value still reaches
    // the caller even if the write does not stick.
  }
}

export function getCachedActualWeather(latitude: number, longitude: number): ActualWeather | null {
  return readFile()[locationKey(latitude, longitude)] ?? null
}

export function clearActualWeatherCache(): void {
  inFlight.clear()
  localStorage.removeItem(STORAGE_KEY)
}

function isStale(entry: ActualWeather, today: Date): boolean {
  return (
    entry.year !== today.getUTCFullYear() ||
    entry.fetchedAt.slice(0, 10) !== today.toISOString().slice(0, 10)
  )
}

export type ActualWeatherDeps = {
  fetchActual?: (latitude: number, longitude: number) => Promise<ActualWeather | null>
}

/** This year's weather for a location, refetched once a day.
 *
 *  A failed refetch falls back to the entry already cached rather than to
 *  nothing: a day-old correction is still closer to true than no correction,
 *  and the screen must not lose a number it was already showing just because
 *  the visitor went offline. */
export async function getActualWeather(
  latitude: number,
  longitude: number,
  deps: ActualWeatherDeps = {},
  today: Date = new Date(),
): Promise<ActualWeather | null> {
  const cached = getCachedActualWeather(latitude, longitude)
  if (cached && !isStale(cached, today)) return cached

  const key = locationKey(latitude, longitude)
  const pending = inFlight.get(key)
  if (pending) return pending

  const fetchActual = deps.fetchActual ?? ((lat, lon) => fetchActualWeather(lat, lon))
  const request = fetchActual(latitude, longitude)
    .then((result) => {
      // Nothing this year is safe to ask for yet: that is an answer, not a
      // failure, and it leaves whatever was cached alone.
      if (!result) return cached
      // Store under the coordinates that were asked for, so the rounded key
      // matches on the way back out; the API answers with its own grid point.
      // `fetchedAt` is stamped here, off the same clock the staleness check
      // reads, rather than taken from the fetcher: this module owns how often
      // to ask, and a stamp it does not control could defeat that.
      const stamped = { ...result, latitude, longitude, fetchedAt: today.toISOString() }
      writeCachedActualWeather(stamped)
      return stamped
    })
    .catch(() => cached)
    .finally(() => {
      inFlight.delete(key)
    })

  inFlight.set(key, request)
  return request
}
