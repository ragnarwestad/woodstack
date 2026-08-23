import { formatPercent } from '../model/units'

type Props = {
  /** How far the wood has dried, 0-100. */
  value: number
  size?: number
}

/** The ring is drawn here rather than by Mantine's `RingProgress`, which draws
 *  one ring and cannot lay concentric discs under it. `DryingCurveChart` already
 *  hand-draws its own `<svg>` in this directory, so the pattern is the house's.
 *
 *  Geometry: a 62-unit box, discs at r 29 / 23 / 17, the arc at r 27 rotated a
 *  quarter turn back so it starts at the top, and an r 13 disc in the surface
 *  colour to sit the label on. */
const RADIUS = 27
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const CENTRE = 31

/** Renders the number `dryingProgress()` computed — it does not compute it.
 *  The clamp is repeated here anyway: a ring is the one place a wrong number
 *  would draw something visibly broken. */
export function ProgressRing({ value, size = 60 }: Props) {
  const clamped = Math.min(Math.max(value, 0), 100)
  const ready = clamped >= 100

  return (
    <svg width={size} height={size} viewBox="0 0 62 62" role="img" aria-label={formatPercent(clamped)}>
      <circle cx={CENTRE} cy={CENTRE} r={29} fill="light-dark(#3A1A38, #2A1226)" />
      <circle cx={CENTRE} cy={CENTRE} r={23} fill="var(--mantine-color-orange-6)" />
      <circle cx={CENTRE} cy={CENTRE} r={17} fill="var(--mantine-color-yellow-6)" />
      <circle
        data-testid="ring-arc"
        cx={CENTRE}
        cy={CENTRE}
        r={RADIUS}
        fill="none"
        stroke={ready ? 'var(--mantine-color-teal-filled)' : 'var(--mantine-color-orange-filled)'}
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={CIRCUMFERENCE * (1 - clamped / 100)}
        transform={`rotate(-90 ${CENTRE} ${CENTRE})`}
      />
      <circle cx={CENTRE} cy={CENTRE} r={13} fill="var(--mantine-color-body)" />
      {/* Outfit 12 / 700 — the size `size="xs"` gave it before, and the body
          face because a percentage is a number to read, not a label to scan. */}
      <text
        x={CENTRE}
        y={CENTRE}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12}
        fontWeight={700}
        fill="currentColor"
      >
        {formatPercent(clamped)}
      </text>
    </svg>
  )
}
