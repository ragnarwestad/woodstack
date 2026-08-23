/** The words a seller uses for how wet the wood is, and the numbers behind
 *  them.
 *
 *  «Fersk», «et år gammel», «tørr» is what an advert says; a percentage is
 *  what the arithmetic needs. `Tabeller 2` in Ved4.xlsx carries five such
 *  bands under the heading `Vedfukt`, each with a range rather than a single
 *  figure, and this file is that table.
 *
 *  THE BASIS CHANGES HERE, and it is the whole reason this file exists rather
 *  than the bands being typed straight into a select. The sheet's `Vedfukt`
 *  ranges are WET basis — water as a share of the whole wet weight, the
 *  convention published firewood tables use, which is why its freshly-felled
 *  band reads 40-60 %. Everything downstream of `storage/schema.ts` in this
 *  app is DRY basis — water as a share of the oven-dry wood — which is why
 *  `model/species.ts` puts freshly felled birch at 75 % and spruce at 120 %
 *  for the same wood. Feeding a wet-basis 50 % into `energy.ts` as if it were
 *  dry basis would say fresh wood holds half the water it does, and the
 *  comparison screen exists precisely to catch that one of two lots is half
 *  water. So the sheet's own ends are kept here and converted, once. */

export const MOISTURE_BAND_IDS = ['nyfelt', 'syretorket', 'ra', 'salgsved', 'ekstraTorr'] as const
export type MoistureBandId = (typeof MOISTURE_BAND_IDS)[number]

export type MoistureBand = {
  id: MoistureBandId
  /** The band as `Tabeller 2` states it: wet basis, low end first. Kept so
   *  the file can be read against the sheet without doing arithmetic. */
  wetBasisRange: [number, number]
  /** The figure the engine uses: dry basis, from the middle of the range. */
  moisturePercent: number
}

/** Water as a share of the whole becomes water as a share of the wood alone.
 *  45 parts water in 100 parts wet wood is 45 parts water resting on 55 parts
 *  wood, so 81,8 % dry basis. */
export function dryBasisFromWetBasis(wetBasisPercent: number): number {
  return (wetBasisPercent / (100 - wetBasisPercent)) * 100
}

/** Rounded to whole percent, because a band is a coarse thing to begin with:
 *  «rå ved» covers a real spread, and a tenth of a percent on the middle of
 *  it would be precision the word does not carry. */
function band(id: MoistureBandId, low: number, high: number): MoistureBand {
  return {
    id,
    wetBasisRange: [low, high],
    moisturePercent: Math.round(dryBasisFromWetBasis((low + high) / 2)),
  }
}

/** Wettest first, so the list reads the way wood dries. */
export const MOISTURE_BANDS: MoistureBand[] = [
  band('nyfelt', 40, 60),
  band('syretorket', 30, 40),
  band('ra', 23, 30),
  band('salgsved', 16, 22),
  band('ekstraTorr', 10, 15),
]

export function moistureBand(id: MoistureBandId): MoistureBand {
  const found = MOISTURE_BANDS.find((candidate) => candidate.id === id)
  if (!found) throw new Error(`No moisture band called "${id}" — see Tabeller 2 in Ved4.xlsx`)
  return found
}
