import { SimpleGrid } from '@mantine/core'
import type { ReactNode } from 'react'

/** Two fields on a line, one below `xs`. None of these values needs the full
 *  width of the form, and a column of full-width controls makes a short form
 *  look like a long one.
 *
 *  A row per pair rather than one grid over every field: the pairs mean
 *  something — the wood, where it stands, how much — and a single flowing grid
 *  would re-pair them whenever a conditional field appears or disappears. */
export function FieldRow({ children, align = 'end' }: { children: ReactNode; align?: 'end' | 'start' }) {
  return (
    // Bottoms aligned by default: a field with a description under its label is
    // taller than its neighbour, and without this the two inputs sit at
    // different heights on the same row. A row where one cell GROWS after the
    // fact — a photo preview — passes `start`, or the other column is dragged
    // down every time.
    <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm" verticalSpacing="sm" style={{ alignItems: align }}>
      {children}
    </SimpleGrid>
  )
}
