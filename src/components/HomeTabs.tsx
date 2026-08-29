import { Tabs } from '@mantine/core'
import { useTranslation } from '../i18n/useTranslation'

export type HomeTab = 'stacks' | 'compare' | 'need'

type Props = {
  value: HomeTab
  onChange: (tab: HomeTab) => void
}

/** The front page's own row, switching between the three screens that belong
 *  to the app as a whole rather than to any one stack: the list itself, the
 *  buy comparison, and the "how much do I need?" calculator. The other two
 *  used to sit behind the header's three dots; they earned a tab instead once
 *  they turned out to be used as often as the list itself.
 *
 *  The same underline tabs as the stack page's four, and `grow` for the same
 *  reason — three labels of roughly equal length share the row evenly, unlike
 *  the About dialog's uneven three. */
export function HomeTabs({ value, onChange }: Props) {
  const { t } = useTranslation()

  return (
    <Tabs
      value={value}
      onChange={(next) => onChange(next as HomeTab)}
      color="orange"
      classNames={{ tab: 'ws-tab' }}
      styles={{ tab: { fontWeight: 700, fontSize: 13, letterSpacing: '0.02em', padding: '9px 6px' } }}
    >
      <Tabs.List grow>
        <Tabs.Tab value="stacks">{t('nav.tabStacks')}</Tabs.Tab>
        <Tabs.Tab value="compare">{t('nav.tabCompare')}</Tabs.Tab>
        <Tabs.Tab value="need">{t('nav.tabNeed')}</Tabs.Tab>
      </Tabs.List>
    </Tabs>
  )
}
