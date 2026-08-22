import type { VolumeEntry, VolumeUnit } from '../storage/schema'
import type { Translator } from '../i18n/useTranslation'

/** How much wood is in a stack, across the units firewood is sold in here.
 *
 *  Nothing in this file feeds the drying model. Split size, cover and exposure
 *  decide how fast wood dries; how much of it there is does not. */

/** How big one unit is in litres, and what share of that is actually wood
 *  rather than air between the pieces. `fastKubikk` is the reference — solid
 *  wood, no air — and every other unit converts through it.
 *
 *  Source: ved3.no/hovedmeny/vedfakta (1 løs kubikkmeter = 0,5 fast
 *  kubikkmeter; 1 favn = 2,4 m³ stablet = 3,3 m³ løs = 1,65 fast
 *  kubikkmeter), cross-checked against ved-fra-ble.com/malenheter (sack sizes,
 *  Norsk Standard NS 4414) and oslovedsentral.no/fakta-tips/hvor-mye-ved-er-det
 *  (favn, storsekk and sack counts), all read 2026-08-22. These are published
 *  rule-of-thumb figures, not lab measurements — the sources disagree at the
 *  second decimal depending on log length and how tightly a sack is packed.
 *  The same standing as the species table in `species.ts`: do not chase more
 *  precision than the sources have. */
const VOLUME_UNIT_INFO: Record<VolumeUnit, { litersPerUnit: number; solidFraction: number }> = {
  fastKubikk: { litersPerUnit: 1000, solidFraction: 1 },
  stablet: { litersPerUnit: 1000, solidFraction: 11 / 16 },
  losKubikk: { litersPerUnit: 1000, solidFraction: 0.5 },
  favn: { litersPerUnit: 2400, solidFraction: 11 / 16 },
  storsekk: { litersPerUnit: 1000, solidFraction: 0.5 },
  sekk40: { litersPerUnit: 40, solidFraction: 11 / 16 },
  sekk60: { litersPerUnit: 60, solidFraction: 11 / 16 },
}

/** Solid litres — the one measure that stays additive when a ledger mixes
 *  sacks, favner and cubic metres. */
export function toSolidLiters(amount: number, unit: VolumeUnit): number {
  const info = VOLUME_UNIT_INFO[unit]
  return amount * info.litersPerUnit * info.solidFraction
}

export function fromSolidLiters(solidLiters: number, unit: VolumeUnit): number {
  const info = VOLUME_UNIT_INFO[unit]
  return solidLiters / (info.litersPerUnit * info.solidFraction)
}

/** The running total, worked out from the whole ledger every time rather than
 *  kept as a stored counter — so rounding never compounds, and two devices
 *  that both logged entries could still be merged entry by entry. A missing or
 *  empty ledger is zero, the same as a stack nobody has measured. */
export function currentSolidLiters(entries: VolumeEntry[] = []): number {
  return entries.reduce((total, entry) => {
    const liters = toSolidLiters(entry.amount, entry.unit)
    return entry.kind === 'addition' ? total + liters : total - liters
  }, 0)
}

/** The total as the UI shows it: always fast kubikkmeter, never the unit the
 *  entries happened to be logged in, because a stacked cubic metre and a loose
 *  one are different amounts of wood and adding them would mean nothing.
 *
 *  A negative total shows as zero. It can only come from a withdrawal larger
 *  than what was logged in, and "-0,5 m³" is more confusing than "0" for a
 *  number that answers "how much is left". The ledger itself keeps the real
 *  figure, so a later correcting entry still adds up. */
export function formatVolume(solidLiters: number, { t, language }: Translator): string {
  const cubicMeters = fromSolidLiters(Math.max(0, solidLiters), 'fastKubikk')
  const locale = language === 'nb' ? 'nb-NO' : 'en-US'
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(cubicMeters)
  return `${number} ${t('volume.unitShort.fastKubikk')}`
}
