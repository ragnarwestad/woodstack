import { useId, useState } from 'react'
import {
  Alert,
  Button,
  Group,
  NativeSelect,
  SimpleGrid,
  Stack as MantineStack,
  TextInput,
} from '@mantine/core'
import { VOLUME_ENTRY_KINDS, VOLUME_UNITS, type VolumeEntryKind, type VolumeUnit } from '../storage/schema'
import { exceedsEntryCap, fromSolidLiters, MAX_ENTRY_SOLID_LITERS } from '../model/volume'
import { useTranslation } from '../i18n/useTranslation'
import { ExplainedLabel } from './ExplainButton'

/** Wood goes in and wood goes out, and both are the same four fields: what you
 *  did, how much, in which unit, and when. Kept as short as the reading form
 *  next to it, for the same reason — an entry nobody bothers to make is worth
 *  nothing. */

type Props = {
  onLog: (entry: { date: string; kind: VolumeEntryKind; amount: number; unit: VolumeUnit }) => void
}

export function VolumeEntryForm({ onLog }: Props) {
  const { t } = useTranslation()
  const unitId = useId()
  const [kind, setKind] = useState<VolumeEntryKind>('addition')
  const [amount, setAmount] = useState('')
  const [unit, setUnit] = useState<VolumeUnit>('favn')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [error, setError] = useState<string | null>(null)

  /** The cap expressed in the unit on screen. It names the upper end of the
   *  field and of the message, so both move together when the unit changes. */
  const maxForUnit = Math.floor(fromSolidLiters(MAX_ENTRY_SOLID_LITERS, unit))

  function submit() {
    const value = Number(amount)
    // Too small and too large are the same mistake to the person typing: the
    // number is not one the field accepts. One message that states the range
    // beats two that each describe half of it.
    //
    // The upper end is checked on the CONVERTED volume, so the cap means the
    // same in sacks as in favn — and it is shown back in the unit chosen, so
    // the range is a number the visitor can compare with what they typed.
    const tooSmall = amount.trim() === '' || !Number.isFinite(value) || value <= 0
    const tooLarge = exceedsEntryCap(value, unit)
    if (tooSmall || tooLarge) {
      setError(t('volumeEntry.amountRange', { max: maxForUnit }))
      return
    }
    setError(null)
    onLog({ date, kind, amount: value, unit })
    setAmount('')
  }

  return (
    <MantineStack gap="sm">
      {/* Two by two rather than four full-width rows: none of these four
          values needs 540 px, and a form the visitor can take in at a glance
          is one they will actually fill in. One column below `xs`, where two
          would squeeze the unit labels. */}
      <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm" verticalSpacing="sm">
        <NativeSelect
          label={t('volumeEntry.kindLabel')}
          value={kind}
          onChange={(event) => setKind(event.currentTarget.value as VolumeEntryKind)}
          data={VOLUME_ENTRY_KINDS.map((value) => ({ value, label: t(`volume.kind.${value}`) }))}
        />

        <TextInput
          type="date"
          label={t('volumeEntry.dateLabel')}
          value={date}
          onChange={(event) => setDate(event.currentTarget.value)}
        />

        <div>
          <ExplainedLabel
            htmlFor={unitId}
            label={t('volumeEntry.unitLabel')}
            title={t('explain.volumeUnits.title')}
            body={t('explain.volumeUnits.body')}
          />
          <NativeSelect
            id={unitId}
            value={unit}
            onChange={(event) => setUnit(event.currentTarget.value as VolumeUnit)}
            data={VOLUME_UNITS.map((value) => ({ value, label: t(`volume.unit.${value}`) }))}
          />
        </div>

        <TextInput
          type="number"
          min={0}
          max={maxForUnit}
          label={t('volumeEntry.amountLabel', { unit: t(`volume.unitShort.${unit}`) })}
          value={amount}
          onChange={(event) => setAmount(event.currentTarget.value)}
        />

      </SimpleGrid>

      {error && <Alert color="red">{error}</Alert>}

      <Group>
        <Button onClick={submit}>{t('volumeEntry.save')}</Button>
      </Group>
    </MantineStack>
  )
}
