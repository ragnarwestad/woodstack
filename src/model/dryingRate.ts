import type { Cover, Exposure, SplitSize, Stack } from '../storage/schema'
import { SPECIES } from './species'

/** Everything about a stack that changes how fast it dries. */
export type DryingConditions = Pick<Stack, 'species' | 'splitSize' | 'cover' | 'exposure'>

/** Surface area per unit of volume: a small split has more of it. */
const SPLIT_FACTOR: Record<SplitSize, number> = {
  small: 1.3,
  medium: 1,
  large: 0.7,
}

/** Rain re-wets an open stack faster than sun dries it, so no cover is a
 *  real penalty. A closed shed keeps rain off but also keeps air still,
 *  which is why it sits below an open-sided roof. */
const COVER_FACTOR: Record<Cover, number> = {
  none: 0.65,
  roof: 1,
  shed: 0.85,
}

const EXPOSURE_FACTOR: Record<Exposure, number> = {
  sheltered: 0.8,
  normal: 1,
  exposed: 1.25,
}

const REFERENCE_TEMPERATURE = 15
const TEMPERATURE_SPAN = 20
/** Frozen wood still loses moisture by sublimation, just very slowly. */
const MIN_TEMPERATURE_FACTOR = 0.15
const MAX_TEMPERATURE_FACTOR = 1.6

/** How much faster or slower a month dries than the 15 °C reference month.
 *  Linear in temperature and clamped at both ends — the point is that winter
 *  months barely count, not that the relationship is exactly a line. */
export function temperatureFactor(celsius: number): number {
  const raw = (celsius - REFERENCE_TEMPERATURE) / TEMPERATURE_SPAN + 1
  return Math.min(Math.max(raw, MIN_TEMPERATURE_FACTOR), MAX_TEMPERATURE_FACTOR)
}

/** The rate constant `k` in `moisture(t+1) = emc + (moisture(t) - emc) * exp(-k * dt)`,
 *  per month, at the reference temperature. */
export function dryingRate(conditions: DryingConditions): number {
  return (
    SPECIES[conditions.species].baseRate *
    SPLIT_FACTOR[conditions.splitSize] *
    COVER_FACTOR[conditions.cover] *
    EXPOSURE_FACTOR[conditions.exposure]
  )
}
