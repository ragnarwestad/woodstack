import { Group, SegmentedControl, Stack, Text, Title } from '@mantine/core'
import type { Language } from '../i18n/language'
import { useLanguageChoice, useTranslation } from '../i18n/useTranslation'

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

  return (
    <Group justify="space-between" align="flex-start" wrap="nowrap">
      <Stack gap="xs">
        <Title order={1}>Woodstack</Title>
        <Text c="dimmed">{t('app.tagline')}</Text>
      </Stack>

      <SegmentedControl
        size="xs"
        value={language}
        onChange={(value) => setLanguage(value as Language)}
        data={LANGUAGES}
        aria-label={t('app.language')}
      />
    </Group>
  )
}
