import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  Alert,
  Button,
  Group,
  Image,
  Stack as MantineStack,
  Paper,
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
import { BackLink } from './BackLink'
import { EntryList } from './EntryList'
import { ExplainButton } from './ExplainButton'
import { LogReadingForm } from './LogReadingForm'
import { NotifyPrompt } from './NotifyPrompt'
import { VolumeEntryForm } from './VolumeEntryForm'
import { PLUM_PANEL } from '../theme'

const CURVE_MONTHS = 30

/** The species and meta line, the same small tracked capitals as in the list:
 *  berry on cream, ochre on plum night. */
const META_LINE = 'light-dark(var(--mantine-color-grape-6), var(--mantine-color-yellow-6))'

/** The rule that fills the space to the left of a short label. Two pixels
 *  tall, drawn rather than bordered, so the dashes stay the same length
 *  whatever the label beside it is. */
const DASHED_RULE = 'repeating-linear-gradient(90deg, var(--mantine-color-default-border) 0 6px, transparent 6px 12px)'

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

  // Which chip is open, and how much room the panels below them have earned.
  // See the comment on the panel wrapper for what this is protecting against.
  const [chip, setChip] = useState<string | null>('volume')
  const panels = useRef<HTMLDivElement>(null)
  const [reserved, setReserved] = useState(0)

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
  // Layout, not paint: the height must be settled before the browser draws,
  // or the shrink happens for one frame and is seen. `stack` is a dependency
  // because logging an entry grows the history without changing the chip.
  useLayoutEffect(() => {
    const shown = panels.current?.scrollHeight ?? 0
    setReserved((tallest) => Math.max(tallest, shown))
  }, [chip, stack])

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
          <BackLink onClick={onBack} />
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
      {/* Back on the left, the one thing you can do to this stack on the
          right. Deleting moved to the list, so "Endre" is alone up here and
          does not need a line of its own. */}
      <Group justify="space-between" align="center" wrap="nowrap">
        <BackLink onClick={onBack} />
        <Button
          variant="default"
          onClick={onEdit}
          radius={999}
          className="ws-pressable"
          ff="Bungee, sans-serif"
          fz={11}
          tt="uppercase"
          style={{ borderWidth: 2 }}
        >
          {t('stackDetail.edit')}
        </Button>
      </Group>

      {/* The name in the body face for the same reason as in the list: it is
          a sentence the visitor wrote, and Bungee has no lower case. */}
      <Title order={2} ff="Outfit, sans-serif" fw={700}>
        {stack.name}
      </Title>

      <Text fz={12} fw={600} tt="uppercase" style={{ letterSpacing: '0.14em', color: META_LINE }}>
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
          {/* The answer the page exists to give, on the panel that holds what
              the app is telling you. `common.readyBetween` is drawn whole: an
              earlier draft split "Klar mellom" off as an eyebrow above the
              dates, which mangles the sentence. */}
          <Paper radius="lg" p="lg" style={{ backgroundColor: PLUM_PANEL, color: 'var(--mantine-color-white)' }}>
            {/* The mark sits beside the line, not inside it: `window-text` is
                the window and nothing else. */}
            <Group gap={8} wrap="nowrap" align="flex-start" justify="space-between">
              <Text data-testid="window-text" ff="Bungee, sans-serif" fw={400} fz={17} lh={1.25}>
                {t('common.readyBetween', { window: formatWindow(dryWindow, translator) })}
              </Text>
              <ExplainButton
                title={t('explain.readyWindow.title')}
                body={t('explain.readyWindow.body')}
                size={24}
              />
            </Group>
            {correction && (
              <Text fz={13} mt="xs" data-testid="correction-caption" style={{ opacity: 0.7 }}>
                {t(
                  correction === 'earlier'
                    ? 'stackDetail.correctedEarlier'
                    : 'stackDetail.correctedLater',
                )}
              </Text>
            )}
          </Paper>

          {/* The chart is something you read off, so it gets the other kind of
              container: a cream card with a hard shadow. */}
          <Paper withBorder radius="lg" p="md" shadow="md" style={{ borderWidth: 2 }}>
            <DryingCurveChart
              points={points}
              secondPoints={secondPoints}
              readings={stack.readings}
              threshold={DRY_ENOUGH_MOISTURE}
              window={dryWindow}
            />
          </Paper>
        </>
      )}

      {/* The rule runs into the label rather than across the page above it:
          it separates and points at the same time, which a full-width divider
          did not. */}
      <Group gap={8} wrap="nowrap" align="center">
        <div data-testid="dashed-rule" aria-hidden="true" style={{ flex: 1, height: 2, background: DASHED_RULE }} />
        {tracked ? (
          // A label and a number, which is what the display face is for.
          <Text ff="Bungee, sans-serif" fw={400} fz={13} tt="uppercase">
            {t('stackDetail.volumeCurrent', {
              volume: formatVolume(currentSolidLiters(stack.volumeEntries), translator),
            })}
          </Text>
        ) : (
          // A sentence, which it is not: Bungee has no lower case and this one
          // is read rather than scanned.
          <Text fw={600} fz={13}>
            {t('stackDetail.volumeNone')}
          </Text>
        )}
        <ExplainButton title={t('explain.volumeUnits.title')} body={t('explain.volumeUnits.body')} />
      </Group>
      {/* Two jobs on one stack — booking wood in or out, and noting a meter
          reading — and nobody does both in the same visit. Tabs put them at
          the same place instead of one below the other. Panels stay mounted,
          so a half-typed entry survives a glance at the other tab. */}
      <Tabs
        value={chip}
        onChange={setChip}
        color="orange"
        classNames={{ tab: 'ws-tab' }}
        styles={{ tab: { fontFamily: 'Bungee, sans-serif', fontSize: 10, textTransform: 'uppercase', padding: '9px 6px' } }}
      >
        {/* `grow`: the four labels are of roughly equal length, so an even
            split gives each one its own cell and its underline meets the rule
            under the row. The About dialog's three are not, and it does not
            get this. */}
        <Tabs.List grow>
          <Tabs.Tab value="volume">{t('stackDetail.tabVolume')}</Tabs.Tab>
          <Tabs.Tab value="reading">{t('stackDetail.tabReading')}</Tabs.Tab>
          <Tabs.Tab value="history">{t('stackDetail.tabHistory')}</Tabs.Tab>
          {stack.photo && <Tabs.Tab value="photo">{t('stackDetail.tabPhoto')}</Tabs.Tab>}
        </Tabs.List>

        {/* The chips sit at the foot of the page, so the visitor is scrolled
            to the bottom when they use them — and the four panels are not the
            same height. Switching to a shorter one made the page shorter than
            the scroll position, the browser clamped it, and everything slid up
            under the finger that had just tapped.
            
            So the panel area keeps the tallest height it has shown and never
            goes below it. Not a fixed number: the history grows with every
            entry up to its own 260, and the photo's height is the photo's.
            Growing is harmless — it is the shrinking that moves the page. */}
        <div data-testid="tab-panels" ref={panels} style={{ minHeight: reserved || undefined }}>
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
        </div>
      </Tabs>
    </MantineStack>
  )
}
