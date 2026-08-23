import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Vitest runs from the project root, so paths are resolved against it.
const repoFile = (name: string) => readFileSync(resolve(process.cwd(), name), 'utf8')
const repoBytes = (name: string) => readFileSync(resolve(process.cwd(), name))

const metaContent = (html: string, attr: 'property' | 'name', key: string) => {
  const all = [...html.matchAll(new RegExp(`<meta ${attr}="${key}" content="([^"]*)" ?/>`, 'g'))]
  expect(all, `expected exactly one <meta ${attr}="${key}"> in index.html`).toHaveLength(1)
  return all[0][1]
}

describe('the share card in index.html', () => {
  const html = repoFile('index.html')

  // A crawler fetches this file as text and never runs the app, so whatever
  // the card shows has to already be here — there is no second chance at
  // runtime to fill it in.
  it('carries one tag each for the five Open Graph properties', () => {
    expect(metaContent(html, 'property', 'og:title')).toBe('Woodstack')
    expect(metaContent(html, 'property', 'og:type')).toBe('website')
    expect(metaContent(html, 'property', 'og:url')).toBe('https://ragnarwestad.github.io/woodstack/')
    expect(metaContent(html, 'property', 'og:description')).not.toBe('')
    expect(metaContent(html, 'property', 'og:image')).not.toBe('')
  })

  // Without this the picture renders as a small square thumbnail instead of
  // the wide card the 1200x630 image was drawn for.
  it('asks for the wide card, not a thumbnail', () => {
    expect(metaContent(html, 'name', 'twitter:card')).toBe('summary_large_image')
  })

  // Every other asset path in this file is root-relative and Vite rewrites it
  // against `base`. A crawler resolves neither, so this one URL is absolute on
  // purpose — and it is the line that moves if the app ever changes host.
  it('points og:image at the full deployed URL, not a root-relative path', () => {
    expect(metaContent(html, 'property', 'og:image')).toBe(
      'https://ragnarwestad.github.io/woodstack/og-image.png',
    )
  })

  // One description, written once. A second copy is a second thing to keep in
  // step, and the one that drifts is the one nobody reads in the app.
  it('reuses the description meta rather than carrying a second wording', () => {
    expect(metaContent(html, 'property', 'og:description')).toBe(
      metaContent(html, 'name', 'description'),
    )
  })
})

describe('public/og-image.png', () => {
  // The card image cannot be compared against the design handoff from here —
  // that folder lives in the specs repo, not in this one — so its identity is
  // locked by what a crawler actually cares about: that it is a PNG, and that
  // it is the 1200x630 the wide card is cut for.
  // Read inside each test, not once above them: while the file is still
  // missing, a read up here fails the whole suite at collection and the tag
  // assertions never get to report.
  const image = () => repoBytes('public/og-image.png')

  it('is a PNG', () => {
    expect([...image().subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  })

  it('is 1200x630, the size a wide share card is cut for', () => {
    // IHDR is the first chunk: 8 bytes of signature, 8 of chunk header, then
    // width and height as big-endian 32-bit integers.
    expect(image().readUInt32BE(16)).toBe(1200)
    expect(image().readUInt32BE(20)).toBe(630)
  })

  // The byte count is the copy's receipt: the file was verified identical to
  // handoff/og-image.png when it landed, and this catches a re-export or a
  // well-meaning optimiser pass swapping it for a different picture.
  it('is the handoff image, byte for byte', () => {
    expect(image().byteLength).toBe(151321)
  })
})
