import type { ReactElement } from 'react'
import { MantineProvider } from '@mantine/core'
import { render } from '@testing-library/react'

/** Every component in this app renders inside Mantine's provider, so every
 *  component test has to as well. */
export function renderWithMantine(ui: ReactElement) {
  // `auto` because that is what `main.tsx` mounts the app with. A helper that
  // renders in a scheme the app never starts in would test something else.
  return render(<MantineProvider defaultColorScheme="auto">{ui}</MantineProvider>)
}
