import { render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { describe, expect, it } from 'vitest'
import { App } from './App'

/** A smoke test, and no more than that: it proves React, Mantine and the test
 *  environment are wired together. The real tests arrive with the drying model. */
describe('App', () => {
  it('renders inside a Mantine provider', () => {
    render(
      <MantineProvider>
        <App />
      </MantineProvider>,
    )
    expect(screen.getByRole('heading', { name: 'Woodstack' })).toBeInTheDocument()
  })
})
