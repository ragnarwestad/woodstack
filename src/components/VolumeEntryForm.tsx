import { useState } from 'react'
import { Alert, Button, Group, NativeSelect, Stack as MantineStack, Text, TextInput } from '@mantine/core'
import { VOLUME_ENTRY_KINDS, VOLUME_UNITS, type VolumeEntryKind, type VolumeUnit } from '../storage/schema'
import { useTranslation } from '../i18n/useTranslation'

/** Wood goes in and wood goes out, and both are the same four fields: what you
 *  did, how much, in which unit, and when. Kept as short as the reading form
 *  next to it, for the same reason — an entry nobody bothers to make is worth
 *  nothing. */

type Props = {
  onLog: (entry: { date: string; kind: VolumeEntryKind; amount: number; unit: VolumeUnit }) => void
}

export function VolumeEntryForm({ onLog }: Props) {
  const { t } = useTranslation()
  const [kind, setKind] = useState<VolumeEntryKind>('addition')
  const [amount, setAmount] = useState('')
  const [unit, setUnit] = useState<VolumeUnit>('favn')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [error, setError] = useState<string | null>(null)

  function submit() {
    const value = Number(amount)
    if (amount.trim() === '' || !Number.isFinite(value) || value <= 0) {
      setError(t('volumeEntry.amountError'))
      return
    }
    setError(null)
    onLog({ date, kind, amount: value, unit })
    setAmount('')
  }

  return (
    <MantineStack gap="sm">
      <Text fw={600}>{t('volumeEntry.heading')}</Text>

      <NativeSelect
        label={t('volumeEntry.kindLabel')}
        value={kind}
        onChange={(event) => setKind(event.currentTarget.value as VolumeEntryKind)}
        data={VOLUME_ENTRY_KINDS.map((value) => ({ value, label: t(`volume.kind.${value}`) }))}
      />

      <TextInput
        type="number"
        label={t('volumeEntry.amountLabel')}
        value={amount}
        onChange={(event) => setAmount(event.currentTarget.value)}
      />

      <NativeSelect
        label={t('volumeEntry.unitLabel')}
        value={unit}
        onChange={(event) => setUnit(event.currentTarget.value as VolumeUnit)}
        data={VOLUME_UNITS.map((value) => ({ value, label: t(`volume.unit.${value}`) }))}
      />

      <TextInput
        type="date"
        label={t('volumeEntry.dateLabel')}
        value={date}
        onChange={(event) => setDate(event.currentTarget.value)}
      />

      {error && <Alert color="red">{error}</Alert>}

      <Group>
        <Button onClick={submit}>{t('volumeEntry.save')}</Button>
      </Group>
    </MantineStack>
  )
}
