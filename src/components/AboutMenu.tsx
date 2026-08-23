import { useState } from 'react'
import { Group, Menu, Modal, Tabs, Text, UnstyledButton } from '@mantine/core'
import { VOLUME_UNITS } from '../storage/schema'
import { compareHash } from '../storage/appState'
import { readResultUnitPreference, writeResultUnitPreference, type ResultUnit } from '../storage/resultUnitPreference'
import { useTranslation } from '../i18n/useTranslation'
import { Choice } from './ViewControls'

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
 *  put into it. Behind the header's three dots, so the header carries a button
 *  instead of that much to read past.
 *
 *  Three concerns now, not one. Besides «Om Woodstack» the dropdown holds the
 *  way into the comparison screen and the unit its answers are read in —
 *  both things that belong to the app rather than to any one stack, and
 *  neither big enough to earn a fourth icon beside theme and language.
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
  // Held in state as well as in storage so the tick moves the moment it is
  // clicked, the same way `useLanguageChoice` keeps the language.
  const [resultUnit, setResultUnit] = useState<ResultUnit>(readResultUnitPreference)

  function chooseResultUnit(unit: ResultUnit) {
    writeResultUnitPreference(unit)
    setResultUnit(unit)
  }

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
          {/* The two things a visitor changes and comes back to, above the
              one-off «what is this app» item. */}
          <Menu.Item
            onClick={() => {
              window.location.hash = compareHash()
            }}
          >
            {t('compare.menuItem')}
          </Menu.Item>

          <Menu.Divider />
          <Menu.Label>{t('compare.resultUnitLabel')}</Menu.Label>
          {VOLUME_UNITS.map((unit) => (
            <Choice
              key={unit}
              selected={unit === resultUnit}
              label={t(`volume.unit.${unit}`)}
              onClick={() => chooseResultUnit(unit)}
            />
          ))}

          <Menu.Divider />
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
          title: { fontFamily: 'Bungee, sans-serif', fontWeight: 400, fontSize: 12, textTransform: 'uppercase' },
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
          variant="pills"
          color="orange"
          radius={999}
          classNames={{ tab: 'ws-tab' }}
          styles={{ tab: { fontFamily: 'Bungee, sans-serif', fontSize: 10, textTransform: 'uppercase', padding: '7px 12px' } }}
        >
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

        {/* The same dashed rule as the volume line on the stack page: it runs
            into the label rather than across the dialog above it. */}
        <Group gap={8} wrap="nowrap" align="center" mt="md">
          <div
            aria-hidden="true"
            style={{
              flex: 1,
              height: 2,
              background:
                'repeating-linear-gradient(90deg, var(--mantine-color-default-border) 0 6px, transparent 6px 12px)',
            }}
          />
          <Text size="xs" c="dimmed">
            {t('about.version', { value: __APP_VERSION__ })}
          </Text>
        </Group>
      </Modal>
    </>
  )
}
