import { fromSolidLiters, currentSolidLiters, toSolidLiters } from './volume'
import { atMoistureKg, solidLitersToKg, SPECIES_DENSITY_KG_PER_SOLID_M3 } from './density'
import { deliveredEnergyKwh, ENERGY_PER_KG_AT_20_PERCENT_MOISTURE_KWH, STOVE_EFFICIENCY } from './energy'
import type { Species, Stack, VolumeUnit } from '../storage/schema'
import type { Translator } from '../i18n/useTranslation'

/** "How much wood do I need to buy?" — the inverse question of `density.ts`
 *  and `energy.ts`, both of which answer "what is this wood worth", not "how
 *  much of it do I need". Nothing here is a new engine: every function below
 *  is the same chain those two files already define, run forwards for a
 *  volume already offered and backwards for a kWh need still to be filled.
 *
 *  Moisture is fixed at 20% dry-basis throughout — the sheet's own
 *  "sale-ready" reference point (`ENERGY_PER_KG_AT_20_PERCENT_MOISTURE_KWH`)
 *  — because this screen is about buying wood to burn, not wood mid-dry. */

const REFERENCE_MOISTURE_PERCENT = 20

/** `energy.ts` names three appliance classes and says a longer list "is a
 *  screen's job" — this is that screen, and the three named efficiencies are
 *  the only figures in the codebase to build it from. */
export const STOVE_OPTIONS: { id: keyof typeof STOVE_EFFICIENCY; efficiency: number }[] = (
  Object.keys(STOVE_EFFICIENCY) as (keyof typeof STOVE_EFFICIENCY)[]
).map((id) => ({ id, efficiency: STOVE_EFFICIENCY[id] }))

/** kWh of delivered heat needed -> solid litres of `species` a stove at
 *  `efficiency` needs to be fed to deliver it. The exact inverse of
 *  `deliveredKwh` below. */
export function neededSolidLiters(kwhNeeded: number, species: Species, efficiency: number): number {
  const rawKwh = kwhNeeded / efficiency
  const kgAtMoisture = rawKwh / ENERGY_PER_KG_AT_20_PERCENT_MOISTURE_KWH
  const dryKg = kgAtMoisture / (1 + REFERENCE_MOISTURE_PERCENT / 100)
  const density = SPECIES_DENSITY_KG_PER_SOLID_M3[species]
  return (dryKg / density) * 1000
}

/** An amount already given in a volume unit -> the kWh of delivered heat it
 *  represents through a stove at `efficiency` — the "enter what you're
 *  offered" path. */
export function deliveredKwh(amount: number, unit: VolumeUnit, species: Species, efficiency: number): number {
  const solidLiters = toSolidLiters(amount, unit)
  const dryKg = solidLitersToKg(solidLiters, species)
  const kgAtMoisture = atMoistureKg(dryKg, REFERENCE_MOISTURE_PERCENT)
  const rawKwh = kgAtMoisture * ENERGY_PER_KG_AT_20_PERCENT_MOISTURE_KWH
  return deliveredEnergyKwh(rawKwh, efficiency)
}

/** Sum of every stack's logged volume — "already have", not "actually has":
 *  a stack with no `volumeEntries` contributes nothing, and is not
 *  distinguishable here from a stack that truly has none. */
export function totalLoggedSolidLiters(stacks: Stack[]): number {
  return stacks.reduce((total, stack) => total + currentSolidLiters(stack.volumeEntries), 0)
}

/** Whether the "already have" line is honest to show at all: only once at
 *  least one stack has actually been measured into the ledger. */
export function hasLoggedVolume(stacks: Stack[]): boolean {
  return stacks.some((stack) => (stack.volumeEntries?.length ?? 0) > 0)
}

/** How finely each unit can honestly be ordered — never more precision than
 *  the moisture guess behind the number supports. Favner to the nearest
 *  quarter, sacks and bulk bags to the nearest whole one, everything measured
 *  by the cubic metre to the nearest tenth. */
const ROUND_STEP: Record<VolumeUnit, number> = {
  favn: 0.25,
  storfavn: 0.25,
  storsekk: 1,
  sekk40: 1,
  sekk60: 1,
  sekk80: 1,
  fastKubikk: 0.1,
  losKubikk: 0.1,
  stablet60: 0.1,
  stablet30: 0.1,
  cord: 0.1,
  // Legacy unit: no longer offered as an output choice, kept only so the
  // type stays exhaustive.
  stablet: 0.1,
}

/** The unit shown alongside the preferred one, so a result is never a single
 *  number in a single unit. Favn's own default second unit is a sack, the
 *  unit `Innkjøp` itself pairs it with; every other preferred unit pairs with
 *  favn, since that is the unit firewood is advertised in here. */
const SECONDARY_UNIT: Record<VolumeUnit, VolumeUnit> = {
  favn: 'sekk60',
  storfavn: 'favn',
  storsekk: 'favn',
  sekk40: 'favn',
  sekk60: 'favn',
  sekk80: 'favn',
  fastKubikk: 'favn',
  losKubikk: 'favn',
  stablet60: 'favn',
  stablet30: 'favn',
  cord: 'favn',
  stablet: 'favn',
}

export function roundForUnit(solidLiters: number, unit: VolumeUnit): number {
  const amount = fromSolidLiters(solidLiters, unit)
  const step = ROUND_STEP[unit]
  return Math.round(amount / step) * step
}

/** One rounded amount, in one unit, as text — the building block `formatNeed`
 *  uses twice and the "already have / need to buy" line uses once each. */
export function formatUnitAmount(solidLiters: number, unit: VolumeUnit, { t, language }: Translator): string {
  const amount = roundForUnit(solidLiters, unit)
  const locale = language === 'nb' ? 'nb-NO' : 'en-US'
  const maximumFractionDigits = Number.isInteger(ROUND_STEP[unit]) ? 0 : 2
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits }).format(amount)
  return `${number} ${t(`volume.unitShort.${unit}`)}`
}

/** The result line: the preferred unit first and largest, at least one other
 *  unit alongside it, each rounded to something orderable. */
export function formatNeed(solidLiters: number, preferredUnit: VolumeUnit, translator: Translator): string {
  const secondaryUnit = SECONDARY_UNIT[preferredUnit]
  return translator.t('need.result', {
    primary: formatUnitAmount(solidLiters, preferredUnit, translator),
    secondary: formatUnitAmount(solidLiters, secondaryUnit, translator),
  })
}
