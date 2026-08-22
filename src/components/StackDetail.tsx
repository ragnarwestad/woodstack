import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Divider, Group, Stack as MantineStack, Text, Title } from '@mantine/core'
import type { ClimateNormals, VolumeEntry } from '../storage/schema'
import { addReading, addVolumeEntry, getStack } from '../storage/stacksRepo'
import { getNormals } from '../climate/normalsCache'
import { estimateWindow, simulate } from '../model/simulate'
import { DRY_ENOUGH_MOISTURE, formatWindow } from '../model/units'
import { currentSolidLiters, formatVolume } from '../model/volume'
import { useTranslation } from '../i18n/useTranslation'
import { DryingCurveChart } from './DryingCurveChart'
import { LogReadingForm } from './LogReadingForm'
import { VolumeEntryForm } from './VolumeEntryForm'

const CURVE_MONTHS = 30

/** The outcome of one normals request, tagged with the request it answers.
 *  Anything older than the current request still reads as loading, so a
 *  retry cannot flash the previous answer on its way past. */
type NormalsResult = { key: string; normals: ClimateNormals | null }

type Props = {
  stackId: string
  onBack: () => void
  getNormalsFn?: (latitude: number, longitude: number) => Promise<ClimateNormals>
}

export function StackDetail({ stackId, onBack, getNormalsFn = getNormals }: Props) {
  const translator = useTranslation()
  const { t } = translator
  const [stack, setStack] = useState(() => getStack(stackId))
  const [result, setResult] = useState<NormalsResult | null>(null)
  const [attempt, setAttempt] = useState(0)

  const latitude = stack?.location.latitude
  const longitude = stack?.location.longitude
  const requestKey = `${latitude},${longitude},${attempt}`

  useEffect(() => {
    if (latitude === undefined || longitude === undefined) return

    let cancelled = false
    getNormalsFn(latitude, longitude)
      .then((normals) => {
        if (!cancelled) setResult({ key: requestKey, normals })
      })
      .catch(() => {
        if (!cancelled) setResult({ key: requestKey, normals: null })
      })

    return () => {
      cancelled = true
    }
  }, [getNormalsFn, latitude, longitude, requestKey])

  // A stack imported offline has no normals yet. Rather than leave the window
  // blank until someone thinks to reload, try again the moment there is a
  // network.
  const retry = useCallback(() => setAttempt((value) => value + 1), [])
  useEffect(() => {
    window.addEventListener('online', retry)
    return () => window.removeEventListener('online', retry)
  }, [retry])

  if (!stack) {
    return (
      <MantineStack gap="md">
        <Text>{t('stackDetail.notFound')}</Text>
        <Group>
          <Button variant="default" onClick={onBack}>
            {t('common.back')}
          </Button>
        </Group>
      </MantineStack>
    )
  }

  function log(reading: { date: string; moisture: number }) {
    const updated = addReading(stackId, reading)
    if (updated) setStack(updated)
  }

  function logVolume(entry: Omit<VolumeEntry, 'id'>) {
    const updated = addVolumeEntry(stackId, entry)
    if (updated) setStack(updated)
  }

  // A stack nobody has measured has no ledger at all, and that is not the same
  // as one that has been emptied — the text says which.
  const tracked = (stack.volumeEntries?.length ?? 0) > 0

  const normals = result?.key === requestKey ? result.normals : null
  const loading = result?.key !== requestKey
  const dryWindow = normals ? estimateWindow(stack, normals) : null
  const points = normals ? simulate(stack, normals, { months: CURVE_MONTHS }) : []

  return (
    <MantineStack gap="md">
      <Group>
        <Button variant="default" onClick={onBack}>
          {t('common.back')}
        </Button>
      </Group>

      <Title order={2}>{stack.name}</Title>
      <Text c="dimmed">
        {t('stackDetail.meta', {
          species: t(`species.${stack.species}`),
          date: stack.stackedDate,
          place: stack.location.name,
        })}
      </Text>

      {loading && <Text>{t('common.loadingClimate')}</Text>}

      {!loading && !normals && (
        <Alert color="yellow">{t('stackDetail.offline', { place: stack.location.name })}</Alert>
      )}

      {dryWindow && (
        <>
          <Text data-testid="window-text" fw={600}>
            {t('common.readyBetween', { window: formatWindow(dryWindow, translator) })}
          </Text>
          <DryingCurveChart
            points={points}
            readings={stack.readings}
            threshold={DRY_ENOUGH_MOISTURE}
            window={dryWindow}
          />
        </>
      )}

      <Divider />
      <Text fw={600}>
        {tracked
          ? t('stackDetail.volumeCurrent', {
              volume: formatVolume(currentSolidLiters(stack.volumeEntries), translator),
            })
          : t('stackDetail.volumeNone')}
      </Text>
      <VolumeEntryForm onLog={logVolume} />

      <Divider />
      <LogReadingForm onLog={log} />
    </MantineStack>
  )
}
