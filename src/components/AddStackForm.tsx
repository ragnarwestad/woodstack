import { useState } from 'react'
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
import { geocode, type GeocodeResult } from '../climate/openMeteo'
import { useTranslation } from '../i18n/useTranslation'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

type Props = {
  onAdd: (stack: NewStack) => void
  onCancel: () => void
  geocodeFn?: (query: string) => Promise<GeocodeResult[]>
}

export function AddStackForm({ onAdd, onCancel, geocodeFn }: Props) {
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

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeocodeResult[] | null>(null)
  const [place, setPlace] = useState<GeocodeResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function search() {
    setError(null)
    setPlace(null)
    try {
      setResults(await lookUpPlace(query))
    } catch {
      setResults([])
      setError(t('addStack.searchFailed'))
    }
  }

  function submit() {
    if (!place) {
      setError(t('addStack.pickPlace'))
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

    onAdd({
      name: name.trim() || t(`species.${species}`),
      species,
      ...(secondSpecies ? { secondSpecies } : {}),
      stackedDate,
      splitSize,
      cover,
      exposure,
      location: { name: place.name, latitude: place.latitude, longitude: place.longitude },
      ...(initialVolume ? { initialVolume } : {}),
    })
  }

  return (
    <MantineStack gap="md">
      <Text fw={600}>{t('addStack.heading')}</Text>

      <TextInput label={t('addStack.name')} value={name} onChange={(event) => setName(event.currentTarget.value)} />

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
        label={t('addStack.secondSpecies')}
        value={secondSpeciesId}
        onChange={(event) => setSecondSpeciesId(event.currentTarget.value as Species | '')}
        data={[
          { value: '', label: t('addStack.secondSpeciesNone') },
          ...SPECIES_IDS.filter((id) => id !== species).map((id) => ({ value: id, label: t(`species.${id}`) })),
        ]}
      />

      {secondSpeciesId && (
        <NativeSelect
          label={t('addStack.secondSpeciesShare')}
          value={secondShare}
          onChange={(event) => setSecondShare(event.currentTarget.value as SpeciesShare)}
          data={SPECIES_SHARES.map((value) => ({ value, label: t(`species.share.${value}`) }))}
        />
      )}

      <TextInput
        type="date"
        label={t('addStack.stackedDate')}
        value={stackedDate}
        onChange={(event) => setStackedDate(event.currentTarget.value)}
      />

      <NativeSelect
        label={t('addStack.splitSize')}
        value={splitSize}
        onChange={(event) => setSplitSize(event.currentTarget.value as SplitSize)}
        data={SPLIT_SIZES.map((value) => ({ value, label: t(`splitSize.${value}`) }))}
      />

      <NativeSelect
        label={t('addStack.cover')}
        value={cover}
        onChange={(event) => setCover(event.currentTarget.value as Cover)}
        data={COVERS.map((value) => ({ value, label: t(`cover.${value}`) }))}
      />

      <NativeSelect
        label={t('addStack.exposure')}
        value={exposure}
        onChange={(event) => setExposure(event.currentTarget.value as Exposure)}
        data={EXPOSURES.map((value) => ({ value, label: t(`exposure.${value}`) }))}
      />

      <TextInput
        type="number"
        label={t('addStack.volumeAmount', { unit: t(`volume.unitShort.${volumeUnit}`) })}
        description={t('addStack.volumeAmountDescription')}
        value={volumeAmount}
        onChange={(event) => setVolumeAmount(event.currentTarget.value)}
      />

      <NativeSelect
        label={t('addStack.volumeUnit')}
        value={volumeUnit}
        onChange={(event) => setVolumeUnit(event.currentTarget.value as VolumeUnit)}
        data={VOLUME_UNITS.map((value) => ({ value, label: t(`volume.unit.${value}`) }))}
      />

      <Group align="flex-end" gap="xs">
        <TextInput
          label={t('addStack.place')}
          description={t('addStack.placeDescription')}
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          style={{ flex: 1 }}
        />
        <Button variant="default" onClick={search}>
          {t('addStack.search')}
        </Button>
      </Group>

      {place ? (
        <Text size="sm">{t('addStack.chosenPlace', { place: placeLabel(place) })}</Text>
      ) : (
        results?.length === 0 && <Text size="sm">{t('addStack.noPlaces')}</Text>
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
        <Button onClick={submit}>{t('addStack.save')}</Button>
        <Button variant="subtle" onClick={onCancel}>
          {t('addStack.cancel')}
        </Button>
      </Group>
    </MantineStack>
  )
}

/** Name and country, not the region in between. Open-Meteo has no Norwegian
 *  name for every admin region and falls back to English per field, so
 *  "Oslo, Oslo County, Norge" was half one language and half the other. The
 *  region is what a Norwegian would drop anyway. */
function placeLabel(result: GeocodeResult): string {
  return [result.name, result.country].filter(Boolean).join(', ')
}
