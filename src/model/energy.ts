/** How much heat is in the wood, and how much of it reaches the room.
 *
 *  Source: Ved4.xlsx, sheets `Tabeller 1` and `Tabeller 2`. Energy per kilo of
 *  dry wood barely varies between species — unlike density, see `density.ts` —
 *  so everything in this file is species-free by design. Species matters
 *  earlier, turning a volume into a weight. */

export const ENERGY_PER_KG_BONE_DRY_KWH = 5.32

/** The figure the sheet states directly for wood at 20 % moisture. Deriving
 *  it from the two constants around it lands at about 4.28 instead; the gap is
 *  the sheet's own rounding, and `energy.test.ts` bounds it rather than
 *  pretending the two agree exactly. */
export const ENERGY_PER_KG_AT_20_PERCENT_MOISTURE_KWH = 4.2

/** What it costs to boil a kilo of water off, from 15 °C to steam. This is
 *  why wet wood is worth less than it looks: the water is dead weight that
 *  also eats into what the wood beside it gives. */
export const ENERGY_TO_EVAPORATE_PER_KG_WATER_KWH = 0.9

/** The three appliance classes the spreadsheet's own calculators use, by the
 *  names it gives them under `Navn på konstanter`: a clean-burning stove, an
 *  old stove, an open fireplace.
 *
 *  `Tabeller 2` also carries a longer list, from a theoretical 100 % down
 *  through a kakkelovn at 90-98 % to a poor open fire at 15 %. Offering that
 *  list to a visitor is a screen's job, not this file's — `deliveredEnergyKwh`
 *  takes any fraction, so nothing here has to be extended for it. */
export const STOVE_EFFICIENCY = {
  rentbrennende: 0.65,
  gammel: 0.45,
  grue: 0.15,
} as const

/** The heat in the wood before any stove gets at it.
 *
 *  `moisturePercent` is dry basis, the same convention as everywhere else in
 *  this app (see the header comment in `storage/schema.ts`): water as a share
 *  of the oven-dry wood. The wood's own heat comes off the dry fraction; the
 *  water fraction only costs, boiling off. */
export function rawEnergyKwh(kgAtMoisture: number, moisturePercent: number): number {
  const dryKg = kgAtMoisture / (1 + moisturePercent / 100)
  const waterKg = kgAtMoisture - dryKg
  return dryKg * ENERGY_PER_KG_BONE_DRY_KWH - waterKg * ENERGY_TO_EVAPORATE_PER_KG_WATER_KWH
}

/** What actually reaches the room. `efficiency` is a plain 0-1 fraction the
 *  caller supplies — one of `STOVE_EFFICIENCY`, or whatever a visitor picks
 *  from a fuller list — rather than a table this file owns. */
export function deliveredEnergyKwh(rawKwh: number, efficiency: number): number {
  return rawKwh * efficiency
}
