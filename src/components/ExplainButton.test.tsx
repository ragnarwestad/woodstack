import { describe, expect, it } from 'vitest'
import { fireEvent, screen, within } from '@testing-library/react'
import { ExplainButton, ExplainedLabel } from './ExplainButton'
import { renderWithMantine } from '../test/render'

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

  it('answers in a dialog when the mark is pressed', () => {
    renderMark()
    fireEvent.click(screen.getByRole('button', { name: TITLE }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(BODY)).toBeInTheDocument()
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
