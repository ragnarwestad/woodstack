import { SPECIES_IDS, type Species, type Stack } from '../storage/schema'
import type { Translator } from '../i18n/useTranslation'

export { SPECIES_IDS }
export type { Species }

export type SpeciesInfo = {
  id: Species
  /** Moisture of freshly felled wood, dry basis %. */
  greenMoisture: number
  /** Drying-rate constant per month at reference conditions: medium split,
   *  roofed with open sides, normal sun and wind, 15 °C. */
  baseRate: number
}

/** Species data behind the drying model.
 *
 *  These numbers are read off the firewood literature — green moisture from
 *  published green-weight tables, the rates from the ordinary Norwegian
 *  rule that spruce and pine are ready in one season while oak and beech
 *  need two. They are NOT field-calibrated for any particular stack, and
 *  the model is not tuned to make them look precise. That is why an
 *  unmeasured stack gets a deliberately wide window (see `rateUncertainty`
 *  in `simulate.ts`) and why logging one reading is worth more than any
 *  refinement of this table. */
export const SPECIES: Record<Species, SpeciesInfo> = {
  bjork: { id: 'bjork', greenMoisture: 75, baseRate: 0.38 },
  or: { id: 'or', greenMoisture: 95, baseRate: 0.45 },
  osp: { id: 'osp', greenMoisture: 100, baseRate: 0.48 },
  furu: { id: 'furu', greenMoisture: 100, baseRate: 0.42 },
  gran: { id: 'gran', greenMoisture: 120, baseRate: 0.5 },
  eik: { id: 'eik', greenMoisture: 75, baseRate: 0.22 },
  bok: { id: 'bok', greenMoisture: 78, baseRate: 0.28 },
}

/** How a stack's species reads to a visitor: just the one wood, or both of
 *  them with a word for how much the second one is. */
export function speciesLabel(stack: Pick<Stack, 'species' | 'secondSpecies'>, t: Translator['t']): string {
  const primary = t(`species.${stack.species}`)
  if (!stack.secondSpecies) return primary
  return t('species.mixedLabel', {
    primary,
    secondary: t(`species.${stack.secondSpecies.species}`),
    share: t(`species.share.${stack.secondSpecies.share}`),
  })
}
