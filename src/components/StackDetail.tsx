import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Divider,
  Group,
  Image,
  Stack as MantineStack,
  Tabs,
  Text,
  Title,
} from '@mantine/core'
import type { ActualWeather, ClimateNormals, VolumeEntry } from '../storage/schema'
import {
  addReading,
  addVolumeEntry,
  getStack,
  removeReading,
  removeVolumeEntry,
} from '../storage/stacksRepo'
import { getNormals } from '../climate/normalsCache'
import { getActualWeather } from '../climate/actualWeatherCache'
import { estimateWindow, simulate } from '../model/simulate'
import { speciesLabel } from '../model/species'
import { DRY_ENOUGH_MOISTURE, formatWindow } from '../model/units'
import { currentSolidLiters, formatVolume } from '../model/volume'
import { useTranslation } from '../i18n/useTranslation'
import { DryingCurveChart } from './DryingCurveChart'
import { EntryList } from './EntryList'
import { LogReadingForm } from './LogReadingForm'
import { NotifyPrompt } from './NotifyPrompt'
import { VolumeEntryForm } from './VolumeEntryForm'

const CURVE_MONTHS = 30

/** The outcome of one normals request, tagged with the request it answers.
 *  Anything older than the current request still reads as loading, so a
 *  retry cannot flash the previous answer on its way past. */
type NormalsResult = { key: string; normals: ClimateNormals | null }

/** The same, for this year's weather. It is a correction, not a
 *  precondition: `null` here means the screen shows the plain normals
 *  window, never a blank one. */
type ActualResult = { key: string; actual: ActualWeather | null }

type Props = {
  stackId: string
  onBack: () => void
  onEdit: () => void
  getNormalsFn?: (latitude: number, longitude: number) => Promise<ClimateNormals>
  getActualWeatherFn?: (latitude: number, longitude: number) => Promise<ActualWeather | null>
}

export function StackDetail({
  stackId,
  onBack,
  onEdit,
  getNormalsFn = getNormals,
  getActualWeatherFn = getActualWeather,
}: Props) {
  const translator = useTranslation()
  const { t } = translator
  const [stack, setStack] = useState(() => getStack(stackId))
  const [result, setResult] = useState<NormalsResult | null>(null)
  const [actualResult, setActualResult] = useState<ActualResult | null>(null)
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

  // A second request, on its own: this year's weather is a correction on top
  // of the normals, so it must never hold up the window or take it down with
  // it when it fails.
  useEffect(() => {
    if (latitude === undefined || longitude === undefined) return

    let cancelled = false
    getActualWeatherFn(latitude, longitude)
      .then((actual) => {
        if (!cancelled) setActualResult({ key: requestKey, actual })
      })
      .catch(() => {
        if (!cancelled) setActualResult({ key: requestKey, actual: null })
      })

    return () => {
      cancelled = true
    }
  }, [getActualWeatherFn, latitude, longitude, requestKey])

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


  function deleteReading(readingId: string) {
    const updated = removeReading(stackId, readingId)
    if (updated) setStack(updated)
  }

  function deleteVolumeEntry(entryId: string) {
    const updated = removeVolumeEntry(stackId, entryId)
    if (updated) setStack(updated)
  }

  // A stack nobody has measured has no ledger at all, and that is not the same
  // as one that has been emptied — the text says which.
  const tracked = (stack.volumeEntries?.length ?? 0) > 0

  const normals = result?.key === requestKey ? result.normals : null
  const actual = (actualResult?.key === requestKey ? actualResult.actual : null) ?? undefined
  const loading = result?.key !== requestKey
  const dryWindow = normals ? estimateWindow(stack, normals, actual) : null
  const points = normals ? simulate(stack, normals, { months: CURVE_MONTHS }, actual) : []
  // The second wood gets its own curve rather than an average of the two: the
  // window below is the union of both, and one line inside it would not
  // explain why it is that wide.
  const secondPoints =
    normals && stack.secondSpecies
      ? simulate({ ...stack, species: stack.secondSpecies.species }, normals, { months: CURVE_MONTHS }, actual)
      : undefined

  // Which way the correction moved the window, or nothing at all when it did
  // not move it. A window that quietly shifts between visits, for reasons
  // never stated, costs more trust than the correction buys.
  const uncorrected = normals && actual ? estimateWindow(stack, normals) : null
  const shift =
    dryWindow && uncorrected ? dryWindow.earliest.getTime() - uncorrected.earliest.getTime() : 0
  const correction = shift === 0 ? null : shift < 0 ? 'earlier' : 'later'

  return (
    <MantineStack gap="md">
      <Group>
        <Button variant="default" onClick={onBack}>
          {t('common.back')}
        </Button>
      </Group>

      <Title order={2}>{stack.name}</Title>

      {/* Edit and delete sit up here, under the name, because that is what they
          act on — the whole stack, not one of the three jobs in the tabs below.
          Below the tabs they moved every time the visitor switched to a taller
          panel.

          A line of their own, always: sharing the title's line and wrapping
          only when the name happens to be long puts them somewhere different
          every time you look for them. */}
      <Group justify="flex-end" gap="xs" wrap="nowrap">
        <Button variant="default" onClick={onEdit}>
          {t('stackDetail.edit')}
        </Button>
      </Group>
      <Text c="dimmed">
        {t('stackDetail.meta', {
          species: speciesLabel(stack, t),
          date: stack.stackedDate,
          place: stack.location.name,
        })}
      </Text>

      {/* The moment to ask: the visitor has a stack open, so there is now
          something concrete to be told about. Not on arrival. */}
      <NotifyPrompt />

      {loading && <Text>{t('common.loadingClimate')}</Text>}

      {!loading && !normals && (
        <Alert color="yellow">{t('stackDetail.offline', { place: stack.location.name })}</Alert>
      )}

      {dryWindow && (
        <>
          <Text data-testid="window-text" fw={600}>
            {t('common.readyBetween', { window: formatWindow(dryWindow, translator) })}
          </Text>
          {correction && (
            <Text size="sm" c="dimmed" data-testid="correction-caption">
              {t(
                correction === 'earlier'
                  ? 'stackDetail.correctedEarlier'
                  : 'stackDetail.correctedLater',
              )}
            </Text>
          )}
          <DryingCurveChart
            points={points}
            secondPoints={secondPoints}
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
      {/* Two jobs on one stack — booking wood in or out, and noting a meter
          reading — and nobody does both in the same visit. Tabs put them at
          the same place instead of one below the other. Panels stay mounted,
          so a half-typed entry survives a glance at the other tab. */}
      <Tabs defaultValue="volume">
        <Tabs.List>
          <Tabs.Tab value="volume">{t('stackDetail.tabVolume')}</Tabs.Tab>
          <Tabs.Tab value="reading">{t('stackDetail.tabReading')}</Tabs.Tab>
          <Tabs.Tab value="history">{t('stackDetail.tabHistory')}</Tabs.Tab>
          {stack.photo && <Tabs.Tab value="photo">{t('stackDetail.tabPhoto')}</Tabs.Tab>}
        </Tabs.List>

        <Tabs.Panel value="volume" pt="md">
          <VolumeEntryForm onLog={logVolume} />
        </Tabs.Panel>

        <Tabs.Panel value="reading" pt="md">
          <LogReadingForm onLog={log} />
        </Tabs.Panel>
        {/* The history is a tab of its own, and it scrolls inside its panel.
            A list that grows with every entry would otherwise push everything
            below it — the delete button included — further down the page each
            time the visitor logs something. */}
        <Tabs.Panel value="history" pt="md">
          <MantineStack mah={260} style={{ overflowY: 'auto' }} gap="xs">
            <EntryList
              readings={stack.readings}
              volumeEntries={stack.volumeEntries ?? []}
              onDeleteReading={deleteReading}
              onDeleteVolumeEntry={deleteVolumeEntry}
            />
          </MantineStack>
        </Tabs.Panel>

        {/* A tab rather than a band across the top of the page. The picture
            answers "which pile is this", which the name and the species line
            already answer — the drying window is what the page is FOR, and a
            photo above it pushed the graph off the first screen. */}
        {stack.photo && (
          <Tabs.Panel value="photo" pt="md">
            <MantineStack align="center">
              <Image src={stack.photo} alt={t('photo.alt')} radius="md" maw={320} />
            </MantineStack>
          </Tabs.Panel>
        )}
      </Tabs>
    </MantineStack>
  )
}
