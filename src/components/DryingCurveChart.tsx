import type { DryWindow, Reading } from '../storage/schema'
import type { SimulationPoint } from '../model/simulate'
import { parseDate } from '../model/simulate'
import { formatMoisture } from '../model/units'
import { useTranslation } from '../i18n/useTranslation'

/** The one chart this app needs, drawn by hand: the projected curve, the
 *  dry-enough line, the ready-window as a band, and whatever the visitor has
 *  measured. Not a charting component — a chart. */

const WIDTH = 320
const HEIGHT = 180
const PADDING = { top: 12, right: 12, bottom: 24, left: 12 }

type Props = {
  points: SimulationPoint[]
  readings: Reading[]
  /** Dry basis, %. */
  threshold: number
  window: DryWindow
}

export function DryingCurveChart({ points, readings, threshold, window }: Props) {
  const translator = useTranslation()
  const { t } = translator

  if (points.length === 0) {
    return <svg width={WIDTH} height={HEIGHT} role="img" aria-label={t('chart.emptyLabel')} />
  }

  const times = points.map((point) => point.date.getTime())
  const minTime = Math.min(...times)
  const maxTime = Math.max(...times)
  const maxMoisture = Math.max(...points.map((point) => point.moisture), threshold, ...readings.map((r) => r.moisture))
  const minMoisture = 0

  const x = (time: number) =>
    PADDING.left + ((time - minTime) / (maxTime - minTime || 1)) * (WIDTH - PADDING.left - PADDING.right)
  const y = (moisture: number) =>
    HEIGHT -
    PADDING.bottom -
    ((moisture - minMoisture) / (maxMoisture - minMoisture || 1)) * (HEIGHT - PADDING.top - PADDING.bottom)

  const curve = points.map((point) => `${x(point.date.getTime()).toFixed(1)},${y(point.moisture).toFixed(1)}`).join(' ')
  const bandStart = x(clamp(window.earliest.getTime(), minTime, maxTime))
  const bandEnd = x(clamp(window.latest.getTime(), minTime, maxTime))

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={t('chart.label', { threshold: formatMoisture(threshold, translator) })}
    >
      <rect
        x={bandStart}
        y={PADDING.top}
        width={Math.max(bandEnd - bandStart, 1)}
        height={HEIGHT - PADDING.top - PADDING.bottom}
        fill="var(--mantine-color-teal-light)"
      />

      <line
        x1={PADDING.left}
        x2={WIDTH - PADDING.right}
        y1={y(threshold)}
        y2={y(threshold)}
        stroke="var(--mantine-color-teal-filled)"
        strokeDasharray="4 3"
      />
      <text x={PADDING.left} y={y(threshold) - 4} fontSize="10" fill="currentColor">
        {formatMoisture(threshold, translator)}
      </text>

      <polyline points={curve} fill="none" stroke="var(--mantine-color-orange-filled)" strokeWidth="2" />

      {readings.map((reading) => (
        <circle
          key={reading.id}
          cx={x(clamp(parseDate(reading.date).getTime(), minTime, maxTime))}
          cy={y(reading.moisture)}
          r="4"
          fill="var(--mantine-color-blue-filled)"
        />
      ))}

      <text x={PADDING.left} y={HEIGHT - 6} fontSize="10" fill="currentColor">
        {formatMonthLabel(points[0].date)}
      </text>
      <text x={WIDTH - PADDING.right} y={HEIGHT - 6} fontSize="10" textAnchor="end" fill="currentColor">
        {formatMonthLabel(points[points.length - 1].date)}
      </text>
    </svg>
  )
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high)
}

function formatMonthLabel(date: Date): string {
  return `${String(date.getUTCMonth() + 1).padStart(2, '0')}.${date.getUTCFullYear()}`
}
