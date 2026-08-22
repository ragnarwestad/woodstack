/** Equilibrium moisture content: the moisture wood settles at if it is left
 *  in air of a given temperature and relative humidity long enough. It is the
 *  floor every drying stack approaches and never passes.
 *
 *  The formula is the Hailwood-Horrobin sorption model as published in the
 *  USDA Wood Handbook (chapter 4), which is why it needs no calibration: it
 *  is fitted once, against measured sorption isotherms, and holds for wood in
 *  general rather than for one species. Its constants are expressed in
 *  Fahrenheit, so the conversion happens here rather than in the caller. */

const MAX_HUMIDITY = 99.5

/**
 * @param celsius Air temperature, °C.
 * @param relativeHumidity Relative humidity, 0-100 %.
 * @returns Equilibrium moisture content, dry basis %.
 */
export function emc(celsius: number, relativeHumidity: number): number {
  const fahrenheit = celsius * 1.8 + 32
  // The model diverges as humidity approaches saturation, where wood is
  // waterlogged rather than in equilibrium with the air anyway.
  const h = Math.min(Math.max(relativeHumidity, 0), MAX_HUMIDITY) / 100

  const w = 330 + 0.452 * fahrenheit + 0.00415 * fahrenheit ** 2
  const k = 0.791 + 4.63e-4 * fahrenheit - 8.44e-7 * fahrenheit ** 2
  const k1 = 6.34 + 7.75e-4 * fahrenheit - 9.35e-5 * fahrenheit ** 2
  const k2 = 1.09 + 2.84e-2 * fahrenheit - 9.04e-5 * fahrenheit ** 2

  const kh = k * h
  const monolayer = kh / (1 - kh)
  const polylayer =
    (k1 * kh + 2 * k1 * k2 * kh * kh) / (1 + k1 * kh + k1 * k2 * kh * kh)

  return (1800 / w) * (monolayer + polylayer)
}
