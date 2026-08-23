import { Group, Stack as MantineStack, Text } from '@mantine/core'
import type { Reading, VolumeEntry } from '../storage/schema'
import { formatMoisture } from '../model/units'
import { useTranslation } from '../i18n/useTranslation'
import { ConfirmButton } from './ConfirmButton'

/** Everything logged against one stack, readings and wood movements together
 *  in one chronological list. Two lists would make the visitor merge the dates
 *  in their head to see what happened when — and a row nobody can point at is
 *  a row nobody can delete. */

type Props = {
  readings: Reading[]
  volumeEntries: VolumeEntry[]
  onDeleteReading: (id: string) => void
  onDeleteVolumeEntry: (id: string) => void
}

type Row = (Reading & { type: 'reading' }) | (VolumeEntry & { type: 'volume' })

export function EntryList({ readings, volumeEntries, onDeleteReading, onDeleteVolumeEntry }: Props) {
  const translator = useTranslation()
  const { t } = translator

  // Readings and volume entries carry their own ids, and a reading's id could
  // in principle equal an entry's — the type is part of what makes a row.
  const rows: Row[] = [
    ...readings.map((reading): Row => ({ ...reading, type: 'reading' })),
    ...volumeEntries.map((entry): Row => ({ ...entry, type: 'volume' })),
  ].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <MantineStack gap="xs">
      {rows.length === 0 ? (
        <Text c="dimmed">{t('entryList.empty')}</Text>
      ) : (
        rows.map((row) => (
          <Group key={`${row.type}-${row.id}`} justify="space-between" wrap="nowrap" data-testid="entry-row">
            <Text size="sm">
              {row.date} –{' '}
              {row.type === 'reading'
                ? formatMoisture(row.moisture, translator)
                : t('entryList.volumeDetail', {
                    kind: t(`volume.kind.${row.kind}`),
                    amount: row.amount,
                    unit: t(`volume.unit.${row.unit}`),
                  })}
            </Text>
            <ConfirmButton
              label={t('entryList.delete')}
              confirmLabel={t('entryList.deleteConfirm')}
              cancelLabel={t('entryList.deleteCancel')}
              onConfirm={() => (row.type === 'reading' ? onDeleteReading(row.id) : onDeleteVolumeEntry(row.id))}
            />
          </Group>
        ))
      )}
    </MantineStack>
  )
}
