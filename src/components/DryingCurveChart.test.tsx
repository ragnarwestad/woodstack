import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { DryingCurveChart } from './DryingCurveChart'
import { renderWithMantine } from '../test/render'
import { OSLO_NORMALS, makeStack } from '../test/fixtures'
import { estimateWindow, simulate } from '../model/simulate'
import { DRY_ENOUGH_MOISTURE } from '../model/units'
import { ENGLISH_TEST_LANGUAGE, setTestLanguage } from '../test/language'

const stack = makeStack()
const points = simulate(stack, OSLO_NORMALS, { months: 24 })
const window = estimateWindow(stack, OSLO_NORMALS)
const readings = [
  { id: 'r1', date: '2026-10-15', moisture: 30 },
  { id: 'r2', date: '2026-12-01', moisture: 26 },
]

describe('DryingCurveChart', () => {
  it('draws the projected curve as one polyline', () => {
    const { container } = renderWithMantine(
      <DryingCurveChart points={points} readings={readings} threshold={DRY_ENOUGH_MOISTURE} window={window} />,
    )
    expect(container.querySelectorAll('polyline')).toHaveLength(1)
  })

  it('draws the second species its own curve when the pile is mixed', () => {
    const mixed = makeStack({ secondSpecies: { species: 'eik', share: 'third' } })
    const secondPoints = simulate({ ...mixed, species: 'eik' }, OSLO_NORMALS, { months: 24 })
    const { container } = renderWithMantine(
      <DryingCurveChart
        points={points}
        secondPoints={secondPoints}
        readings={readings}
        threshold={DRY_ENOUGH_MOISTURE}
        window={estimateWindow(mixed, OSLO_NORMALS)}
      />,
    )
    expect(container.querySelectorAll('polyline')).toHaveLength(2)
  })

  it('draws one point per logged reading', () => {
    const { container } = renderWithMantine(
      <DryingCurveChart points={points} readings={readings} threshold={DRY_ENOUGH_MOISTURE} window={window} />,
    )
    expect(container.querySelectorAll('circle')).toHaveLength(2)
  })

  it('labels the threshold line with the moisture basis', () => {
    renderWithMantine(
      <DryingCurveChart points={points} readings={readings} threshold={DRY_ENOUGH_MOISTURE} window={window} />,
    )
    expect(screen.getByText(/20 %/)).toBeInTheDocument()
    expect(screen.getByText(/tørrvekt/i)).toBeInTheDocument()
  })

  it('is readable to a screen reader as an image with a description', () => {
    renderWithMantine(
      <DryingCurveChart points={points} readings={readings} threshold={DRY_ENOUGH_MOISTURE} window={window} />,
    )
    expect(screen.getByRole('img', { name: /tørkekurve/i })).toBeInTheDocument()
  })

  it('renders nothing rather than crashing on an empty simulation', () => {
    const { container } = renderWithMantine(
      <DryingCurveChart points={[]} readings={[]} threshold={DRY_ENOUGH_MOISTURE} window={window} />,
    )
    expect(container.querySelectorAll('polyline')).toHaveLength(0)
  })
})

describe('DryingCurveChart in English', () => {
  it('describes itself to a screen reader in English, basis included', () => {
    setTestLanguage(ENGLISH_TEST_LANGUAGE)
    renderWithMantine(
      <DryingCurveChart points={points} readings={readings} threshold={DRY_ENOUGH_MOISTURE} window={window} />,
    )

    expect(screen.getByRole('img', { name: /drying curve/i })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /dry basis/i })).toBeInTheDocument()
    expect(screen.getByText(/dry basis/i)).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /tørkekurve/i })).not.toBeInTheDocument()
  })
})
