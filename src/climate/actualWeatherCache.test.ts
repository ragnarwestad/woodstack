import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearActualWeatherCache,
  getActualWeather,
  getCachedActualWeather,
} from './actualWeatherCache'
import { actualWeather } from '../test/fixtures'

const MONDAY = new Date('2026-08-23T09:00:00Z')
const TUESDAY = new Date('2026-08-24T09:00:00Z')

beforeEach(() => {
  localStorage.clear()
  clearActualWeatherCache()
})

describe('getActualWeather', () => {
  it('fetches once per location per calendar day', async () => {
    const fetchActual = vi.fn().mockResolvedValue(actualWeather(2026, 18, 60))

    await getActualWeather(59.9132, 10.7523, { fetchActual }, MONDAY)
    await getActualWeather(59.9088, 10.7561, { fetchActual }, MONDAY)

    expect(fetchActual).toHaveBeenCalledTimes(1)
  })

  it('asks again once the day rolls over, because the year keeps happening', async () => {
    const fetchActual = vi.fn().mockResolvedValue(actualWeather(2026, 18, 60))

    await getActualWeather(59.9, 10.8, { fetchActual }, MONDAY)
    await getActualWeather(59.9, 10.8, { fetchActual }, TUESDAY)

    expect(fetchActual).toHaveBeenCalledTimes(2)
  })

  /** A day-old correction is still closer to true than no correction, so a
   *  failed refresh keeps yesterday's answer rather than dropping to null. */
  it('falls back to the previous day\'s entry when today\'s fetch fails', async () => {
    await getActualWeather(59.9, 10.8, { fetchActual: vi.fn().mockResolvedValue(actualWeather(2026, 18, 60)) }, MONDAY)

    const failing = vi.fn().mockRejectedValue(new Error('offline'))
    const result = await getActualWeather(59.9, 10.8, { fetchActual: failing }, TUESDAY)

    expect(failing).toHaveBeenCalledTimes(1)
    expect(result?.monthly[0]).toEqual({ temperature: 18, humidity: 60 })
  })

  it('resolves to null, and does not throw, when there is nothing cached and the fetch fails', async () => {
    const failing = vi.fn().mockRejectedValue(new Error('offline'))
    await expect(getActualWeather(59.9, 10.8, { fetchActual: failing }, MONDAY)).resolves.toBeNull()
    expect(getCachedActualWeather(59.9, 10.8)).toBeNull()
  })

  it('resolves to null when no month this year is safe to ask for yet', async () => {
    const fetchActual = vi.fn().mockResolvedValue(null)
    await expect(getActualWeather(59.9, 10.8, { fetchActual }, MONDAY)).resolves.toBeNull()
  })
})

describe('getCachedActualWeather', () => {
  it('is null for a location that was never fetched', () => {
    expect(getCachedActualWeather(1, 2)).toBeNull()
  })

  it('is the stored entry once fetched, stamped with the coordinates that were asked for', async () => {
    await getActualWeather(59.9, 10.8, { fetchActual: vi.fn().mockResolvedValue(actualWeather(2026, 18, 60)) }, MONDAY)
    expect(getCachedActualWeather(59.9, 10.8)?.year).toBe(2026)
  })
})
