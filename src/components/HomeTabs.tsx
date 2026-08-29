import type { MantineSpacing } from '@mantine/core'
import { Tabs } from '@mantine/core'
import { useTranslation } from '../i18n/useTranslation'

export type HomeTab = 'stacks' | 'compare' | 'need'

type Props = {
  value: HomeTab
  onChange: (tab: HomeTab) => void
  mt?: MantineSpacing
}

/** The front page's own row, drawn inside the sticky header panel so it
 *  stays on screen with the mark rather than scrolling away under it.
 *  Switches between the three screens that belong to the app as a whole
 *  rather than to any one stack: the list itself, the buy comparison, and the
 *  "how much do I need?" calculator. The other two used to sit behind the
 *  header's three dots; they earned a tab instead once they turned out to be
 *  used as often as the list itself.
 *
 *  The same underline tabs as the stack page's four, and `grow` for the same
 *  reason — three labels of roughly equal length share the row evenly, unlike
 *  the About dialog's uneven three.
 *
 *  The track and the hover wash are the two things Mantine's underline tab
 *  reads off the app's light/dark colour scheme rather than off the
 *  surrounding text colour the way the label itself does — and the panel
 *  this sits on is always plum, in either scheme. Left alone, a visitor in
 *  the light scheme would get the light scheme's pale grey track, all but
 *  invisible on plum. Both are pinned to a fixed, panel-appropriate value
 *  here instead, overriding Mantine's own scheme-keyed custom properties. */
export function HomeTabs({ value, onChange, mt }: Props) {
  const { t } = useTranslation()

  return (
    <Tabs
      value={value}
      onChange={(next) => onChange(next as HomeTab)}
      color="orange"
      mt={mt}
      classNames={{ tab: 'ws-tab' }}
      styles={{
        list: {
          '--tab-border-color': 'rgba(247, 235, 211, 0.35)',
          '--tab-hover-color': 'rgba(247, 235, 211, 0.12)',
        },
        tab: { fontWeight: 700, fontSize: 13, letterSpacing: '0.02em', padding: '9px 6px' },
      }}
    >
      <Tabs.List grow>
        <Tabs.Tab value="stacks">{t('nav.tabStacks')}</Tabs.Tab>
        <Tabs.Tab value="compare">{t('nav.tabCompare')}</Tabs.Tab>
        <Tabs.Tab value="need">{t('nav.tabNeed')}</Tabs.Tab>
      </Tabs.List>
    </Tabs>
  )
}
