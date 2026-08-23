import { Anchor } from '@mantine/core'
import { useTranslation } from '../i18n/useTranslation'

/** "← Tilbake", the same on every screen that has somewhere to go back to.
 *
 *  An `Anchor` for the look and a real `button` underneath: going back is an
 *  action this app performs, not an address to follow, and a link with no
 *  href is invisible to a keyboard and to a screen reader. */
export function BackLink({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation()

  return (
    <Anchor
      component="button"
      type="button"
      onClick={onClick}
      fz={12}
      fw={700}
      tt="uppercase"
      c="teal.6"
      style={{ letterSpacing: '0.16em' }}
    >
      ← {t('common.back')}
    </Anchor>
  )
}
