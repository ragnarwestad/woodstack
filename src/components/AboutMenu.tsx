import { useState } from 'react'
import { ActionIcon, Menu, Modal, Tabs, Text } from '@mantine/core'
import { useTranslation } from '../i18n/useTranslation'

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

/** The things that belong to the app as a whole rather than to any one field:
 *  what it does, how it arrives at the date, and what it does with what you
 *  put into it. One item behind the header's three dots, so the header carries
 *  a button instead of a fourth thing to read past.
 *
 *  The same `Modal` as `ExplainButton` and `ConfirmButton`, and for the same
 *  reasons — it traps focus, closes on Escape or a tap outside, and brings its
 *  own labelled close button. Wider than those two, because three tabs of
 *  prose need more room than a one-line answer.
 *
 *  The version sits below the tabs rather than inside one: «which build is
 *  this» is asked when something looks wrong, and the answer should not be
 *  behind whichever tab happens to be closed. */
export function AboutMenu() {
  const { t } = useTranslation()
  const [opened, setOpened] = useState(false)

  return (
    <>
      <Menu position="bottom-end" transitionProps={{ duration: 0 }}>
        <Menu.Target>
          <ActionIcon variant="subtle" color="gray" aria-label={t('about.menuLabel')}>
            <ThreeDots />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item onClick={() => setOpened(true)}>{t('about.menuItem')}</Menu.Item>
        </Menu.Dropdown>
      </Menu>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={t('about.title')}
        centered
        size="md"
        transitionProps={{ duration: 0 }}
      >
        {/* `keepMounted={false}`: these panels hold nothing but text, so there
            is no half-finished entry to preserve, and a phone reading the
            dialog aloud should not have to walk past two tabs it did not
            open. */}
        <Tabs defaultValue="what" keepMounted={false}>
          <Tabs.List>
            <Tabs.Tab value="what">{t('about.tabWhat')}</Tabs.Tab>
            <Tabs.Tab value="how">{t('about.tabHow')}</Tabs.Tab>
            <Tabs.Tab value="info">{t('about.tabInfo')}</Tabs.Tab>
          </Tabs.List>

          {/* The bodies are written as paragraphs with blank lines between
              them; `pre-line` is what keeps those breaks on screen. */}
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
        </Tabs>

        <Text size="xs" c="dimmed" mt="md">
          {t('about.version', { value: __APP_VERSION__ })}
        </Text>
      </Modal>
    </>
  )
}
