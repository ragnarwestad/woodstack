import { Group, Image, SegmentedControl, Stack, Text, Title, useMantineColorScheme } from '@mantine/core'
import type { MantineColorScheme } from '@mantine/core'
// The header mark, not the app icon: the icon carries an opaque background
// because a home-screen tile needs one, and on the page that reads as a dark
// square beside the title in the light theme.
import logo from '../assets/logo.svg'
import type { Language } from '../i18n/language'
import { useLanguageChoice, useTranslation } from '../i18n/useTranslation'
import { AboutMenu } from './AboutMenu'

/** Each language names itself. A visitor who landed on the wrong one cannot
 *  read the language they are trying to leave, so translating these two labels
 *  would be the one place translation makes the app harder to use. */
const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'nb', label: 'Norsk' },
  { value: 'en', label: 'English' },
]

export function AppHeader() {
  const { t } = useTranslation()
  const { language, setLanguage } = useLanguageChoice()
  // Mantine keeps the choice itself, in its own storage key, and resolves
  // `auto` against the device. Nothing here has to remember anything.
  const { colorScheme, setColorScheme } = useMantineColorScheme()

  const SCHEMES: { value: MantineColorScheme; label: string }[] = [
    { value: 'light', label: t('app.themeLight') },
    { value: 'dark', label: t('app.themeDark') },
    { value: 'auto', label: t('app.themeAuto') },
  ]

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

      <Group gap="xs" wrap="wrap">
        <SegmentedControl
          size="xs"
          value={colorScheme}
          onChange={(value) => setColorScheme(value as MantineColorScheme)}
          data={SCHEMES}
          aria-label={t('app.theme')}
        />

        <SegmentedControl
          size="xs"
          value={language}
          onChange={(value) => setLanguage(value as Language)}
          data={LANGUAGES}
          aria-label={t('app.language')}
        />

        <AboutMenu />
      </Group>
    </Group>
  )
}
