import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { PhotoField, PhotoPreview } from './PhotoField'
import { renderWithMantine } from '../test/render'
import { ENGLISH_TEST_LANGUAGE, setTestLanguage } from '../test/language'

const DATA_URL = 'data:image/jpeg;base64,shrunk'

function photoFile() {
  return new File(['pretend jpeg bytes'], 'stabel.jpg', { type: 'image/jpeg' })
}

/** The hidden `input[type="file"]` behind Mantine's control. The visitor
 *  clicks the button in front of it; a test has nothing to click a native file
 *  dialog with, so it hands the input a file directly. */
function fileInput(container: HTMLElement): HTMLInputElement {
  return container.querySelector('input[type="file"]') as HTMLInputElement
}

describe('PhotoField', () => {
  it('opens the camera on a phone rather than only the photo roll', () => {
    const { container } = renderWithMantine(<PhotoField value={undefined} onChange={vi.fn()} />)
    const input = fileInput(container)

    expect(input).toHaveAttribute('accept', 'image/*')
    expect(input).toHaveAttribute('capture', 'environment')
  })

  it('hands on what the resize step gives back, never the file as it arrived', async () => {
    const onChange = vi.fn()
    const resizeFn = vi.fn().mockResolvedValue(DATA_URL)
    const { container } = renderWithMantine(
      <PhotoField value={undefined} onChange={onChange} resizeFn={resizeFn} />,
    )

    const file = photoFile()
    fireEvent.change(fileInput(container), { target: { files: [file] } })

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(DATA_URL))
    expect(resizeFn).toHaveBeenCalledWith(file)
  })

  it('shows the photo it has been given', () => {
    renderWithMantine(<PhotoPreview value={DATA_URL} onChange={vi.fn()} />)
    expect(screen.getByAltText(/bilde av vedstabelen/i)).toHaveAttribute('src', DATA_URL)
  })

  /** The field never shows the picture — `PhotoPreview` does, beside the save
   *  and cancel buttons. That is what keeps them still: under the field, the
   *  picture added height the moment it arrived and moved everything below it
   *  down the page while the form was being filled in. */
  it('never grows a picture of its own', () => {
    const { container } = renderWithMantine(<PhotoField value={DATA_URL} onChange={vi.fn()} />)
    expect(container.querySelector('img')).toBeNull()
  })

  it('offers no remove button when there is no photo to remove', () => {
    renderWithMantine(<PhotoField value={undefined} onChange={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /fjern bildet/i })).not.toBeInTheDocument()
  })

  it('clears the photo when the visitor removes it', () => {
    const onChange = vi.fn()
    renderWithMantine(<PhotoPreview value={DATA_URL} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: /fjern bildet/i }))

    expect(onChange).toHaveBeenCalledWith(undefined)
  })

  /** A file the browser cannot decode rejects inside an event handler, where
   *  nothing else is waiting to catch it. Saying so beats a picker that looks
   *  like it did nothing. */
  it('says so when the photo cannot be read, and keeps the old one', async () => {
    const onChange = vi.fn()
    const { container } = renderWithMantine(
      <PhotoField
        value={DATA_URL}
        onChange={onChange}
        resizeFn={vi.fn().mockRejectedValue(new Error('not an image'))}
      />,
    )

    fireEvent.change(fileInput(container), { target: { files: [photoFile()] } })

    await waitFor(() => expect(screen.getByText(/fikk ikke lest bildet/i)).toBeInTheDocument())
    // The photo already there is left alone — the field just refuses the new one.
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('PhotoField in English', () => {
  it('labels the control in English when the browser does not speak Norwegian', () => {
    setTestLanguage(ENGLISH_TEST_LANGUAGE)
    const field = renderWithMantine(<PhotoField value={undefined} onChange={vi.fn()} />)
    expect(screen.getByText(/photo of the woodpile/i)).toBeInTheDocument()
    field.unmount()

    renderWithMantine(<PhotoPreview value={DATA_URL} onChange={vi.fn()} />)
    // The picture's own description is its alt text, not visible copy.
    expect(screen.getByAltText('Photo of the woodpile')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /remove the photo/i })).toBeInTheDocument()
  })
})
