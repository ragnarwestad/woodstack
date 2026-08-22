import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearNormalsCache, getCachedNormals, getNormals, locationKey } from './normalsCache'
import { OSLO_NORMALS } from '../test/fixtures'

beforeEach(() => {
  localStorage.clear()
  clearNormalsCache()
})

describe('locationKey', () => {
  it('rounds to a tenth of a degree, so a stack and its neighbour share one entry', () => {
    expect(locationKey(59.9132, 10.7523)).toBe(locationKey(59.9088, 10.7561))
  })

  it('keeps distant places apart', () => {
    expect(locationKey(59.9, 10.8)).not.toBe(locationKey(63.4, 10.4))
  })
})

describe('getNormals', () => {
  it('fetches once per location, ever', async () => {
    const fetchNormals = vi.fn().mockResolvedValue(OSLO_NORMALS)

    await getNormals(59.9132, 10.7523, { fetchNormals })
    await getNormals(59.9088, 10.7561, { fetchNormals })

    expect(fetchNormals).toHaveBeenCalledTimes(1)
  })

  it('survives a reload: a second call reads the cache written by the first', async () => {
    const first = vi.fn().mockResolvedValue(OSLO_NORMALS)
    await getNormals(59.9, 10.8, { fetchNormals: first })

    const second = vi.fn().mockResolvedValue(OSLO_NORMALS)
    const normals = await getNormals(59.9, 10.8, { fetchNormals: second })

    expect(second).not.toHaveBeenCalled()
    expect(normals.monthly).toHaveLength(12)
  })

  it('does fetch for a location it has never seen', async () => {
    const fetchNormals = vi.fn().mockResolvedValue(OSLO_NORMALS)
    await getNormals(59.9, 10.8, { fetchNormals })
    await getNormals(63.4, 10.4, { fetchNormals })
    expect(fetchNormals).toHaveBeenCalledTimes(2)
  })

  it('does not poison the cache when the fetch fails', async () => {
    const failing = vi.fn().mockRejectedValue(new Error('offline'))
    await expect(getNormals(59.9, 10.8, { fetchNormals: failing })).rejects.toThrow()
    expect(getCachedNormals(59.9, 10.8)).toBeNull()
  })
})

describe('getCachedNormals', () => {
  it('is null for a location that was never fetched', () => {
    expect(getCachedNormals(1, 2)).toBeNull()
  })

  it('is the stored normals once fetched', async () => {
    await getNormals(59.9, 10.8, { fetchNormals: vi.fn().mockResolvedValue(OSLO_NORMALS) })
    expect(getCachedNormals(59.9, 10.8)?.monthly).toHaveLength(12)
  })
})
