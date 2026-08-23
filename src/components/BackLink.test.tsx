import { describe, expect, it, vi } from 'vitest'
import { Stack } from '@mantine/core'
import { fireEvent, screen } from '@testing-library/react'
import { BackLink } from './BackLink'
import { renderWithMantine } from '../test/render'

describe('BackLink', () => {
  it('goes back when it is clicked', () => {
    const onClick = vi.fn()
    renderWithMantine(<BackLink onClick={onClick} />)
    fireEvent.click(screen.getByRole('button', { name: /tilbake/i }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  /** The reported bug: the same link sat on the left of the stack page and in
   *  the middle of the comparison page. `Stack` stretches its children to the
   *  full width, and a full-width button centres its own text — so wherever
   *  the link was a child of the column itself, it drifted to the middle.
   *
   *  `happy-dom` has no layout, so the position cannot be measured here. What
   *  is pinned is the mechanism that decides it: the button must not be a
   *  child of the column, because that is what makes it stretch. */
  it('does not become a flex child of the column it is put in', () => {
    const { container } = renderWithMantine(
      <Stack>
        <BackLink onClick={vi.fn()} />
      </Stack>,
    )
    const column = container.querySelector('.mantine-Stack-root') as HTMLElement
    const button = screen.getByRole('button', { name: /tilbake/i })

    expect(column).toContainElement(button)
    expect(button.parentElement).not.toBe(column)
  })
})
