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
  SPLIT_SIZES,
  VOLUME_UNITS,
  type Cover,
  type Exposure,
  type NewStack,
  type Species,
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

export function AddStackForm({ onAdd, onCancel, geocodeFn = (query) => geocode(query) }: Props) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [species, setSpecies] = useState<Species>('bjork')
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
      setResults(await geocodeFn(query))
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

    onAdd({
      name: name.trim() || t(`species.${species}`),
      species,
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
        onChange={(event) => setSpecies(event.currentTarget.value as Species)}
        data={SPECIES_IDS.map((id) => ({ value: id, label: t(`species.${id}`) }))}
      />

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
        label={t('addStack.volumeAmount')}
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

function placeLabel(result: GeocodeResult): string {
  return [result.name, result.admin1, result.country].filter(Boolean).join(', ')
}
