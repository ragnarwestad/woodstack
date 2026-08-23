import { Stack, Text, Title } from '@mantine/core'
import { useTranslation } from '../i18n/useTranslation'
import { BackLink } from './BackLink'

/** Two lots of firewood side by side: what each costs per kWh, what each
 *  weighs dry, and which of them is the better buy. The one screen in the app
 *  that belongs to no stack — it answers a question about wood someone else is
 *  selling, and stores nothing.
 *
 *  A placeholder for now, deliberately. The figures it exists to show all come
 *  out of the price engine spec 18 builds — densities, energy per kilo, the
 *  moisture bands, the volume conversions a favn of birch and a loose cubic
 *  metre of spruce need — and none of that exists yet. Inventing it here would
 *  mean two sets of numbers to reconcile the moment spec 18 lands, so the
 *  screen says what is missing instead of guessing at it.
 *
 *  What is already in place around it: the `#compare` hash routes here, the
 *  three-dot menu leads here, `storage/resultUnitPreference.ts` holds the unit
 *  the amounts will be restated in, and `model/lotComparison.ts` works out
 *  which lot wins once there are two kWh prices to hand it. */
export function ComparePage({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation()

  return (
    <Stack gap="md">
      <BackLink onClick={onBack} />
      <Title order={2}>{t('compare.title')}</Title>
      <Text c="dimmed">{t('compare.pending')}</Text>
    </Stack>
  )
}
