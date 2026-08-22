import { describe, expect, it } from 'vitest'
import { statSync } from 'node:fs'
import { resolve } from 'node:path'

import { pwaIcons } from './pwaIcons'

// Vitest runs from the project root, so paths are resolved against it.
const publicFile = (name: string) => resolve(process.cwd(), 'public', name)

describe('pwaIcons', () => {
  it('declares at least one icon', () => {
    expect(pwaIcons.length).toBeGreaterThan(0)
  })

  it.each(['192x192', '512x512'])('declares a %s icon', (sizes) => {
    expect(pwaIcons.some((icon) => icon.sizes === sizes)).toBe(true)
  })

  // Android draws the app icon into a launcher-chosen shape and crops
  // anything outside it. Without a maskable entry the icon is letterboxed
  // into a white rounded square instead.
  it('declares a maskable icon', () => {
    expect(pwaIcons.some((icon) => icon.purpose === 'maskable')).toBe(true)
  })

  it.each([...pwaIcons])('has a real, non-empty file for $src', ({ src }) => {
    const stats = statSync(publicFile(src))
    expect(stats.isFile()).toBe(true)
    expect(stats.size).toBeGreaterThan(0)
  })
})
