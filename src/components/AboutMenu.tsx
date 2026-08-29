import { useState } from 'react'
import { Menu, Modal, Tabs, Text, UnstyledButton } from '@mantine/core'
import { useTranslation } from '../i18n/useTranslation'
import { LanguageMenuItems, ThemeMenuItems } from './ViewControls'

type Props = {
  /** Whether theme and language stand in this dropdown too, rather than in
   *  buttons of their own beside it — see the note on `viewControls` where
   *  it is read, in `AppHeader`. */
  viewControls?: boolean
}

/** Three dots, drawn here rather than pulled from an icon library. It is the
 *  only icon the app has, and a whole package for one glyph runs against the
 *  same carefulness that kept the PWA asset generator out of the dependencies
 *  (see `pnpm-workspace.yaml`). `currentColor` so it takes the button's own
 *  colour in either theme. */
function ThreeDots() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  )
}

/** The one thing that belongs to the app as a whole rather than to any one
 *  field: what it does, how it arrives at the date, and what it does with
 *  what you put into it. Behind the header's three dots, so the header
 *  carries a button instead of that much to read past.
 *
 *  The comparison screen and the "how much do I need?" calculator used to
 *  live in this dropdown too; they now sit as tabs on the front page beside
 *  «Vedstabler», since neither belongs to any one stack and both are used
 *  often enough to earn a tab rather than a detour through «...».
 *
 *  The same `Modal` as `ExplainButton` and `ConfirmButton`, and for the same
 *  reasons — it traps focus, closes on Escape or a tap outside, and brings its
 *  own labelled close button. Wider than those two, because three tabs of
 *  prose need more room than a one-line answer.
 *
 *  The version sits below the tabs rather than inside one: «which build is
 *  this» is asked when something looks wrong, and the answer should not be
 *  behind whichever tab happens to be closed. */
export function AboutMenu({ viewControls = false }: Props = {}) {
  const { t } = useTranslation()
  const [opened, setOpened] = useState(false)

  return (
    <>
      <Menu position="bottom-end" transitionProps={{ duration: 0 }}>
        <Menu.Target>
          {/* The same outline circle as the «?», a size up. Mantine's subtle
              `ActionIcon` has neither fill nor edge, so it vanished on cream. */}
          <UnstyledButton
            aria-label={t('about.menuLabel')}
            style={{
              width: 30,
              height: 30,
              flex: 'none',
              borderRadius: 999,
              border: '1.5px solid color-mix(in srgb, currentColor 60%, transparent)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'inherit',
            }}
          >
            <ThreeDots />
          </UnstyledButton>
        </Menu.Target>
        <Menu.Dropdown
          style={{
            borderRadius: 12,
            borderWidth: 2,
            boxShadow: 'var(--mantine-shadow-sm)',
          }}
        >
          {/* Below 550px the three icon buttons wrapped to a line of their
              own under the wordmark. Theme and language move in here instead
              — behind the same three dots, above the one-off «what is this
              app» item — so only this button stands at the top right and
              the header stops wrapping. */}
          {viewControls && (
            <>
              <ThemeMenuItems />
              <Menu.Divider />
              <LanguageMenuItems />
              <Menu.Divider />
            </>
          )}
          <Menu.Item onClick={() => setOpened(true)}>{t('about.menuItem')}</Menu.Item>
        </Menu.Dropdown>
      </Menu>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={t('about.title')}
        centered
        size="md"
        radius="lg"
        // The same dialog shape as `ExplainButton`'s, written out here too —
        // see the note there for why the two are copies rather than one shared
        // wrapper.
        styles={{
          content: {
            border: '2px solid var(--mantine-color-default-border)',
            boxShadow: 'var(--mantine-shadow-md)',
          },
          header: { backgroundColor: 'light-dark(#3A1A38, #2A1226)', color: 'var(--mantine-color-white)' },
          title: { fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em' },
          close: { border: '1.5px solid currentColor', borderRadius: 999, color: 'var(--mantine-color-white)' },
        }}
        transitionProps={{ duration: 0 }}
      >
        {/* `keepMounted={false}`: these panels hold nothing but text, so there
            is no half-finished entry to preserve, and a phone reading the
            dialog aloud should not have to walk past two tabs it did not
            open. */}
        <Tabs
          defaultValue="what"
          keepMounted={false}
          color="orange"
          classNames={{ tab: 'ws-tab' }}
          styles={{ tab: { fontWeight: 700, fontSize: 13, letterSpacing: '0.02em', padding: '9px 14px' } }}
        >
          {/* No `grow` here, unlike the stack page: the three labels are not
              close to the same width, so an even split hands the shortest one
              a lake of space and squeezes the longest. */}
          <Tabs.List>
            <Tabs.Tab value="what">{t('about.tabWhat')}</Tabs.Tab>
            <Tabs.Tab value="how">{t('about.tabHow')}</Tabs.Tab>
            <Tabs.Tab value="info">{t('about.tabInfo')}</Tabs.Tab>
          </Tabs.List>

          {/* The bodies are written as paragraphs with blank lines between
              them; `pre-line` is what keeps those breaks on screen.

              The wrapper's `min-height` is sized for the longest of the
              three — «Utregninger», four paragraphs — so the dialog does
              not grow and shrink as the visitor switches tabs; the two
              shorter ones just leave some room below instead. */}
          <div data-testid="about-panels" style={{ minHeight: 400 }}>
            <Tabs.Panel value="what" pt="md">
              <Text size="sm" style={{ whiteSpace: 'pre-line' }}>
                {t('about.what.body')}
              </Text>
            </Tabs.Panel>

            <Tabs.Panel value="how" pt="md">
              <Text size="sm" style={{ whiteSpace: 'pre-line' }}>
                {t('about.how.body')}
              </Text>
            </Tabs.Panel>

            <Tabs.Panel value="info" pt="md">
              <Text size="sm" style={{ whiteSpace: 'pre-line' }}>
                {t('about.info.body')}
              </Text>
            </Tabs.Panel>
          </div>
        </Tabs>

        <Text size="xs" c="dimmed" ta="center" mt="md">
          {t('about.version', { value: __APP_VERSION__ })}
        </Text>
      </Modal>
    </>
  )
}
