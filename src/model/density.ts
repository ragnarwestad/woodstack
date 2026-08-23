import type { Species } from '../storage/schema'

/** What a given volume of wood weighs, and so how much wood is really in it.
 *
 *  Density is the one thing that varies a lot between species — the energy in
 *  a kilo of dry wood barely does, see `energy.ts` — so this is where species
 *  enters the question of what a pile is worth. A lot given in kilos needs no
 *  species at all; a lot given in favn needs one badly, because a favn of oak
 *  is half again the wood a favn of spruce is. */

/** Kilos per solid cubic metre, BONE DRY — basisdensitet, the weight of the
 *  wood itself with no water in it. Wet wood weighs more; `atMoistureKg`
 *  below adds the water back.
 *
 *  Source: Ved4.xlsx, sheet `Tabeller 1`, which lists seventeen species; these
 *  are the seven this app knows. `or` takes gråor's 360 rather than svartor's
 *  440 — the app has one alder, and gråor is the one that turns up in a
 *  Norwegian woodpile. Worth naming to him if the distinction ever matters
 *  enough to split the species in two, the way the stacked cubic metre split.
 *
 *  The sheet's own `Vekt` example is the cross-check: one solid cubic metre of
 *  spruce is 380 kg bone dry and 456 kg at 20 % moisture. */
export const SPECIES_DENSITY_KG_PER_SOLID_M3: Record<Species, number> = {
  bjork: 500,
  or: 360,
  osp: 400,
  furu: 440,
  gran: 380,
  eik: 550,
  bok: 570,
}

/** The arithmetic on its own, with the density handed in — so a caller who
 *  has a figure this table does not carry can still use it. */
export function litersToKg(solidLiters: number, densityKgPerSolidM3: number): number {
  return (solidLiters / 1000) * densityKgPerSolidM3
}

/** Bone-dry kilos for a solid volume of one species. Throws rather than
 *  guessing for a species with no figure: a wrong weight here is a wrong
 *  price and a wrong kilowatt-hour further down, and neither would look
 *  wrong on screen. */
export function solidLitersToKg(solidLiters: number, species: Species): number {
  const density = SPECIES_DENSITY_KG_PER_SOLID_M3[species]
  if (density === undefined) {
    throw new Error(`No density figure for "${species}" — see Tabeller 1 in Ved4.xlsx`)
  }
  return litersToKg(solidLiters, density)
}

/** What that dry wood weighs once it has water in it. `moisturePercent` is
 *  dry basis, like every moisture number in this app (see the header comment
 *  in `storage/schema.ts`): water as a share of the oven-dry wood, so 20 %
 *  moisture is the dry weight times 1.2. */
export function atMoistureKg(dryKg: number, moisturePercent: number): number {
  return dryKg * (1 + moisturePercent / 100)
}
