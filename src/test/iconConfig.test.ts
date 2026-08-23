import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'
import { resolve } from 'node:path'

// Vitest runs from the project root, so paths are resolved against it.
const repoFile = (name: string) => readFileSync(resolve(process.cwd(), name), 'utf8')

describe('the favicon is the project’s own mark', () => {
  // The Vite template logo fills every path with this purple.
  it('no longer carries the Vite template’s fill colour', () => {
    expect(repoFile('public/favicon.svg')).not.toContain('#863bff')
  })

  // Woodstack '26: the tile is plum, and the browns it replaced are gone.
  it('carries the Woodstack ’26 palette, not the brown it replaced', () => {
    const mark = repoFile('src/assets/icon-source.svg')
    expect(mark).toContain('#3A1A38')
    expect(mark).not.toContain('#8B4513')
  })

  it('is the same mark the icon set is generated from', () => {
    expect(repoFile('public/favicon.svg')).toBe(repoFile('src/assets/icon-source.svg'))
  })
})

describe('vite.config.ts', () => {
  const viteConfig = repoFile('vite.config.ts')

  it('takes the manifest icons from src/pwaIcons.ts', () => {
    expect(viteConfig).toMatch(/import \{ pwaIcons \} from '\.\/src\/pwaIcons(\.ts)?'/)
    expect(viteConfig).toMatch(/icons:\s*pwaIcons/)
  })

  // The install chrome is the first thing a visitor sees of the app, before a
  // line of its CSS has loaded, so it is the mark's own plum and not a brown
  // left over from the icon that came before it.
  it('paints the install chrome in the mark’s plum', () => {
    expect(viteConfig).toMatch(/theme_color: '#3A1A38'/)
    expect(viteConfig).toMatch(/background_color: '#3A1A38'/)
    expect(viteConfig).not.toContain('#8B4513')
    expect(viteConfig).not.toContain('#1A1512')
  })

  // Two hand-kept copies of the same list is exactly what pwaIcons.ts exists
  // to prevent, so a second literal here is a failure, not a style question.
  it('keeps no second icons array of its own', () => {
    expect(viteConfig).not.toMatch(/icons:\s*\[/)
  })

  // GitHub Pages serves this app from https://ragnarwestad.github.io/woodstack/,
  // not from a domain root. Every built asset URL hangs off this one value, so
  // a silent change back to '/' would break the whole live site at once.
  it('serves from the GitHub Pages subpath', () => {
    const base = viteConfig.match(/^\s*base:\s*(.+)$/m)
    expect(base).not.toBeNull()
    expect(base![1]).toMatch(/^'\/woodstack\/',?$/)
  })

  // No trailing slash: the installed app's own URL can end up as exactly
  // '/woodstack', which falls outside a scope written '/woodstack/' and trips
  // Chrome's out-of-scope banner. PaceUp paid for this lesson once already.
  it('scopes the installed app to the deploy path, without a trailing slash', () => {
    expect(viteConfig).toMatch(/scope: '\/woodstack'/)
    expect(viteConfig).not.toContain("scope: '/woodstack/'")
  })
})

describe('README.md', () => {
  const readme = repoFile('README.md')

  it('no longer calls the icon undecided', () => {
    expect(readme).not.toContain(
      "An icon of its own. `public/favicon.svg` is still the Vite template's, and\n  the manifest has no icons.",
    )
  })
})

/**
 * The two top corners of a PNG, as `[r, g, b, a]`, without an image library.
 *
 * Only the first scanline is decoded: it is enough to read the colour of the
 * canvas the generator padded the mark onto, which is the whole question here.
 */
function topCorners(name: string): [number, number, number, number][] {
  const png = readFileSync(resolve(process.cwd(), name))
  let width = 0
  let depth = 0
  let colour = 0
  let interlace = 0
  let palette: Buffer | undefined
  let paletteAlpha: Buffer | undefined
  const pixelData: Buffer[] = []

  for (let pos = 8; pos < png.length; ) {
    const length = png.readUInt32BE(pos)
    const type = png.toString('ascii', pos + 4, pos + 8)
    const body = png.subarray(pos + 8, pos + 8 + length)
    if (type === 'IHDR') {
      width = body.readUInt32BE(0)
      depth = body[8]
      colour = body[9]
      interlace = body[12]
    } else if (type === 'PLTE') palette = body
    else if (type === 'tRNS') paletteAlpha = body
    else if (type === 'IDAT') pixelData.push(body)
    else if (type === 'IEND') break
    pos += 12 + length
  }

  if (depth !== 8 || interlace !== 0) {
    throw new Error(`${name}: expected an 8-bit non-interlaced PNG, got depth ${depth}, interlace ${interlace}`)
  }
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colour]
  if (!channels) throw new Error(`${name}: PNG colour type ${colour} is not handled here`)

  // Row 0 only, so the row above is all zeroes: Up adds nothing, and Paeth
  // reduces to the byte on the left.
  const raw = inflateSync(Buffer.concat(pixelData))
  const filter = raw[0]
  const row = Buffer.from(raw.subarray(1, 1 + width * channels))
  for (let i = 0; i < row.length; i++) {
    const left = i >= channels ? row[i - channels] : 0
    if (filter === 1 || filter === 4) row[i] = (row[i] + left) & 0xff
    else if (filter === 3) row[i] = (row[i] + (left >> 1)) & 0xff
  }

  const pixel = (x: number): [number, number, number, number] => {
    const i = x * channels
    if (colour === 3) {
      const index = row[i]
      const rgb = palette!
      const alpha = paletteAlpha && index < paletteAlpha.length ? paletteAlpha[index] : 255
      return [rgb[index * 3], rgb[index * 3 + 1], rgb[index * 3 + 2], alpha]
    }
    if (colour === 6) return [row[i], row[i + 1], row[i + 2], row[i + 3]]
    if (colour === 2) return [row[i], row[i + 1], row[i + 2], 255]
    throw new Error(`${name}: PNG colour type ${colour} is not handled here`)
  }
  return [pixel(0), pixel(width - 1)]
}

const asHex = ([r, g, b]: [number, number, number, number]) =>
  '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0').toUpperCase()).join('')

/**
 * Android masks the whole 512x512 canvas to whatever shape the launcher wants,
 * so the padding around the mark is part of the icon, not empty space. The
 * generator's `minimal` preset pads onto WHITE, which put the mark in a white
 * circle instead of the plum tile it was drawn as — an installed app with an
 * icon that looked blank. `pwa-assets.config.ts` is what overrides that, and
 * nothing else in the build looks at the pixels, so this does.
 *
 * The colour is read from the manifest rather than written twice: changing
 * `theme_color` and not regenerating the icons is the same bug in a new coat.
 */
describe('the icons the launcher masks', () => {
  const tile = repoFile('vite.config.ts').match(/theme_color: '(#[0-9A-Fa-f]{6})'/)?.[1]

  it.each(['public/maskable-icon-512x512.png', 'public/apple-touch-icon-180x180.png'])(
    '%s is padded with the manifest theme colour, not white',
    (file) => {
      for (const corner of topCorners(file)) {
        expect(asHex(corner)).toBe(tile?.toUpperCase())
        expect(corner[3]).toBe(255)
      }
    },
  )
})
