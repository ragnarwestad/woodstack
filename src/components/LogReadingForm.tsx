import { useId, useState } from 'react'
import {
  Alert,
  Button,
  Group,
  SimpleGrid,
  Stack as MantineStack,
  TextInput,
} from '@mantine/core'
import { useTranslation } from '../i18n/useTranslation'
import { ExplainedLabel } from './ExplainButton'

/** A meter reading is worth more than any refinement of the species table,
 *  so entering one is two fields and a button. */

const MIN_MOISTURE = 5
const MAX_MOISTURE = 200

type Props = {
  onLog: (reading: { date: string; moisture: number }) => void
}

export function LogReadingForm({ onLog }: Props) {
  const { t } = useTranslation()
  const moistureId = useId()
  const [moisture, setMoisture] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [error, setError] = useState<string | null>(null)

  function submit() {
    const value = Number(moisture)
    if (!Number.isFinite(value) || value < MIN_MOISTURE || value > MAX_MOISTURE) {
      setError(t('logReading.rangeError', { min: MIN_MOISTURE, max: MAX_MOISTURE }))
      return
    }
    setError(null)
    onLog({ date, moisture: value })
    setMoisture('')
  }

  return (
    <MantineStack gap="sm">
      {/* Side by side: a percentage and a date are both short. */}
      <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm" verticalSpacing="sm">
        <div>
          <ExplainedLabel
            htmlFor={moistureId}
            label={t('logReading.moistureLabel', { basis: t('units.moistureBasis') })}
            title={t('explain.moisture.title')}
            body={t('explain.moisture.body')}
          />
          <TextInput
            id={moistureId}
            type="number"
            value={moisture}
            onChange={(event) => setMoisture(event.currentTarget.value)}
          />
        </div>

        <TextInput
          type="date"
          label={t('logReading.dateLabel')}
          value={date}
          onChange={(event) => setDate(event.currentTarget.value)}
        />
      </SimpleGrid>

      {error && <Alert color="red">{error}</Alert>}

      <Group>
        <Button onClick={submit}>{t('logReading.save')}</Button>
      </Group>
    </MantineStack>
  )
}
