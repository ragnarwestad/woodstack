import { useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Group,
  NativeSelect,
  Paper,
  Stack as MantineStack,
  Text,
  TextInput,
  UnstyledButton,
} from '@mantine/core'
import {
  COVERS,
  EXPOSURES,
  SPLIT_SIZES,
  type ClimateNormals,
  type Cover,
  type Exposure,
  type SplitSize,
  type StackLocation,
} from '../storage/schema'
import { getStack, updateStack } from '../storage/stacksRepo'
import { geocode, type GeocodeResult } from '../climate/openMeteo'
import { getNormals } from '../climate/normalsCache'
import { useTranslation } from '../i18n/useTranslation'

/** A place the stack can stand: either the one it already stands in, or one
 *  the visitor picked out of the search. */
type Place = StackLocation & { country?: string }

type Props = {
  stackId: string
  onSave: () => void
  onCancel: () => void
  geocodeFn?: (query: string) => Promise<GeocodeResult[]>
  getNormalsFn?: (latitude: number, longitude: number) => Promise<ClimateNormals>
}

/** The five fields a stack can be changed on, on a screen of its own — the
 *  same swap `AddStackForm` already uses, rather than an edit mode inside
 *  `StackDetail`. Species and stacked date are not here: every reading was
 *  measured against the curve those two fix. */
export function EditStackForm({ stackId, onSave, onCancel, geocodeFn, getNormalsFn = getNormals }: Props) {
  const { t, language } = useTranslation()
  const lookUpPlace = geocodeFn ?? ((name: string) => geocode(name, {}, language))
  // Read once. Saving swaps this screen out for a fresh `StackDetail`, and
  // that one reads storage again on the way in.
  const stack = useMemo(() => getStack(stackId), [stackId])

  const [name, setName] = useState(stack?.name ?? '')
  const [splitSize, setSplitSize] = useState<SplitSize>(stack?.splitSize ?? 'medium')
  const [cover, setCover] = useState<Cover>(stack?.cover ?? 'roof')
  const [exposure, setExposure] = useState<Exposure>(stack?.exposure ?? 'normal')

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeocodeResult[] | null>(null)
  // Seeded with where the stack stands, so the screen opens on the current
  // place rather than on an empty search.
  const [place, setPlace] = useState<Place | null>(stack?.location ?? null)
  const [error, setError] = useState<string | null>(null)

  if (!stack) {
    return (
      <MantineStack gap="md">
        <Text>{t('stackDetail.notFound')}</Text>
        <Group>
          <Button variant="default" onClick={onCancel}>
            {t('common.back')}
          </Button>
        </Group>
      </MantineStack>
    )
  }

  // Pulled out of `stack` here so the callbacks below close over plain
  // values rather than the possibly-missing stack itself.
  const { name: storedName, location: current } = stack

  async function search() {
    setError(null)
    setPlace(null)
    try {
      setResults(await lookUpPlace(query))
    } catch {
      setResults([])
      setError(t('editStack.searchFailed'))
    }
  }

  async function submit() {
    setError(null)
    // A search that was started and never finished leaves no place at all;
    // saving then would throw away the location the stack already has.
    if (!place) {
      setError(t('editStack.pickPlace'))
      return
    }

    const moved = place.latitude !== current.latitude || place.longitude !== current.longitude
    if (moved) {
      // The whole save waits on this, and is abandoned if it fails: a stack
      // whose climate data belongs somewhere else gives a window that looks
      // right and is not.
      try {
        await getNormalsFn(place.latitude, place.longitude)
      } catch {
        setError(t('editStack.locationFailed'))
        return
      }
    }

    updateStack(stackId, {
      name: name.trim() || storedName,
      splitSize,
      cover,
      exposure,
      location: { name: place.name, latitude: place.latitude, longitude: place.longitude },
    })
    onSave()
  }

  return (
    <MantineStack gap="md">
      <Text fw={600}>{t('editStack.heading')}</Text>

      <TextInput label={t('editStack.name')} value={name} onChange={(event) => setName(event.currentTarget.value)} />

      <NativeSelect
        label={t('editStack.splitSize')}
        value={splitSize}
        onChange={(event) => setSplitSize(event.currentTarget.value as SplitSize)}
        data={SPLIT_SIZES.map((value) => ({ value, label: t(`splitSize.${value}`) }))}
      />

      <NativeSelect
        label={t('editStack.cover')}
        value={cover}
        onChange={(event) => setCover(event.currentTarget.value as Cover)}
        data={COVERS.map((value) => ({ value, label: t(`cover.${value}`) }))}
      />

      <NativeSelect
        label={t('editStack.exposure')}
        value={exposure}
        onChange={(event) => setExposure(event.currentTarget.value as Exposure)}
        data={EXPOSURES.map((value) => ({ value, label: t(`exposure.${value}`) }))}
      />

      <Group align="flex-end" gap="xs">
        <TextInput
          label={t('editStack.place')}
          description={t('editStack.placeDescription')}
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          style={{ flex: 1 }}
        />
        <Button variant="default" onClick={search}>
          {t('editStack.search')}
        </Button>
      </Group>

      {place ? (
        <Text size="sm">{t('editStack.chosenPlace', { place: placeLabel(place) })}</Text>
      ) : (
        results?.length === 0 && <Text size="sm">{t('editStack.noPlaces')}</Text>
      )}

      {!place &&
        results?.map((result) => (
          <UnstyledButton
            key={`${result.latitude},${result.longitude}`}
            onClick={() => {
              setPlace(result)
              setError(null)
            }}
          >
            <Paper withBorder p="xs" radius="sm">
              <Text size="sm">{placeLabel(result)}</Text>
            </Paper>
          </UnstyledButton>
        ))}

      {error && <Alert color="red">{error}</Alert>}

      <Group>
        <Button onClick={submit}>{t('editStack.save')}</Button>
        <Button variant="subtle" onClick={onCancel}>
          {t('editStack.cancel')}
        </Button>
      </Group>
    </MantineStack>
  )
}

/** Name and country, the same two parts `AddStackForm` shows — the admin
 *  region in between comes back half in English whatever language is asked
 *  for. A stack's own stored location has no country at all, and reads as
 *  just the name. */
function placeLabel(place: Place | GeocodeResult): string {
  return [place.name, place.country].filter(Boolean).join(', ')
}
