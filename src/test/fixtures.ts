import type { ClimateNormals, Stack } from '../storage/schema'

/** Monthly normals shaped like eastern Norway: cold, damp winters and a
 *  short, mild summer. Index 0 is January. Used by every test that needs a
 *  climate without touching the network. */
export const OSLO_NORMALS: ClimateNormals = {
  latitude: 59.9,
  longitude: 10.8,
  fetchedAt: '2026-08-22T00:00:00.000Z',
  monthly: [
    { temperature: -4, humidity: 85 },
    { temperature: -4, humidity: 82 },
    { temperature: 0, humidity: 76 },
    { temperature: 5, humidity: 68 },
    { temperature: 11, humidity: 64 },
    { temperature: 15, humidity: 68 },
    { temperature: 17, humidity: 72 },
    { temperature: 16, humidity: 75 },
    { temperature: 11, humidity: 80 },
    { temperature: 6, humidity: 84 },
    { temperature: 1, humidity: 87 },
    { temperature: -3, humidity: 88 },
  ],
}

/** The same temperature and humidity in every month, so a test can reason
 *  about approach-to-equilibrium without seasonal noise. */
export function constantNormals(temperature: number, humidity: number): ClimateNormals {
  return {
    latitude: 0,
    longitude: 0,
    fetchedAt: '2026-08-22T00:00:00.000Z',
    monthly: Array.from({ length: 12 }, () => ({ temperature, humidity })),
  }
}

export function makeStack(overrides: Partial<Stack> = {}): Stack {
  return {
    id: 'stack-1',
    name: 'Bjørkestabelen',
    species: 'bjork',
    stackedDate: '2026-04-15',
    splitSize: 'medium',
    cover: 'roof',
    exposure: 'normal',
    location: { name: 'Oslo', latitude: 59.9, longitude: 10.8 },
    readings: [],
    ...overrides,
  }
}
