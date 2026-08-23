import type { ClimateNormals, DryWindow, Reading, Stack } from '../storage/schema'
import { emc } from './emc'
import { dryingRate, temperatureFactor } from './dryingRate'
import { SPECIES } from './species'
import { DRY_ENOUGH_MOISTURE } from './units'

export type SimulationPoint = {
  date: Date
  /** Dry basis, %. */
  moisture: number
}

export type SimulateOptions = {
  /** How many monthly steps to project. */
  months?: number
  /** Override the rate constant; defaults to `effectiveRate`. */
  rate?: number
}

/** How far past the stacked date the model will look before giving up. Ten
 *  years is far beyond any real firewood stack; it exists so a pathological
 *  combination (oak, large splits, uncovered, sheltered) terminates. */
const HORIZON_MONTHS = 120
const DEFAULT_MONTHS = 36

/** The rate is a literature estimate until the visitor measures the stack,
 *  and the window is drawn wide enough to say so. One reading does not make
 *  it exact either — hence a narrower band, not a single date. */
const UNMEASURED_UNCERTAINTY = 0.35
const MEASURED_UNCERTAINTY = 0.15

const MIN_RATE = 0.005
const MAX_RATE = 5
const BISECTION_STEPS = 60

export function parseDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`)
}

/** Calendar-month arithmetic that never rolls into the next month: adding a
 *  month to 31 January lands on 28 February, not 3 March. */
export function addMonths(date: Date, count: number): Date {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth() + count
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return new Date(Date.UTC(year, month, Math.min(date.getUTCDate(), lastDay)))
}

const AVERAGE_MONTH_MS = (365.2425 / 12) * 24 * 60 * 60 * 1000

/** One approach-to-equilibrium step over `dt` months of the given month's
 *  climate: `emc + (moisture - emc) * exp(-k * dt)`. */
function step(moisture: number, normal: { temperature: number; humidity: number }, rate: number, dt: number): number {
  const equilibrium = emc(normal.temperature, normal.humidity)
  const k = rate * temperatureFactor(normal.temperature)
  return equilibrium + (moisture - equilibrium) * Math.exp(-k * dt)
}

/** Project moisture from one point in time to another, walking month by month
 *  so each step uses its own month's normals, with a fractional final step. */
function project(
  normals: ClimateNormals,
  rate: number,
  from: SimulationPoint,
  to: Date,
): number {
  let current = from.date
  let moisture = from.moisture

  while (current.getTime() < to.getTime()) {
    const wholeMonth = addMonths(current, 1)
    const next = wholeMonth.getTime() < to.getTime() ? wholeMonth : to
    const dt = (next.getTime() - current.getTime()) / AVERAGE_MONTH_MS
    moisture = step(moisture, normals.monthly[current.getUTCMonth()], rate, dt)
    current = next
  }

  return moisture
}

/** Where the projection starts: the last logged reading if there is one,
 *  otherwise the species' green moisture on the day it was stacked. A
 *  measurement is data; the green figure is a table lookup. */
export function startingPoint(stack: Stack): SimulationPoint {
  const latest = latestReading(stack)
  if (latest) {
    return { date: parseDate(latest.date), moisture: latest.moisture }
  }
  return { date: parseDate(stack.stackedDate), moisture: SPECIES[stack.species].greenMoisture }
}

function latestReading(stack: Stack): Reading | undefined {
  return stack.readings.length
    ? stack.readings.reduce((a, b) => (a.date >= b.date ? a : b))
    : undefined
}

/** The rate to project with: refitted to the newest reading when the visitor
 *  has measured the stack, otherwise straight off the species/conditions
 *  table. */
export function effectiveRate(stack: Stack, normals: ClimateNormals): number {
  const latest = latestReading(stack)
  return latest ? refitRate(stack, latest, normals) : dryingRate(stack)
}

/** Solve for the rate constant that would have produced this reading.
 *
 *  Moisture at a fixed date falls monotonically as the rate rises, so a
 *  bisection is both sufficient and robust — no derivative, no divergence.
 *  A reading outside what any rate could explain clamps to the nearest end
 *  rather than throwing: the visitor's meter is not the model's to reject. */
export function refitRate(stack: Stack, reading: Reading, normals: ClimateNormals): number {
  const stacked = parseDate(stack.stackedDate)
  const readingDate = parseDate(reading.date)
  if (readingDate.getTime() <= stacked.getTime()) {
    return dryingRate(stack)
  }

  const from: SimulationPoint = {
    date: stacked,
    moisture: SPECIES[stack.species].greenMoisture,
  }
  const at = (rate: number) => project(normals, rate, from, readingDate)

  let low = MIN_RATE
  let high = MAX_RATE
  if (reading.moisture >= at(low)) return low
  if (reading.moisture <= at(high)) return high

  for (let i = 0; i < BISECTION_STEPS; i++) {
    const middle = (low + high) / 2
    if (at(middle) > reading.moisture) low = middle
    else high = middle
  }
  return (low + high) / 2
}

/** Monthly projection from the stacked date, for the drying curve. */
export function simulate(stack: Stack, normals: ClimateNormals, options: SimulateOptions = {}): SimulationPoint[] {
  const months = options.months ?? DEFAULT_MONTHS
  const rate = options.rate ?? effectiveRate(stack, normals)
  const stacked = parseDate(stack.stackedDate)
  const start = startingPoint(stack)

  const points: SimulationPoint[] = []
  for (let i = 0; i <= months; i++) {
    const date = addMonths(stacked, i)
    points.push({
      date,
      moisture:
        date.getTime() <= start.date.getTime()
          ? projectBackFromGreen(stack, normals, rate, date)
          : project(normals, rate, start, date),
    })
  }
  return points
}

/** Before the newest reading, the curve is still the green-moisture
 *  projection — the reading only anchors everything after it. */
function projectBackFromGreen(stack: Stack, normals: ClimateNormals, rate: number, to: Date): number {
  const stacked = parseDate(stack.stackedDate)
  const green = { date: stacked, moisture: SPECIES[stack.species].greenMoisture }
  return project(normals, rate, green, to)
}

/** How wide the band around the fitted rate is. */
function rateUncertainty(stack: Stack): number {
  return stack.readings.length ? MEASURED_UNCERTAINTY : UNMEASURED_UNCERTAINTY
}

/** The first date the projection crosses the dry-enough threshold, with the
 *  crossing month interpolated so the answer is not quantised to the 15th. */
function crossingDate(stack: Stack, normals: ClimateNormals, rate: number): Date {
  const start = startingPoint(stack)
  if (start.moisture <= DRY_ENOUGH_MOISTURE) return start.date

  let previous = start
  for (let i = 1; i <= HORIZON_MONTHS; i++) {
    const date = addMonths(start.date, i)
    const moisture = project(normals, rate, start, date)
    if (moisture <= DRY_ENOUGH_MOISTURE) {
      const share = (previous.moisture - DRY_ENOUGH_MOISTURE) / (previous.moisture - moisture)
      const span = date.getTime() - previous.date.getTime()
      return new Date(previous.date.getTime() + span * share)
    }
    previous = { date, moisture }
  }
  return addMonths(start.date, HORIZON_MONTHS)
}

/** The one or two stacks a mixed pile behaves as: the second, when present,
 *  is the same stack with `species` swapped, since every other condition —
 *  split size, cover, exposure, readings — is shared by the whole pile. */
function components(stack: Stack): Stack[] {
  return stack.secondSpecies ? [stack, { ...stack, species: stack.secondSpecies.species }] : [stack]
}

function estimateWindowForComponent(stack: Stack, normals: ClimateNormals): DryWindow {
  const rate = effectiveRate(stack, normals)
  const spread = rateUncertainty(stack)
  return {
    earliest: crossingDate(stack, normals, rate * (1 + spread)),
    latest: crossingDate(stack, normals, rate * (1 - spread)),
  }
}

/** When the stack is dry enough to burn — as a window, never a date. A single
 *  date is a promise the model cannot keep, and the first visitor who checks
 *  it with a meter and finds it wrong is lost.
 *
 *  A pile of two woods gets the two windows unioned: the first crossing to the
 *  last, which is how such a pile actually dries — part of it ready to burn
 *  while the rest is still wet. Averaging the two would give a date that fits
 *  neither half. */
export function estimateWindow(stack: Stack, normals: ClimateNormals): DryWindow {
  const windows = components(stack).map((component) => estimateWindowForComponent(component, normals))
  return {
    earliest: windows.reduce((min, w) => (w.earliest < min ? w.earliest : min), windows[0].earliest),
    latest: windows.reduce((max, w) => (w.latest > max ? w.latest : max), windows[0].latest),
  }
}

/** Whether the window has opened yet — the one fact the ready-check needs out
 *  of the whole window, and the only place "on the day itself" is decided.
 *  Recomputed from the stack's current fields every time it is asked, so an
 *  edit or a new reading moves the answer with it; nothing is ever scheduled
 *  against a date the app may stop believing in. */
export function hasEnteredWindow(window: DryWindow, today: Date): boolean {
  return today.getTime() >= window.earliest.getTime()
}

/** How far through the ready-window today is, 0-100. Before the window it is
 *  0, after it 100 — the ring can never read negative or over full. */
export function windowProgress(window: DryWindow, today: Date): number {
  const from = window.earliest.getTime()
  const to = window.latest.getTime()
  const now = today.getTime()

  if (now <= from) return 0
  if (now >= to) return 100
  return ((now - from) / (to - from)) * 100
}
