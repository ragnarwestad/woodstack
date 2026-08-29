import type { ReactNode } from 'react'
import { Title, type TitleProps } from '@mantine/core'
import { BackLink } from './BackLink'

type Props = {
  onBack: () => void
  title: ReactNode
  titleProps?: TitleProps
  /** A button beside the title, on the far right — `StackDetail`'s «Endre».
   *  Left out entirely on the two forms, which have nothing to put there. */
  action?: ReactNode
}

/** The row every subpage with a way back opens on: the link on the left, its
 *  title centred in what is left of the row regardless of the link's or the
 *  action's own width, and the action — when there is one — on the right.
 *
 *  A three-column grid rather than a `Group` with `justify="space-between"`:
 *  `space-between` only pushes the two ends apart, so a title in the middle
 *  sits centred between them only when the link and the action happen to be
 *  the same width — Norwegian's «Tilbake» and English's «Back» are not the
 *  same width as each other, let alone as «Endre»/«Edit» or as nothing at
 *  all on the two forms. Two `1fr` columns of equal width flanking the
 *  title's own `auto` column is what keeps the title on the page's true
 *  centre line whatever either side holds — or does not. */
export function SubpageHeader({ onBack, title, titleProps, action }: Props) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8 }}>
      <div style={{ justifySelf: 'start' }}>
        <BackLink onClick={onBack} />
      </div>
      <Title order={2} ta="center" {...titleProps}>
        {title}
      </Title>
      <div style={{ justifySelf: 'end' }}>{action}</div>
    </div>
  )
}
