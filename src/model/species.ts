import { SPECIES_IDS, type Species } from '../storage/schema'

export { SPECIES_IDS }
export type { Species }

export type SpeciesInfo = {
  id: Species
  /** Norwegian name, as it is shown in the UI. */
  label: string
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
  bjork: { id: 'bjork', label: 'Bjørk', greenMoisture: 75, baseRate: 0.38 },
  or: { id: 'or', label: 'Or', greenMoisture: 95, baseRate: 0.45 },
  osp: { id: 'osp', label: 'Osp', greenMoisture: 100, baseRate: 0.48 },
  furu: { id: 'furu', label: 'Furu', greenMoisture: 100, baseRate: 0.42 },
  gran: { id: 'gran', label: 'Gran', greenMoisture: 120, baseRate: 0.5 },
  eik: { id: 'eik', label: 'Eik', greenMoisture: 75, baseRate: 0.22 },
  bok: { id: 'bok', label: 'Bøk', greenMoisture: 78, baseRate: 0.28 },
}
