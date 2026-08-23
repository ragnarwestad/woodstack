import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, within } from '@testing-library/react'
import { ConfirmButton } from './ConfirmButton'
import { renderWithMantine } from '../test/render'
import { assertNoBungeeBelow16 } from '../test/fontRules'

function renderButton(onConfirm = vi.fn()) {
  renderWithMantine(
    <ConfirmButton
      label="Slett"
      question="Slette denne? Det kan ikke angres."
      confirmLabel="Ja, slett"
      cancelLabel="Avbryt"
      onConfirm={onConfirm}
    />,
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

  /** The dialog title sat at 12 px in Bungee. It is written into a
   *  `styles={{ ... }}` object, so it reaches the rendered tree and is
   *  checked there. */
  it('sets nothing in Bungee below 16 px', () => {
    renderButton()
    fireEvent.click(screen.getByRole('button', { name: 'Slett' }))

    assertNoBungeeBelow16(document.body)
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

  /** The question used to appear in the page, where the two buttons took the
   *  place of the one and pushed everything below them down. It is a dialog
   *  now, and it names what is about to go. */
  it('asks in a dialog, and says what will happen', () => {
    renderButton()
    fireEvent.click(screen.getByRole('button', { name: 'Slett' }))

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('Slette denne? Det kan ikke angres.')
    expect(within(dialog).getByRole('button', { name: 'Ja, slett' })).toBeInTheDocument()
  })
})
