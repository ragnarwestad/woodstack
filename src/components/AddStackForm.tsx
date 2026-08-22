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
import { COVERS, EXPOSURES, SPLIT_SIZES, type Cover, type Exposure, type NewStack, type Species, type SplitSize } from '../storage/schema'
import { SPECIES, SPECIES_IDS } from '../model/species'
import { geocode, type GeocodeResult } from '../climate/openMeteo'

const SPLIT_LABELS: Record<SplitSize, string> = {
  small: 'Fint kløyvd',
  medium: 'Middels',
  large: 'Grovt kløyvd',
}

const COVER_LABELS: Record<Cover, string> = {
  none: 'Nei, den står åpent',
  roof: 'Ja, tak over og åpne sider',
  shed: 'Ja, i vedskjul',
}

const EXPOSURE_LABELS: Record<Exposure, string> = {
  sheltered: 'Lite sol og vind',
  normal: 'Vanlig',
  exposed: 'Mye sol og vind',
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

type Props = {
  onAdd: (stack: NewStack) => void
  onCancel: () => void
  geocodeFn?: (query: string) => Promise<GeocodeResult[]>
}

export function AddStackForm({ onAdd, onCancel, geocodeFn = (query) => geocode(query) }: Props) {
  const [name, setName] = useState('')
  const [species, setSpecies] = useState<Species>('bjork')
  const [stackedDate, setStackedDate] = useState(today)
  const [splitSize, setSplitSize] = useState<SplitSize>('medium')
  const [cover, setCover] = useState<Cover>('roof')
  const [exposure, setExposure] = useState<Exposure>('normal')

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
      setError('Stedssøket svarte ikke. Prøv igjen når du har nett.')
    }
  }

  function submit() {
    if (!place) {
      setError('Velg et sted, så vet vi hvilket klima stabelen står i.')
      return
    }
    onAdd({
      name: name.trim() || SPECIES[species].label,
      species,
      stackedDate,
      splitSize,
      cover,
      exposure,
      location: { name: place.name, latitude: place.latitude, longitude: place.longitude },
    })
  }

  return (
    <MantineStack gap="md">
      <Text fw={600}>Ny vedstabel</Text>

      <TextInput label="Navn på stabelen" value={name} onChange={(event) => setName(event.currentTarget.value)} />

      <NativeSelect
        label="Treslag"
        value={species}
        onChange={(event) => setSpecies(event.currentTarget.value as Species)}
        data={SPECIES_IDS.map((id) => ({ value: id, label: SPECIES[id].label }))}
      />

      <TextInput
        type="date"
        label="Stablet dato"
        value={stackedDate}
        onChange={(event) => setStackedDate(event.currentTarget.value)}
      />

      <NativeSelect
        label="Hvor grovt er den kløyvd?"
        value={splitSize}
        onChange={(event) => setSplitSize(event.currentTarget.value as SplitSize)}
        data={SPLIT_SIZES.map((value) => ({ value, label: SPLIT_LABELS[value] }))}
      />

      <NativeSelect
        label="Står den under tak?"
        value={cover}
        onChange={(event) => setCover(event.currentTarget.value as Cover)}
        data={COVERS.map((value) => ({ value, label: COVER_LABELS[value] }))}
      />

      <NativeSelect
        label="Sol og vind der den står"
        value={exposure}
        onChange={(event) => setExposure(event.currentTarget.value as Exposure)}
        data={EXPOSURES.map((value) => ({ value, label: EXPOSURE_LABELS[value] }))}
      />

      <Group align="flex-end" gap="xs">
        <TextInput
          label="Sted"
          description="Brukes bare til å hente klimanormaler – én gang, og så aldri mer."
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          style={{ flex: 1 }}
        />
        <Button variant="default" onClick={search}>
          Søk
        </Button>
      </Group>

      {place ? (
        <Text size="sm">Valgt sted: {placeLabel(place)}</Text>
      ) : (
        results?.length === 0 && <Text size="sm">Fant ingen steder som heter det.</Text>
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
        <Button onClick={submit}>Lagre</Button>
        <Button variant="subtle" onClick={onCancel}>
          Avbryt
        </Button>
      </Group>
    </MantineStack>
  )
}

function placeLabel(result: GeocodeResult): string {
  return [result.name, result.admin1, result.country].filter(Boolean).join(', ')
}
