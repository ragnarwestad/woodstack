import { describe, expect, it, vi } from 'vitest'
import {
  actualWeatherRange,
  buildArchiveUrl,
  fetchActualWeather,
  fetchMonthlyNormals,
  geocode,
  lastSafeMonth,
  reduceToMonthlyNormals,
  reduceToPartialMonthly,
} from './openMeteo'

/** Two years of a two-day-per-month toy archive: enough to prove the reducer
 *  buckets by month and averages, without a network call. */
function archiveFixture() {
  const time: string[] = []
  const temperature: number[] = []
  const humidity: number[] = []
  for (const year of [2024, 2025]) {
    for (let month = 1; month <= 12; month++) {
      const mm = String(month).padStart(2, '0')
      time.push(`${year}-${mm}-05`, `${year}-${mm}-20`)
      // January 0 °C, rising 1 °C per month; the second day of each month is
      // 2 °C warmer, so the mean is the first day + 1.
      temperature.push(month - 1, month + 1)
      humidity.push(70, 80)
    }
  }
  return { time, temperature_2m_mean: temperature, relative_humidity_2m_mean: humidity }
}

describe('buildArchiveUrl', () => {
  it('asks the archive API for the daily means the model needs', () => {
    const url = buildArchiveUrl(59.9, 10.8, { startDate: '2020-01-01', endDate: '2024-12-31' })
    expect(url).toContain('archive-api.open-meteo.com')
    expect(url).toContain('latitude=59.9')
    expect(url).toContain('longitude=10.8')
    expect(url).toContain('temperature_2m_mean')
    expect(url).toContain('relative_humidity_2m_mean')
    expect(url).toContain('start_date=2020-01-01')
    expect(url).toContain('end_date=2024-12-31')
  })
})

describe('reduceToMonthlyNormals', () => {
  it('returns twelve months, January first', () => {
    const monthly = reduceToMonthlyNormals(archiveFixture())
    expect(monthly).toHaveLength(12)
    expect(monthly[0].temperature).toBeCloseTo(1, 5)
    expect(monthly[6].temperature).toBeCloseTo(7, 5)
  })

  it('averages every year of data into the same month bucket', () => {
    const monthly = reduceToMonthlyNormals(archiveFixture())
    expect(monthly[0].humidity).toBeCloseTo(75, 5)
  })

  it('ignores days whose values are missing', () => {
    const daily = archiveFixture()
    daily.temperature_2m_mean[0] = null as unknown as number
    const monthly = reduceToMonthlyNormals(daily)
    expect(Number.isFinite(monthly[0].temperature)).toBe(true)
  })

  it('rejects a response that carries no usable humidity at all', () => {
    const daily = { ...archiveFixture(), relative_humidity_2m_mean: [] }
    expect(() => reduceToMonthlyNormals(daily)).toThrow()
  })
})

describe('reduceToPartialMonthly', () => {
  it('averages a month that has data, the same way the normals reducer does', () => {
    const monthly = reduceToPartialMonthly(archiveFixture())
    expect(monthly[0]?.temperature).toBeCloseTo(1, 5)
    expect(monthly[0]?.humidity).toBeCloseTo(75, 5)
  })

  /** The year is still running: most of it has not happened, and that is a
   *  `null`, not an error and not a zero. */
  it('returns null for a month with no data instead of throwing', () => {
    const daily = { time: ['2026-01-05'], temperature_2m_mean: [1], relative_humidity_2m_mean: [75] }
    const monthly = reduceToPartialMonthly(daily)
    expect(monthly).toHaveLength(12)
    expect(monthly[0]).not.toBeNull()
    expect(monthly[1]).toBeNull()
    expect(monthly[11]).toBeNull()
  })
})

describe('lastSafeMonth', () => {
  it('is the latest month that both ended and cleared the archive lag', () => {
    expect(lastSafeMonth(new Date('2026-08-23T00:00:00Z'))).toBe(6)
  })

  it('is null through every day of January — no month of this year has ended yet', () => {
    for (const day of ['01', '15', '31']) {
      expect(lastSafeMonth(new Date(`2026-01-${day}T00:00:00Z`))).toBeNull()
    }
  })
})

describe('actualWeatherRange', () => {
  it('runs from 1 January to the end of the last safe month', () => {
    expect(actualWeatherRange(new Date('2026-08-23T00:00:00Z'))).toEqual({
      startDate: '2026-01-01',
      endDate: '2026-07-31',
      year: 2026,
    })
  })

  /** Nothing is fetched before a fully elapsed, lag-cleared month exists:
   *  all of January, and February until the 5th. */
  it('is null all through January and the first four days of February', () => {
    for (const day of ['2026-01-01', '2026-01-15', '2026-01-31', '2026-02-01', '2026-02-04']) {
      expect(actualWeatherRange(new Date(`${day}T00:00:00Z`))).toBeNull()
    }
  })

  it('first returns a range on 5 February — January, the earliest month it ever gives', () => {
    expect(actualWeatherRange(new Date('2026-02-05T00:00:00Z'))).toEqual({
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      year: 2026,
    })
  })
})

describe('fetchActualWeather', () => {
  it('returns this year\'s elapsed months, stamped with the location and the year', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ daily: archiveFixture() }),
    })
    const actual = await fetchActualWeather(59.9, 10.8, { fetchFn, today: new Date('2026-08-23T00:00:00Z') })
    expect(actual?.latitude).toBe(59.9)
    expect(actual?.longitude).toBe(10.8)
    expect(actual?.year).toBe(2026)
    expect(actual?.monthly).toHaveLength(12)
    expect(fetchFn.mock.calls[0][0]).toContain('start_date=2026-01-01')
    expect(fetchFn.mock.calls[0][0]).toContain('end_date=2026-07-31')
  })

  it('asks for nothing at all when no month this year has cleared the lag', async () => {
    const fetchFn = vi.fn()
    await expect(
      fetchActualWeather(59.9, 10.8, { fetchFn, today: new Date('2026-01-20T00:00:00Z') }),
    ).resolves.toBeNull()
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('throws when the API answers with an error status', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({}) })
    await expect(
      fetchActualWeather(59.9, 10.8, { fetchFn, today: new Date('2026-08-23T00:00:00Z') }),
    ).rejects.toThrow()
  })
})

describe('fetchMonthlyNormals', () => {
  it('returns normals stamped with the location it was asked for', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ daily: archiveFixture() }),
    })
    const normals = await fetchMonthlyNormals(59.9, 10.8, { fetchFn })
    expect(normals.latitude).toBe(59.9)
    expect(normals.longitude).toBe(10.8)
    expect(normals.monthly).toHaveLength(12)
    expect(normals.fetchedAt).toBeTruthy()
  })

  it('throws when the API answers with an error status', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({}) })
    await expect(fetchMonthlyNormals(59.9, 10.8, { fetchFn })).rejects.toThrow()
  })
})

describe('geocode', () => {
  it('maps the API results to name and coordinates', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { name: 'Oslo', latitude: 59.91, longitude: 10.75, country: 'Norge', admin1: 'Oslo' },
        ],
      }),
    })
    const results = await geocode('Oslo', { fetchFn })
    expect(results).toEqual([
      { name: 'Oslo', latitude: 59.91, longitude: 10.75, country: 'Norge', admin1: 'Oslo' },
    ])
  })

  it('returns an empty list when the API finds nothing', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    await expect(geocode('Xyzzy', { fetchFn })).resolves.toEqual([])
  })

  /** The language was hardcoded to `nb`, so an English visitor searched in
   *  Norwegian. It has to follow the language the app is showing. */
  it('asks the API for the language it is given', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })

    await geocode('Oslo', { fetchFn }, 'en')
    expect(fetchFn.mock.calls[0][0]).toContain('language=en')

    await geocode('Oslo', { fetchFn }, 'nb')
    expect(fetchFn.mock.calls[1][0]).toContain('language=nb')
  })
})
