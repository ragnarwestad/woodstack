import type { ReactElement } from 'react'
import { MantineProvider } from '@mantine/core'
import { render } from '@testing-library/react'

/** Every component in this app renders inside Mantine's provider, so every
 *  component test has to as well. */
export function renderWithMantine(ui: ReactElement) {
  return render(<MantineProvider>{ui}</MantineProvider>)
}
