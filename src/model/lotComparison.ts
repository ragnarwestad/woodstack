/** Which of two lots of firewood is the better buy, and by how much.
 *
 *  Kept out of the screen that shows it because this is the whole point of
 *  the comparison: "2 400 for en favn bjørk" against "900 for en løs
 *  kubikkmeter fersk gran" is arithmetic nobody does by eye, and arithmetic
 *  in this codebase is tested directly rather than through a rendered
 *  component (`model/volume.ts` is the house pattern).
 *
 *  Kroner per kWh decides it, not kroner per kilo and not kroner per cubic
 *  metre: the two lots are different units, different species and different
 *  amounts of water, and the delivered heat is the one figure all of that
 *  reduces to. */

/** Only the kWh price is read, so only the kWh price is asked for. Whatever
 *  the price engine hands back may carry more figures — kroner per kilo dry,
 *  kilos at 20 % moisture — and satisfies this by having this one. */
type PricedLot = { krPerKwh: number }

export type LotComparison = {
  /** Which of the two lots costs less per kWh, or `null` when they cost the
   *  same. Naming a winner between two identical prices would be the app
   *  inventing a difference the numbers do not have. */
  cheaperIndex: 0 | 1 | null
  /** How much less the cheaper lot costs, as a share of the DEARER one —
   *  «18 % billigere enn den andre», the way the saving is spoken about. */
  percentCheaper: number
}

export function compareLots(a: PricedLot, b: PricedLot): LotComparison {
  if (a.krPerKwh === b.krPerKwh) return { cheaperIndex: null, percentCheaper: 0 }

  const cheaperIndex = a.krPerKwh < b.krPerKwh ? 0 : 1
  const [cheaper, dearer] = cheaperIndex === 0 ? [a, b] : [b, a]
  return {
    cheaperIndex,
    percentCheaper: ((dearer.krPerKwh - cheaper.krPerKwh) / dearer.krPerKwh) * 100,
  }
}
