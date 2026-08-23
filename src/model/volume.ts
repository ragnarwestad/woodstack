import type { VolumeEntry, VolumeUnit } from '../storage/schema'
import type { Translator } from '../i18n/useTranslation'

/** How much wood is in a stack, across the units firewood is sold in here.
 *
 *  Nothing in this file feeds the drying model. Split size, cover and exposure
 *  decide how fast wood dries; how much of it there is does not. */

/** Solid litres per unit — the one number `Tabeller 2` gives for each, so it
 *  is stored directly rather than decomposed into a raw size and a wood-to-air
 *  fraction: storfavn and cord have no independently meaningful "raw litres"
 *  figure of their own, only the solid result.
 *
 *  Source: Ved4.xlsx, sheet `Tabeller 2`, kept beside
 *  `specs/woodstack/18-what-wood-is-worth/1-description.md`. These are the
 *  figures of the person this app is built for, and where they disagree with
 *  the published rules of thumb this table used to cite (ved3.no and others),
 *  his win — he is the one who buys and sells the wood. That is why a favn is
 *  1600 solid litres here and not the 1650 those sources give.
 *
 *  The 40-litre sack is the one entry worth checking with him again: 30.3
 *  solid litres means three quarters of the sack is wood, which is denser than
 *  split firewood usually packs.
 *
 *  `stablet` is frozen at the app's old, pre-spreadsheet figure (11/16) and
 *  kept only so a ledger entry logged before `stablet60`/`stablet30` existed
 *  still converts to the volume it always did — see `VolumeUnit` in
 *  `storage/schema.ts`. */
const VOLUME_UNIT_INFO: Record<VolumeUnit, { solidLitersPerUnit: number }> = {
  fastKubikk: { solidLitersPerUnit: 1000 },
  stablet60: { solidLitersPerUnit: 650 },
  stablet30: { solidLitersPerUnit: 740 },
  losKubikk: { solidLitersPerUnit: 500 },
  favn: { solidLitersPerUnit: 1600 },
  storsekk: { solidLitersPerUnit: 500 },
  sekk40: { solidLitersPerUnit: 30.303 },
  sekk60: { solidLitersPerUnit: 41.667 },
  sekk80: { solidLitersPerUnit: 50 },
  storfavn: { solidLitersPerUnit: 6800 },
  cord: { solidLitersPerUnit: 2678.8 },
  stablet: { solidLitersPerUnit: 687.5 },
}

/** Solid litres — the one measure that stays additive when a ledger mixes
 *  sacks, favner and cubic metres. */
export function toSolidLiters(amount: number, unit: VolumeUnit): number {
  const info = VOLUME_UNIT_INFO[unit]
  return amount * info.solidLitersPerUnit
}

export function fromSolidLiters(solidLiters: number, unit: VolumeUnit): number {
  const info = VOLUME_UNIT_INFO[unit]
  return solidLiters / info.solidLitersPerUnit
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

/** The most one entry may add or remove, as solid litres — 1000 m³, roughly
 *  600 favn or twenty truckloads. No woodpile anyone stacks by hand comes
 *  near it, so it never stands in a real user's way; what it stops is a typo
 *  or a pasted `1e15` turning "left now" into a number nobody can read.
 *
 *  Expressed in solid litres rather than per unit so the same limit applies
 *  whichever unit the amount was entered in. */
export const MAX_ENTRY_SOLID_LITERS = 1_000_000

export function exceedsEntryCap(amount: number, unit: VolumeUnit): boolean {
  return toSolidLiters(amount, unit) > MAX_ENTRY_SOLID_LITERS
}
