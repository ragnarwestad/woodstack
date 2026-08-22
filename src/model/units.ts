import type { DryWindow } from '../storage/schema'

/** Every moisture number in this app is dry basis, and this is the word the
 *  UI uses to say so. It appears wherever a moisture value is rendered — a
 *  bare percentage would be ambiguous by a factor that matters (fresh birch
 *  is 45 % wet basis and 75 % dry basis). */
export const MOISTURE_BASIS_LABEL = 'tørrvekt'

/** The rule of thumb for firewood, on the dry basis a pin meter reads. */
export const DRY_ENOUGH_MOISTURE = 20

/** A moisture value as the UI shows it: rounded, with the unit and the basis. */
export function formatMoisture(moisture: number): string {
  return `${Math.round(moisture)} % (${MOISTURE_BASIS_LABEL})`
}

/** A plain percentage, for the progress ring and the chart axis. */
export function formatPercent(value: number): string {
  return `${Math.round(value)} %`
}

const MONTHS = [
  'januar',
  'februar',
  'mars',
  'april',
  'mai',
  'juni',
  'juli',
  'august',
  'september',
  'oktober',
  'november',
  'desember',
]

/** A date as a third of a month. The model cannot tell a Tuesday from a
 *  Thursday eight months out, so the text does not pretend it can. */
export function formatMonthPart(date: Date): string {
  const day = date.getUTCDate()
  const part = day <= 10 ? 'begynnelsen' : day <= 20 ? 'midten' : 'slutten'
  return `${part} av ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`
}

/** The window as one line of text: two ends, never a single date. */
export function formatWindow(window: DryWindow): string {
  return `${formatMonthPart(window.earliest)} – ${formatMonthPart(window.latest)}`
}
