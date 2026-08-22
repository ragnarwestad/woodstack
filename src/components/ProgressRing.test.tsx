import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { ProgressRing } from './ProgressRing'
import { renderWithMantine } from '../test/render'

describe('ProgressRing', () => {
  it('shows the percent it was given', () => {
    renderWithMantine(<ProgressRing value={42} />)
    expect(screen.getByText('42 %')).toBeInTheDocument()
  })

  it('clamps a negative value to 0', () => {
    renderWithMantine(<ProgressRing value={-15} />)
    expect(screen.getByText('0 %')).toBeInTheDocument()
  })

  it('clamps a value over 100 to 100', () => {
    renderWithMantine(<ProgressRing value={150} />)
    expect(screen.getByText('100 %')).toBeInTheDocument()
  })
})
