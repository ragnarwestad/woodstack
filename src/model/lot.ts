import { VOLUME_UNITS, type Species, type VolumeUnit } from '../storage/schema'
import { fromSolidLiters, toSolidLiters } from './volume'
import { SPECIES_DENSITY_KG_PER_SOLID_M3, atMoistureKg, litersToKg } from './density'
import { ENERGY_PER_KG_AT_20_PERCENT_MOISTURE_KWH } from './energy'
import { DRY_ENOUGH_MOISTURE } from './units'

/** What a lot of firewood someone is selling actually costs.
 *
 *  This is the `Sammenlign` sheet of Ved4.xlsx, and its arithmetic is followed
 *  cell for cell — see the cross-check tests in `lot.test.ts`. It composes the
 *  three tables spec 18 built (`volume.ts`, `density.ts`, `energy.ts`) and
 *  adds no figures of its own; every constant it uses is imported.
 *
 *  Nothing here touches a stack. A lot is wood in an advert, not wood the
 *  visitor owns, and it is never stored. */

/** Every unit firewood is priced in: the volume units the app already knows,
 *  plus the kilo. A weight is not a volume — it needs no species and cannot
 *  be restated as one — which is what `unitNeedsSpecies` below is about. */
export const PRICE_UNITS = [...VOLUME_UNITS, 'kg'] as const
export type PriceUnit = (typeof PRICE_UNITS)[number]

export type Lot = {
  /** Kroner for the whole lot. */
  price: number
  amount: number
  unit: PriceUnit
  /** Dry basis, like every moisture figure in this app — see the header of
   *  `storage/schema.ts`. Usually one of `moisture.ts`'s bands. */
  moisture: number
  /** Required for a volume unit, meaningless for kilos. */
  species?: Species
}

export type LotResult = {
  /** The wood itself, with all the water taken out. */
  dryKg: number
  /** What that wood weighs as sale-ready firewood — the state prices are
   *  really quoted in, and the sheet's own `Kg salgsved (20% fukt)`. */
  kgAt20Percent: number
  /** Kroner per kilo of that sale-ready wood. The sheet calls this line
   *  `NOK / kg tørr ved`; «tørr» there means dry enough to burn, not bone
   *  dry, and the arithmetic is the sheet's. */
  krPerKgDry: number
  /** The figure that actually decides which lot is the better buy. */
  krPerKwh: number
  /** The lot's size read back in whichever unit the visitor thinks in, or
   *  `null` when there is no honest answer — see `solidLiters` below. */
  amountIn: (unit: VolumeUnit) => number | null
}

/** A volume says how much wood there is; a weight on a scale says how much
 *  wood AND water there is. So species turns the first into kilos and is
 *  needed, while the second is already kilos and needs nothing. */
export function unitNeedsSpecies(unit: PriceUnit): boolean {
  return unit !== 'kg'
}

/** Enough of a lot filled in to be worth pricing. The screen asks this before
 *  it asks for a result, so an empty second column is simply quiet rather
 *  than showing a row of zeroes or a division by nothing. */
export function isLotComplete(lot: Lot): boolean {
  if (!Number.isFinite(lot.price) || lot.price <= 0) return false
  if (!Number.isFinite(lot.amount) || lot.amount <= 0) return false
  return !unitNeedsSpecies(lot.unit) || lot.species !== undefined
}

/** How much wood is in the lot, as bone-dry kilos.
 *
 *  Two ways in, and only one of them cares about the moisture: a favn of birch
 *  is the same amount of wood whether it rained on it or not, while a thousand
 *  kilos on a weighbridge is part water and the wetter it is the less wood it
 *  hides. That asymmetry is the sheet's (`Ark1`, `tørrvekt 1` against
 *  `tørrvekt 2/3`) and it is the reason wet wood sold by weight is a worse buy
 *  than it looks. */
function dryKgOf(lot: Lot): number {
  if (lot.unit === 'kg') return lot.amount / (1 + lot.moisture / 100)

  if (lot.species === undefined) {
    throw new Error(`A lot priced in "${lot.unit}" needs a species before it can be weighed`)
  }
  return litersToKg(toSolidLiters(lot.amount, lot.unit), SPECIES_DENSITY_KG_PER_SOLID_M3[lot.species])
}

/** The solid volume of wood in the lot, or `null` when it cannot be known.
 *
 *  A lot sold by the kilo is the `null` case: turning kilos back into favner
 *  needs a density, a density needs a species, and a weight lot is never asked
 *  for one (`unitNeedsSpecies`). The screen shows a dash there rather than a
 *  number picked out of the air. */
function solidLitersOf(lot: Lot): number | null {
  if (lot.unit === 'kg') return null
  return toSolidLiters(lot.amount, lot.unit)
}

export function evaluateLot(lot: Lot): LotResult {
  const dryKg = dryKgOf(lot)
  const kgAt20Percent = atMoistureKg(dryKg, DRY_ENOUGH_MOISTURE)
  const solidLiters = solidLitersOf(lot)

  return {
    dryKg,
    kgAt20Percent,
    krPerKgDry: lot.price / kgAt20Percent,
    // Energy per kilo barely varies between species (see `energy.ts`), so the
    // one figure for sale-ready wood covers every lot. No stove efficiency
    // enters here: it would scale both lots alike and cancel out of the
    // comparison, while making the numbers depend on a stove nobody asked
    // the visitor about.
    krPerKwh: lot.price / (kgAt20Percent * ENERGY_PER_KG_AT_20_PERCENT_MOISTURE_KWH),
    amountIn: (unit) => (solidLiters === null ? null : fromSolidLiters(solidLiters, unit)),
  }
}
