import { useMemo, useState } from 'react'
import {
  Autocomplete,
  Alert,
  Button,
  Group,
  NativeSelect,
  Stack as MantineStack,
  Text,
  TextInput,
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
import { StorageQuotaError, getStack, updateStack } from '../storage/stacksRepo'
import { geocode, type GeocodeResult } from '../climate/openMeteo'
import { getNormals } from '../climate/normalsCache'
import { labelledMatches, placeLabel } from '../climate/placeLabels'
import { useTranslation } from '../i18n/useTranslation'
import { FieldRow } from './FieldRow'
import { PhotoField, PhotoPreview } from './PhotoField'

/** A place the stack can stand: either the one it already stands in, or one
 *  the visitor picked out of the search. */
type Place = StackLocation & { country?: string }

type Props = {
  stackId: string
  onSave: () => void
  onCancel: () => void
  geocodeFn?: (query: string) => Promise<GeocodeResult[]>
  getNormalsFn?: (latitude: number, longitude: number) => Promise<ClimateNormals>
  resizeFn?: (file: File) => Promise<string>
}

/** The six fields a stack can be changed on, on a screen of its own — the
 *  same swap `AddStackForm` already uses, rather than an edit mode inside
 *  `StackDetail`. Species and stacked date are not here: every reading was
 *  measured against the curve those two fix. */
export function EditStackForm({
  stackId,
  onSave,
  onCancel,
  geocodeFn,
  getNormalsFn = getNormals,
  resizeFn,
}: Props) {
  const { t, language } = useTranslation()
  const lookUpPlace = geocodeFn ?? ((name: string) => geocode(name, {}, language))
  // Read once. Saving swaps this screen out for a fresh `StackDetail`, and
  // that one reads storage again on the way in.
  const stack = useMemo(() => getStack(stackId), [stackId])

  const [name, setName] = useState(stack?.name ?? '')
  const [splitSize, setSplitSize] = useState<SplitSize>(stack?.splitSize ?? 'medium')
  const [cover, setCover] = useState<Cover>(stack?.cover ?? 'roof')
  const [exposure, setExposure] = useState<Exposure>(stack?.exposure ?? 'normal')
  const [photo, setPhoto] = useState<string | undefined>(stack?.photo)

  const [query, setQuery] = useState(stack ? placeLabel(stack.location) : '')
  /** The exact text the place was last shown as — a label may carry the
   *  region when two matches would otherwise read alike. */
  const [placeText, setPlaceText] = useState(stack ? placeLabel(stack.location) : '')
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

  const matches = labelledMatches(results ?? [])
  const showMatches = matches.length > 0
  /** In force only while the field still says what was picked — or, untouched,
   *  what the stack already had. */
  const chosenPlace = place && placeText === query ? place : null

  async function search() {
    setError(null)
    try {
      setResults(await lookUpPlace(query))
    } catch {
      setResults([])
      setError(t('stackForm.searchFailed'))
    }
  }

  async function submit() {
    setError(null)
    // A search that was started and never finished leaves no place at all;
    // saving then would throw away the location the stack already has.
    if (!chosenPlace) {
      setError(t('stackForm.pickPlace'))
      return
    }

    const moved =
      chosenPlace.latitude !== current.latitude || chosenPlace.longitude !== current.longitude
    if (moved) {
      // The whole save waits on this, and is abandoned if it fails: a stack
      // whose climate data belongs somewhere else gives a window that looks
      // right and is not.
      try {
        await getNormalsFn(chosenPlace.latitude, chosenPlace.longitude)
      } catch {
        setError(t('editStack.locationFailed'))
        return
      }
    }

    try {
      // `photo` goes along even when it is undefined: that is how a photo the
      // visitor removed comes off the stored stack.
      updateStack(stackId, {
        name: name.trim() || storedName,
        splitSize,
        cover,
        exposure,
        location: { name: chosenPlace.name, latitude: chosenPlace.latitude, longitude: chosenPlace.longitude },
        photo,
      })
    } catch (error) {
      // The write was refused whole, so the stack on disk is untouched — this
      // screen has to say so rather than close as if the edit had landed.
      if (error instanceof StorageQuotaError) {
        setError(t('common.storageFull'))
        return
      }
      throw error
    }
    onSave()
  }

  return (
    <MantineStack gap="md">
      <Text fw={600}>{t('editStack.heading')}</Text>

      {/* The same two-column layout as the new-stack form: none of these
          values needs the full width, and the two screens should not read like
          different apps. */}
      <FieldRow>
        <TextInput label={t('stackForm.name')} value={name} onChange={(event) => setName(event.currentTarget.value)} />

        <NativeSelect
          label={t('stackForm.splitSize')}
          value={splitSize}
          onChange={(event) => setSplitSize(event.currentTarget.value as SplitSize)}
          data={SPLIT_SIZES.map((value) => ({ value, label: t(`splitSize.${value}`) }))}
        />
      </FieldRow>

      {/* Where it stands. */}
      <FieldRow>
        <NativeSelect
          label={t('stackForm.cover')}
          value={cover}
          onChange={(event) => setCover(event.currentTarget.value as Cover)}
          data={COVERS.map((value) => ({ value, label: t(`cover.${value}`) }))}
        />

        <NativeSelect
          label={t('stackForm.exposure')}
          value={exposure}
          onChange={(event) => setExposure(event.currentTarget.value as Exposure)}
          data={EXPOSURES.map((value) => ({ value, label: t(`exposure.${value}`) }))}
        />
      </FieldRow>

      {/* The place and the picture. `start`: the picture's field is taller than
          the search box, and bottom-aligned that dragged the place down. */}
      <FieldRow align="start">
        <Group align="flex-end" gap="xs" wrap="nowrap">
          <Autocomplete
            label={t('stackForm.place')}
            description={t('stackForm.placeDescription')}
            value={query}
            data={matches.map((m) => m.label)}
            filter={({ options }) => options}
            openOnFocus={false}
            comboboxProps={{ transitionProps: { duration: 0 } }}
            dropdownOpened={showMatches}
            onChange={(value) => {
              setQuery(value)
              setResults(null)
            }}
            onOptionSubmit={(label) => {
              const picked = matches.find((m) => m.label === label)?.result
              if (!picked) return
              setPlace(picked)
              setPlaceText(label)
              setQuery(label)
              setResults(null)
              setError(null)
            }}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              // The field sits in a form-shaped page without a <form>, so Enter
              // does nothing unless it is handled.
              event.preventDefault()
              void search()
            }}
            error={results?.length === 0 ? t('stackForm.noPlaces') : undefined}
            style={{ flex: 1 }}
          />
          <Button variant="default" onClick={search}>
            {t('stackForm.search')}
          </Button>
        </Group>

        <PhotoField value={photo} onChange={setPhoto} resizeFn={resizeFn} />
      </FieldRow>

      {/* The last row of the same two-column grid the rest of the form uses:
          the buttons in the left column, the picture in the right — directly
          under the field that took it, and centred in that column. Beside the
          buttons rather than above or below them, so a picture cannot move
          them. `start` keeps them at the top of the row when the picture is
          taller than they are. */}
      <FieldRow align="start">
        {/* The message belongs to the buttons, so it sits under them inside
            their own column. Above the row it pushed the picture down with it;
            here the picture's column does not know it exists. */}
        <MantineStack gap="xs">
          <Group gap="md" wrap="nowrap">
            <Button onClick={submit}>{t('stackForm.save')}</Button>
            <Button variant="subtle" onClick={onCancel}>
              {t('stackForm.cancel')}
            </Button>
          </Group>

          {error && <Alert color="red">{error}</Alert>}
        </MantineStack>

        <PhotoPreview value={photo} onChange={setPhoto} />
      </FieldRow>
    </MantineStack>
  )
}

/** Name and country, the same two parts `AddStackForm` shows — the admin
 *  region in between comes back half in English whatever language is asked
 *  for. A stack's own stored location has no country at all, and reads as
 *  just the name. */
