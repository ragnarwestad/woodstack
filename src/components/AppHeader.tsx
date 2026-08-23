import { Group, Image, Stack, Text, Title } from '@mantine/core'
// The header mark, not the app icon: the icon carries an opaque background
// because a home-screen tile needs one, and on the page that reads as a dark
// square beside the title in the light theme.
import logo from '../assets/logo.svg'
import { useTranslation } from '../i18n/useTranslation'
import { AboutMenu } from './AboutMenu'
import { LanguageControl, ThemeControl } from './ViewControls'

export function AppHeader() {
  const { t } = useTranslation()


  return (
    // `wrap="wrap"`: the mark, the title and two switches do not fit on one
    // line on a phone, and the switches are what should drop to a line of
    // their own — not the app's name.
    <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
      <Group gap="sm" wrap="nowrap">
        <Image src={logo} alt="" h={52} w={78} />
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
