import { RingProgress, Text } from '@mantine/core'
import { formatPercent } from '../model/units'

type Props = {
  /** How far the wood has dried, 0-100. */
  value: number
  size?: number
}

/** Renders the number `dryingProgress()` computed — it does not compute it.
 *  The clamp is repeated here anyway: a ring is the one place a wrong number
 *  would draw something visibly broken. */
export function ProgressRing({ value, size = 60 }: Props) {
  const clamped = Math.min(Math.max(value, 0), 100)
  return (
    <RingProgress
      size={size}
      thickness={6}
      roundCaps
      sections={[{ value: clamped, color: clamped >= 100 ? 'teal' : 'orange' }]}
      label={
        <Text size="xs" ta="center">
          {formatPercent(clamped)}
        </Text>
      }
    />
  )
}
