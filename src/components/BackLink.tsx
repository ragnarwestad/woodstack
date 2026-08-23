import { Anchor } from '@mantine/core'
import { useTranslation } from '../i18n/useTranslation'

/** "← Tilbake", the same on every screen that has somewhere to go back to.
 *
 *  An `Anchor` for the look and a real `button` underneath: going back is an
 *  action this app performs, not an address to follow, and a link with no
 *  href is invisible to a keyboard and to a screen reader.
 *
 *  The wrapping `div` is what keeps it on the left. A `Stack` stretches its
 *  children across the full width, and a full-width button centres its own
 *  text — so the same link sat left on the stack page, where it shares a
 *  `Group` with «Endre», and in the middle of the page on the comparison and
 *  the calculator, where it is a child of the column itself. Wrapped, the
 *  stretching stops at the `div` and the button keeps its own width wherever
 *  it is put. */
export function BackLink({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation()

  return (
    <div>
      <Anchor
        component="button"
        type="button"
        onClick={onClick}
        fz={14}
        fw={700}
        tt="uppercase"
        c="teal.6"
        style={{ letterSpacing: '0.16em' }}
      >
        ← {t('common.back')}
      </Anchor>
    </div>
  )
}
