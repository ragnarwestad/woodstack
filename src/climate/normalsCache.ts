import type { ClimateNormals } from '../storage/schema'
import { fetchMonthlyNormals } from './openMeteo'

/** One Open-Meteo call per location, ever.
 *
 *  Firewood dries over months, so there is no reason to ask twice: the
 *  normals for a place do not move, and once they are in `localStorage` the
 *  app works offline forever. */

const STORAGE_KEY = 'woodstack.normals.v1'

/** A tenth of a degree is roughly 11 km north-south — far finer than the
 *  climate varies, so a stack and its neighbour share one entry and one
 *  fetch. */
const KEY_PRECISION = 1

type CacheFile = Record<string, ClimateNormals>

/** Fetches already under way, so two stacks created at once in the same place
 *  still make one call. Not a value cache — that is what `localStorage` is. */
const inFlight = new Map<string, Promise<ClimateNormals>>()

export function locationKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(KEY_PRECISION)},${longitude.toFixed(KEY_PRECISION)}`
}

function readFile(): CacheFile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : null
    return parsed && typeof parsed === 'object' ? (parsed as CacheFile) : {}
  } catch {
    return {}
  }
}

export function getCachedNormals(latitude: number, longitude: number): ClimateNormals | null {
  return readFile()[locationKey(latitude, longitude)] ?? null
}

export function writeCachedNormals(normals: ClimateNormals): void {
  const file = readFile()
  file[locationKey(normals.latitude, normals.longitude)] = normals
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(file))
  } catch {
    // A full or blocked storage is not worth losing the session over; the
    // normals are re-fetchable, unlike the visitor's own stacks.
  }
}

export function clearNormalsCache(): void {
  inFlight.clear()
  localStorage.removeItem(STORAGE_KEY)
}

export type NormalsDeps = {
  fetchNormals?: (latitude: number, longitude: number) => Promise<ClimateNormals>
}

export async function getNormals(
  latitude: number,
  longitude: number,
  deps: NormalsDeps = {},
): Promise<ClimateNormals> {
  const cached = getCachedNormals(latitude, longitude)
  if (cached) return cached

  const key = locationKey(latitude, longitude)
  const pending = inFlight.get(key)
  if (pending) return pending

  const fetchNormals = deps.fetchNormals ?? ((lat, lon) => fetchMonthlyNormals(lat, lon))
  const request = fetchNormals(latitude, longitude)
    .then((normals) => {
      // Store under the coordinates that were asked for, so the rounded key
      // matches on the way back out; the API answers with its own grid point.
      const stamped = { ...normals, latitude, longitude }
      writeCachedNormals(stamped)
      return stamped
    })
    .finally(() => {
      inFlight.delete(key)
    })

  inFlight.set(key, request)
  return request
}
