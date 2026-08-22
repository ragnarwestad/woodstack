import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { ConfirmButton } from './ConfirmButton'
import { renderWithMantine } from '../test/render'

function renderButton(onConfirm = vi.fn()) {
  renderWithMantine(
    <ConfirmButton label="Slett" confirmLabel="Ja, slett" cancelLabel="Avbryt" onConfirm={onConfirm} />,
  )
  return onConfirm
}

describe('ConfirmButton', () => {
  it('asks nothing until it is clicked', () => {
    renderButton()
    expect(screen.getByRole('button', { name: 'Slett' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ja, slett' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Avbryt' })).not.toBeInTheDocument()
  })

  it('offers the confirm and the way out after the first click', () => {
    const onConfirm = renderButton()
    fireEvent.click(screen.getByRole('button', { name: 'Slett' }))

    expect(screen.getByRole('button', { name: 'Ja, slett' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Avbryt' })).toBeInTheDocument()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('acts only on the second click', () => {
    const onConfirm = renderButton()
    fireEvent.click(screen.getByRole('button', { name: 'Slett' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ja, slett' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('goes back to asking nothing when the visitor backs out', () => {
    const onConfirm = renderButton()
    fireEvent.click(screen.getByRole('button', { name: 'Slett' }))
    fireEvent.click(screen.getByRole('button', { name: 'Avbryt' }))

    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Slett' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ja, slett' })).not.toBeInTheDocument()
  })
})
