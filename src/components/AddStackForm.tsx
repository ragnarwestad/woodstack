import { useId, useState } from 'react'
import {
  Autocomplete,
  Alert,
  Button,
  Group,
  NativeSelect,
  Stack as MantineStack,
  TextInput,
} from '@mantine/core'
import {
  COVERS,
  EXPOSURES,
  SPECIES_SHARES,
  SPLIT_SIZES,
  VOLUME_UNITS,
  type Cover,
  type Exposure,
  type NewStack,
  type Species,
  type SpeciesShare,
  type SplitSize,
  type VolumeUnit,
} from '../storage/schema'
import { SPECIES_IDS } from '../model/species'
import { StorageQuotaError } from '../storage/stacksRepo'
import { geocode, type GeocodeResult } from '../climate/openMeteo'
import { labelledMatches } from '../climate/placeLabels'
import { useTranslation } from '../i18n/useTranslation'
import { ExplainedLabel } from './ExplainButton'
import { FieldRow } from './FieldRow'
import { PhotoField, PhotoPreview } from './PhotoField'
import { SubpageHeader } from './SubpageHeader'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

type Props = {
  onAdd: (stack: NewStack) => void
  onCancel: () => void
  geocodeFn?: (query: string) => Promise<GeocodeResult[]>
  resizeFn?: (file: File) => Promise<string>
}

export function AddStackForm({ onAdd, onCancel, geocodeFn, resizeFn }: Props) {
  const { t, language } = useTranslation()
  // The place search follows the app's language; a caller may still pass its
  // own for tests.
  const lookUpPlace = geocodeFn ?? ((name: string) => geocode(name, {}, language))
  const [name, setName] = useState('')
  const [species, setSpecies] = useState<Species>('bjork')
  // '' is "the pile is all one wood", which is most piles — the share picker
  // stays out of the way until there is a second wood to have a share of.
  const [secondSpeciesId, setSecondSpeciesId] = useState<Species | ''>('')
  const [secondShare, setSecondShare] = useState<SpeciesShare>('third')
  const [stackedDate, setStackedDate] = useState(today)
  const [splitSize, setSplitSize] = useState<SplitSize>('medium')
  const [cover, setCover] = useState<Cover>('roof')
  const [exposure, setExposure] = useState<Exposure>('normal')
  const [volumeAmount, setVolumeAmount] = useState('')
  const [volumeUnit, setVolumeUnit] = useState<VolumeUnit>('favn')
  const volumeUnitId = useId()
  const [photo, setPhoto] = useState<string | undefined>(undefined)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeocodeResult[] | null>(null)
  const [place, setPlace] = useState<GeocodeResult | null>(null)
  /** The exact text the chosen match was shown as. Kept because a label may
   *  carry the region when two matches would otherwise read alike, so it
   *  cannot be recomputed from the result alone. */
  const [placeText, setPlaceText] = useState('')
  const [error, setError] = useState<string | null>(null)

  /** The matches drop down over the page, so nothing below them moves. */
  const matches = labelledMatches(results ?? [])
  const showMatches = matches.length > 0

  async function search() {
    setError(null)
    setPlace(null)
    try {
      setResults(await lookUpPlace(query))
    } catch {
      setResults([])
      setError(t('stackForm.searchFailed'))
    }
  }

  /** The place counts as chosen only while the field still says what was
   *  picked. Type over it and the coordinates no longer match the words, which
   *  would save the stack somewhere the visitor never chose. */
  const chosenPlace = place && placeText === query ? place : null

  function submit() {
    // Required, and no fallback to the species name: two unnamed birch piles
    // would both be called "Bjørk", and the name is the only thing the list
    // has to tell them apart with.
    if (name.trim() === '') {
      setError(t('addStack.needName'))
      return
    }
    if (!chosenPlace) {
      setError(t('stackForm.pickPlace'))
      return
    }
    // The opening amount is optional, and an empty field is not a zero entry:
    // left blank, the stack simply starts with no ledger at all.
    const amount = Number(volumeAmount)
    const initialVolume =
      volumeAmount.trim() !== '' && Number.isFinite(amount) && amount > 0
        ? { amount, unit: volumeUnit }
        : undefined

    const secondSpecies = secondSpeciesId ? { species: secondSpeciesId, share: secondShare } : undefined

    try {
      onAdd({
        name: name.trim(),
        species,
        ...(secondSpecies ? { secondSpecies } : {}),
        stackedDate,
        splitSize,
        cover,
        exposure,
        location: { name: chosenPlace.name, latitude: chosenPlace.latitude, longitude: chosenPlace.longitude },
        ...(initialVolume ? { initialVolume } : {}),
        ...(photo ? { photo } : {}),
      })
    } catch (error) {
      // A photo is the first thing this app stores that can fill the browser.
      // The write was refused whole, so nothing was lost — but the visitor has
      // just typed a form, and it stays on screen with the reason.
      if (error instanceof StorageQuotaError) {
        setError(t('common.storageFull'))
        return
      }
      throw error
    }
  }

  return (
    <MantineStack gap="md">
      {/* The link and the title on one line rather than stacked: the link on
          its own used to leave a whole row saying only "← Tilbake", with the
          title repeating what the visitor already knows one line below it. */}
      <SubpageHeader onBack={onCancel} title={t('addStack.heading')} />

      {/* Name and date: what this pile is and when it went up. */}
      <FieldRow>
        <TextInput label={t('stackForm.name')} value={name} onChange={(event) => setName(event.currentTarget.value)} />

        <TextInput
          type="date"
          label={t('addStack.stackedDate')}
          value={stackedDate}
          onChange={(event) => setStackedDate(event.currentTarget.value)}
        />
      </FieldRow>

      {/* The wood itself. */}
      <FieldRow>
        <NativeSelect
          label={t('addStack.species')}
          value={species}
          onChange={(event) => {
            const chosen = event.currentTarget.value as Species
            setSpecies(chosen)
            // Birch mixed with birch is not a mix; picking the second wood as
            // the first one clears it rather than leaving that standing.
            if (secondSpeciesId === chosen) setSecondSpeciesId('')
          }}
          data={SPECIES_IDS.map((id) => ({ value: id, label: t(`species.${id}`) }))}
        />

        <NativeSelect
          label={t('stackForm.splitSize')}
          value={splitSize}
          onChange={(event) => setSplitSize(event.currentTarget.value as SplitSize)}
          data={SPLIT_SIZES.map((value) => ({ value, label: t(`splitSize.${value}`) }))}
        />
      </FieldRow>

      {/* The mix: what else is in the pile, and how much of it. */}
      <FieldRow>
        <NativeSelect
          label={t('addStack.secondSpecies')}
          value={secondSpeciesId}
          onChange={(event) => setSecondSpeciesId(event.currentTarget.value as Species | '')}
          data={[
            { value: '', label: t('addStack.secondSpeciesNone') },
            ...SPECIES_IDS.filter((id) => id !== species).map((id) => ({ value: id, label: t(`species.${id}`) })),
          ]}
        />

        {/* Always here, disabled until there is a second wood to have a share
            of. A field that appears and disappears moves everything under it
            and makes the form a different shape each time. */}
        <NativeSelect
          label={t('addStack.secondSpeciesShare')}
          value={secondShare}
          onChange={(event) => setSecondShare(event.currentTarget.value as SpeciesShare)}
          data={SPECIES_SHARES.map((value) => ({ value, label: t(`species.share.${value}`) }))}
          disabled={!secondSpeciesId}
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

      {/* How much, and in what. The unit names the amount's label, so it comes
          first. */}
      <FieldRow>
        <div>
          <ExplainedLabel
            htmlFor={volumeUnitId}
            label={t('addStack.volumeUnit')}
            title={t('explain.volumeUnits.title')}
            body={t('explain.volumeUnits.body')}
          />
          <NativeSelect
            id={volumeUnitId}
            value={volumeUnit}
            onChange={(event) => setVolumeUnit(event.currentTarget.value as VolumeUnit)}
            data={VOLUME_UNITS.map((value) => ({ value, label: t(`volume.unit.${value}`) }))}
          />
        </div>

        <TextInput
          type="number"
          label={t('addStack.volumeAmount', { unit: t(`volume.unitShort.${volumeUnit}`) })}
          value={volumeAmount}
          onChange={(event) => setVolumeAmount(event.currentTarget.value)}
        />
      </FieldRow>

      {/* The place and the picture. `start`: the preview grows the picture's cell
          after the fact, and bottom-aligned that dragged the place field down. */}
      <FieldRow align="start">

        {/* The typed text stays in the field and the matches drop down over the
            page — nothing below moves, and searching again is just editing the
            text and pressing Søk. `filter` returns every option untouched: the
            list already IS the answer to what was typed, so filtering it again
            against the same string would hide matches whose name differs from
            the query. */}
        <Group align="flex-end" gap="xs" wrap="nowrap">
          <Autocomplete
            label={t('stackForm.place')}
            description={t('stackForm.placeDescription')}
            value={query}
            data={matches.map((m) => m.label)}
            filter={({ options }) => options}
            openOnFocus={false}
            // No fade: the matches are the answer to a button the visitor just
            // pressed, and they should be there when the press finishes.
            comboboxProps={{ transitionProps: { duration: 0 } }}
            dropdownOpened={showMatches}
            onChange={(value) => {
              setQuery(value)
              // Clearing the matches closes the dropdown: they answered a
              // question that is no longer being asked. The chosen place is NOT
              // cleared here — Autocomplete fires this on picking an option
              // too, which would undo the pick in the same breath. Whether the
              // field still says what was picked is worked out at save time.
              setResults(null)
            }}
            onOptionSubmit={(label) => {
              const picked = matches.find((m) => m.label === label)?.result
              if (!picked) return
              setPlace(picked)
              setPlaceText(label)
              setQuery(label)
              // Clearing the matches closes the dropdown: the question has been
              // answered, and a list still hanging open over the form is in the
              // way of the next field.
              setResults(null)
              setError(null)
            }}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              // The field sits in a form-shaped page without a <form>, so Enter
              // does nothing unless it is handled. A search box that ignores it
              // reads as broken.
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
