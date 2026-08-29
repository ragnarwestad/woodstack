import type { FormEvent } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, within } from '@testing-library/react'
import { ExplainButton, ExplainedLabel } from './ExplainButton'
import { renderWithMantine } from '../test/render'
import { assertNoBungeeBelow16 } from '../test/fontRules'

const TITLE = 'Hvorfor et vindu, ikke én dato?'
const BODY = 'Været så langt fram kan ikke forutsies dag for dag.'

function renderMark() {
  renderWithMantine(<ExplainButton title={TITLE} body={BODY} />)
}

describe('ExplainButton', () => {
  /** The whole point of hiding the explanation: nothing to read past when you
   *  already know. */
  it('says nothing until it is asked', () => {
    renderMark()
    expect(screen.queryByText(BODY)).not.toBeInTheDocument()
  })

  /** The mark is a «?» on screen, which tells a screen reader nothing — the
   *  title is what it is called out loud, so there is one string to write per
   *  explanation rather than two. */
  it('is a button that names what it explains', () => {
    renderMark()
    expect(screen.getByRole('button', { name: TITLE })).toBeInTheDocument()
  })

  /** The dialog title sat at 12 px in Bungee. It is written into a
   *  `styles={{ ... }}` object, so it reaches the rendered tree and is
   *  checked there. */
  it('sets nothing in Bungee below 16 px', () => {
    renderMark()
    fireEvent.click(screen.getByRole('button', { name: TITLE }))

    assertNoBungeeBelow16(document.body)
  })

  it('answers in a dialog when the mark is pressed', () => {
    renderMark()
    fireEvent.click(screen.getByRole('button', { name: TITLE }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(BODY)).toBeInTheDocument()
  })

  /** The mark sits inside three forms, and a `<button>` with no `type` is a
   *  submit button. Asking what a unit means would then save the entry — the
   *  quietest possible failure, and one an element swap reintroduces for
   *  free. */
  it('asks rather than submits the form it stands in', () => {
    const onSubmit = vi.fn((event: FormEvent) => event.preventDefault())
    renderWithMantine(
      <form onSubmit={onSubmit}>
        <ExplainButton title={TITLE} body={BODY} />
      </form>,
    )

    const mark = screen.getByRole('button', { name: TITLE })
    expect(mark).toHaveAttribute('type', 'button')
    fireEvent.click(mark)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  /** No pointer needed to get back out: Escape closes it, the way every other
   *  dialog in the app does. */
  it('closes again on Escape', () => {
    renderMark()
    fireEvent.click(screen.getByRole('button', { name: TITLE }))
    fireEvent.keyDown(document.body, { key: 'Escape' })

    expect(screen.queryByText(BODY)).not.toBeInTheDocument()
  })
})

describe('ExplainedLabel', () => {
  function renderField() {
    renderWithMantine(
      <>
        <ExplainedLabel htmlFor="unit" label="Enhet" title={TITLE} body={BODY} />
        <select id="unit" />
      </>,
    )
  }

  /** The mark must stay OUT of the `<label>`. Nested there it is read as part
   *  of the field's own name — «Enhet ?» — and it answers to the field's label
   *  itself, so a lookup by label finds two things instead of the field. */
  it('leaves the field called what it was called', () => {
    renderField()
    expect(screen.getByLabelText('Enhet')).toBe(document.getElementById('unit'))
  })

  it('still opens the explanation from beside the label', () => {
    renderField()
    fireEvent.click(screen.getByRole('button', { name: TITLE }))
    expect(within(screen.getByRole('dialog')).getByText(BODY)).toBeInTheDocument()
  })
})
