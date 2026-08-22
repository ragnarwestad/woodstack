import type { DryWindow } from '../storage/schema'
import type { Translator } from '../i18n/useTranslation'

/** The rule of thumb for firewood, on the dry basis a pin meter reads. */
export const DRY_ENOUGH_MOISTURE = 20

/** A moisture value as the UI shows it: rounded, with the unit and the basis.
 *  Every moisture number in this app is dry basis, and the text says so — a
 *  bare percentage would be ambiguous by a factor that matters (fresh birch is
 *  45 % wet basis and 75 % dry basis). */
export function formatMoisture(moisture: number, { t }: Translator): string {
  return `${Math.round(moisture)} % (${t('units.moistureBasis')})`
}

/** A plain percentage, for the progress ring and the chart axis. */
export function formatPercent(value: number): string {
  return `${Math.round(value)} %`
}

/** A date as a third of a month. The model cannot tell a Tuesday from a
 *  Thursday eight months out, so the text does not pretend it can. The month
 *  name comes from the platform rather than a hand-kept list: it already
 *  knows how to say it in either language. */
function formatMonthPart(date: Date, { t, language }: Translator): string {
  const day = date.getUTCDate()
  const part =
    day <= 10 ? 'units.monthPart.beginning' : day <= 20 ? 'units.monthPart.middle' : 'units.monthPart.end'
  const locale = language === 'nb' ? 'nb-NO' : 'en-US'
  const month = new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }).format(date)
  return `${t(part)} ${t('units.monthPart.of')} ${month} ${date.getUTCFullYear()}`
}

/** The window as one line of text: two ends, never a single date. */
export function formatWindow(window: DryWindow, translator: Translator): string {
  return `${formatMonthPart(window.earliest, translator)} – ${formatMonthPart(window.latest, translator)}`
}
