import { describe, expect, it } from 'vitest'
import { speciesLabel } from './species'
import { createTranslator } from '../i18n/useTranslation'
import { makeStack } from '../test/fixtures'

const nb = createTranslator('nb').t
const en = createTranslator('en').t

describe('speciesLabel', () => {
  it('is just the species name when the pile is all one wood', () => {
    expect(speciesLabel(makeStack({ species: 'bjork' }), nb)).toBe('Bjørk')
    expect(speciesLabel(makeStack({ species: 'bjork' }), en)).toBe('Birch')
  })

  it('names both woods and how much the second one is', () => {
    const mixed = makeStack({ species: 'bjork', secondSpecies: { species: 'gran', share: 'third' } })
    expect(speciesLabel(mixed, nb)).toBe('Bjørk + Gran (En tredjedel eller så)')
    expect(speciesLabel(mixed, en)).toBe('Birch + Spruce (A third or so)')
  })

  it('has a label for every share, in both languages', () => {
    for (const share of ['half', 'third', 'bit'] as const) {
      const mixed = makeStack({ secondSpecies: { species: 'eik', share } })
      for (const t of [nb, en]) {
        const label = speciesLabel(mixed, t)
        expect(label).not.toContain('species.share.')
        expect(label).not.toContain('{share}')
      }
    }
  })
})
