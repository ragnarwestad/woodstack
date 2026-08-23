import { Group, Stack, Text, Title } from '@mantine/core'
// The header mark, not the app icon: the icon carries an opaque background
// because a home-screen tile needs one, and on the page that reads as a dark
// square beside the title in the light theme.
import { Logo } from './Logo'
import { useTranslation } from '../i18n/useTranslation'
import { AboutMenu } from './AboutMenu'
import { LanguageControl, ThemeControl } from './ViewControls'

export function AppHeader() {
  const { t } = useTranslation()


  return (
    // Sticky rather than a scrolling list inside a fixed frame: the page goes
    // on scrolling as it always did, the header just stays where you can see
    // it — and the stack page gets the same behaviour without being touched.
    //
    // It needs a background of its own. Without one the cards slide under it
    // and show through, because a sticky element does not carry the page's
    // paint with it. The negative margin and the padding put that background
    // out to the container's edges, so a card passing beneath is covered
    // rather than clipped down the middle.
    //
    // `wrap="wrap"`: the mark, the title and the three buttons do not fit on
    // one line on a phone, and the buttons are what should drop to a line of
    // their own — not the app's name.
    <Group
      justify="space-between"
      align="flex-start"
      wrap="wrap"
      gap="sm"
      pos="sticky"
      top={0}
      mx="calc(var(--mantine-spacing-md) * -1)"
      px="md"
      py="sm"
      style={{ zIndex: 2, backgroundColor: 'var(--mantine-color-body)' }}
    >
      <Group gap="sm" wrap="nowrap">
        <Logo h={52} w={78} />
        <Stack gap={2}>
          <Title order={1} lh={0.9}>
            Woodstack{' '}
            <Text span inherit c="yellow.6">
              &apos;26
            </Text>
          </Title>
          <Text size="xs" fw={600} tt="uppercase" c="yellow.6" style={{ letterSpacing: '0.26em' }}>
            {t('app.slogan')}
          </Text>
          <Text c="dimmed">{t('app.tagline')}</Text>
        </Stack>
      </Group>

      {/* Three buttons of the same size and shape, not two blocks of text and
          a button. Theme and language are set once and then never touched;
          they should not take a line of the header to say so. */}
      <Group gap="xs" wrap="nowrap">
        <ThemeControl />
        <LanguageControl />
        <AboutMenu />
      </Group>
    </Group>
  )
}
